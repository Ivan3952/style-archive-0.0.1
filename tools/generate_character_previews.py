#!/usr/bin/env python3
"""Превью персонажей своей генерацией через локальный ComfyUI (Anima).

Для каждого персонажа из data/characters.json подставляет строку тегов в один и тот же («фиксированный»)
промпт, генерирует картинку с одинаковым сидом и размером и кладёт её в media/characters/<id>.webp.
Повторный запуск пропускает готовые превью, поэтому прогон можно прерывать (Ctrl+C) и продолжать.

Порядок (ComfyUI должен быть запущен):
  python3 tools/generate_character_previews.py --dry-run --limit 5     # какие промпты уйдут, ничего не генерирует
  python3 tools/generate_character_previews.py --limit 20              # пробный прогон: скорость и качество
  python3 tools/generate_character_previews.py                         # все остальные
  python3 tools/import_characters.py --apply                           # прописать превью в data/characters.json

Workflow: tools/comfy/anima_character_preview.json (экспорт ComfyUI «Export (API)»). Скрипт сам находит
KSampler, его позитивный промпт, пустой латент и узел сохранения, поэтому граф можно менять в ComfyUI
и экспортировать заново, не трогая скрипт.

Что генерируется записывается в data/character_previews.json (шаблон, сид, размер, модель, промпт каждого
персонажа): по нему видно, как сделано любое превью, и его можно повторить.

Нужно: pip install pillow
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHARACTERS = ROOT / "data" / "characters.json"
LOG_FILE = ROOT / "data" / "character_previews.json"
MEDIA_DIR = ROOT / "media" / "characters"
DEFAULT_WORKFLOW = ROOT / "tools" / "comfy" / "anima_character_preview.json"

# Одинаковый для всех персонажей промпт. {tags} — строка тегов персонажа с сайта Stable Waifu.
# Anima лучше работает с тегами вместе с обычным текстом; «safe» — мета-тег рейтинга: сайт публичный,
# а при CFG 1 (турбо-LoRA) негативный промпт почти не действует.
DEFAULT_TEMPLATE = (
    "{tags}, solo, upper body, looking at viewer, simple background, white background, safe. "
    "A clean character reference portrait, the character is fully clothed and centered."
)
DEFAULT_SEED = 20261113
DEFAULT_WIDTH = 832
DEFAULT_HEIGHT = 1216
PREVIEW_WIDTH = 512
PREVIEW_QUALITY = 84
QUEUE_DEPTH = 2  # держим в очереди ComfyUI на одну задачу больше, чтобы видеокарта не простаивала

SAMPLERS = ("KSampler", "KSamplerAdvanced")


# ---------------------------------------------------------------- workflow


def load_workflow(path: Path) -> dict:
    workflow = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(workflow, dict) or not all(
        isinstance(node, dict) and "class_type" in node for node in workflow.values()
    ):
        raise SystemExit(
            f"{path} не похож на экспорт в API-формате: нужен «Export (API)», а не обычное сохранение."
        )
    return workflow


def linked(value) -> str | None:
    return value[0] if isinstance(value, list) and len(value) == 2 and isinstance(value[0], str) else None


def find_parts(workflow: dict) -> dict:
    """Находит узлы, которые скрипт меняет: сэмплер, позитивный промпт, латент, сохранение."""
    samplers = [key for key, node in workflow.items() if node["class_type"] in SAMPLERS]
    if len(samplers) != 1:
        raise SystemExit(f"Ожидался один KSampler, найдено {len(samplers)}: {samplers}")
    sampler = samplers[0]

    positive = linked(workflow[sampler]["inputs"].get("positive"))
    seen = set()
    while positive and "text" not in workflow[positive]["inputs"] and positive not in seen:
        seen.add(positive)  # промпт может идти через промежуточный узел (например, ConditioningCombine)
        inputs = workflow[positive]["inputs"]
        positive = next((linked(v) for v in inputs.values() if linked(v)), None)
    if not positive or not isinstance(workflow[positive]["inputs"].get("text"), str):
        raise SystemExit("Не нашёл текстовый узел позитивного промпта, подключённый к KSampler.")

    latent = linked(workflow[sampler]["inputs"].get("latent_image"))
    if not latent or not {"width", "height"} <= set(workflow[latent]["inputs"]):
        raise SystemExit("Не нашёл узел пустого латента (width/height), подключённый к KSampler.")

    saves = [key for key, node in workflow.items() if node["class_type"] == "SaveImage"]
    if len(saves) != 1:
        raise SystemExit(f"Ожидался один узел SaveImage, найдено {len(saves)}.")

    models = sorted(
        str(node["inputs"][field])
        for node in workflow.values()
        for field in ("unet_name", "ckpt_name", "lora_name")
        if isinstance(node["inputs"].get(field), str)
    )
    return {"sampler": sampler, "positive": positive, "latent": latent, "save": saves[0], "models": models}


def build_job(workflow: dict, parts: dict, prompt: str, seed: int, width: int, height: int, prefix: str) -> dict:
    job = json.loads(json.dumps(workflow))
    sampler = job[parts["sampler"]]["inputs"]
    sampler["noise_seed" if "noise_seed" in sampler else "seed"] = seed
    job[parts["positive"]]["inputs"]["text"] = prompt
    job[parts["latent"]]["inputs"]["width"] = width  # вместо связи с выбором разрешения
    job[parts["latent"]]["inputs"]["height"] = height
    job[parts["save"]]["inputs"]["filename_prefix"] = prefix
    return job


# ---------------------------------------------------------------- ComfyUI API


class Comfy:
    def __init__(self, server: str) -> None:
        self.server = server.rstrip("/")
        self.client_id = uuid.uuid4().hex

    def _request(self, path: str, payload: dict | None = None) -> bytes:
        data = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(
            self.server + path, data=data, headers={"Content-Type": "application/json"} if data else {}
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()

    def check(self) -> None:
        try:
            self._request("/system_stats")
        except (urllib.error.URLError, OSError) as error:
            raise SystemExit(f"ComfyUI не отвечает на {self.server}: {error}. Запустите его и повторите.")

    def queue(self, job: dict) -> str:
        try:
            body = self._request("/prompt", {"prompt": job, "client_id": self.client_id})
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:800]
            raise SystemExit(f"ComfyUI отклонил задачу (HTTP {error.code}):\n{detail}")
        return json.loads(body)["prompt_id"]

    def result(self, prompt_id: str) -> dict | None:
        history = json.loads(self._request(f"/history/{prompt_id}"))
        return history.get(prompt_id)

    def image(self, info: dict) -> bytes:
        query = urllib.parse.urlencode(
            {"filename": info["filename"], "subfolder": info.get("subfolder", ""), "type": info.get("type", "output")}
        )
        return self._request(f"/view?{query}")

    def cancel(self, prompt_ids: list[str]) -> None:
        try:
            if prompt_ids:
                self._request("/queue", {"delete": prompt_ids})
            self._request("/interrupt", {})
        except (urllib.error.URLError, OSError):
            pass


# ---------------------------------------------------------------- превью


def save_preview(data: bytes, dst: Path) -> tuple[int, int]:
    from PIL import Image

    with Image.open(io.BytesIO(data)) as image:
        image = image.convert("RGB")
        width = min(PREVIEW_WIDTH, image.width)
        height = max(1, round(image.height * width / image.width))
        if width != image.width:
            image = image.resize((width, height), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        tmp = dst.with_suffix(".tmp")
        image.save(tmp, "WEBP", quality=PREVIEW_QUALITY, method=6)
    tmp.replace(dst)
    return width, height


def load_log() -> dict:
    if LOG_FILE.exists():
        return json.loads(LOG_FILE.read_text(encoding="utf-8"))
    return {"settings": {}, "items": {}}


def write_log(log: dict) -> None:
    tmp = LOG_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(log, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(LOG_FILE)


def pick_variant(character: dict, index: int) -> dict | None:
    variants = [v for v in character.get("variants", []) if v.get("tags")]
    if not variants:
        return None
    return variants[min(index, len(variants) - 1)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--server", default="http://127.0.0.1:8188", help="адрес ComfyUI")
    ap.add_argument("--workflow", type=Path, default=DEFAULT_WORKFLOW, help="workflow в API-формате")
    ap.add_argument("--template", default=DEFAULT_TEMPLATE, help="шаблон промпта, {tags} — теги персонажа")
    ap.add_argument("--seed", type=int, default=DEFAULT_SEED)
    ap.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    ap.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    ap.add_argument("--variant", type=int, default=0, help="какой вариант образа брать (0 — первый)")
    ap.add_argument("--limit", type=int, help="сгенерировать не больше N новых превью")
    ap.add_argument("--title", help="только персонажи этого тайтла (например «Blue Archive»)")
    ap.add_argument("--ids", help="только эти id через запятую")
    ap.add_argument("--overwrite", action="store_true", help="перегенерировать даже готовые превью")
    ap.add_argument("--dry-run", action="store_true", help="показать промпты и выйти")
    args = ap.parse_args()

    if "{tags}" not in args.template:
        raise SystemExit("В шаблоне нет {tags}: некуда подставить персонажа.")
    if not CHARACTERS.exists():
        raise SystemExit("Нет data/characters.json: сначала python3 tools/import_characters.py --apply")

    workflow = load_workflow(args.workflow)
    parts = find_parts(workflow)
    characters = json.loads(CHARACTERS.read_text(encoding="utf-8"))["characters"]

    if args.title:
        characters = [c for c in characters if (c.get("title") or "").casefold() == args.title.casefold()]
    if args.ids:
        wanted = {item.strip() for item in args.ids.split(",")}
        characters = [c for c in characters if c["id"] in wanted]

    todo = []
    for character in characters:
        variant = pick_variant(character, args.variant)
        if not variant:
            continue
        if (MEDIA_DIR / f"{character['id']}.webp").exists() and not args.overwrite:
            continue
        todo.append((character, args.template.replace("{tags}", variant["tags"])))
    if args.limit:
        todo = todo[: args.limit]

    print(
        f"Workflow: {args.workflow.name} (модели: {', '.join(parts['models']) or '?'}); "
        f"{args.width}×{args.height}, сид {args.seed}"
    )
    print(f"К генерации: {len(todo)} из {len(characters)} персонажей")
    if args.dry_run:
        for character, prompt in todo[:20]:
            print(f"\n[{character['id']}] {character['name']}\n  {prompt}")
        return 0
    if not todo:
        return 0

    comfy = Comfy(args.server)
    comfy.check()

    log = load_log()
    log["settings"] = {
        "template": args.template,
        "seed": args.seed,
        "width": args.width,
        "height": args.height,
        "variant": args.variant,
        "models": parts["models"],
        "workflow_sha1": hashlib.sha1(args.workflow.read_bytes()).hexdigest()[:12],
    }

    pending: deque = deque()  # (prompt_id, character, prompt, queued_at)
    waiting = deque(todo)
    done = failed = 0
    started = time.time()

    def submit() -> None:
        character, prompt = waiting.popleft()
        job = build_job(
            workflow, parts, prompt, args.seed, args.width, args.height, f"style_archive/characters/{character['id']}"
        )
        pending.append((comfy.queue(job), character, prompt, time.time()))

    try:
        while waiting or pending:
            while waiting and len(pending) < QUEUE_DEPTH:
                submit()

            prompt_id, character, prompt, queued_at = pending[0]
            entry = comfy.result(prompt_id)
            if entry is None:
                time.sleep(0.4)
                continue
            pending.popleft()

            images = [img for out in entry.get("outputs", {}).values() for img in out.get("images", [])]
            status = entry.get("status", {}).get("status_str")
            if not images:
                failed += 1
                print(f"  ✗ {character['name']}: ComfyUI не вернул картинку ({status})", file=sys.stderr)
                continue

            width, height = save_preview(comfy.image(images[0]), MEDIA_DIR / f"{character['id']}.webp")
            done += 1
            log["items"][character["id"]] = {
                "prompt": prompt,
                "width": width,
                "height": height,
                "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
            }
            write_log(log)

            elapsed = time.time() - started
            per_image = elapsed / done
            left = len(waiting) + len(pending)
            print(
                f"  ✓ {done}/{len(todo)} {character['name']} — {per_image:.1f} с/шт, "
                f"осталось ~{left * per_image / 60:.0f} мин"
            )
    except KeyboardInterrupt:
        comfy.cancel([prompt_id for prompt_id, *_ in pending])
        print(f"\nОстановлено. Готово: {done}. Запустите ту же команду, чтобы продолжить.")
        return 130

    print(f"\nГотово: {done}, ошибок: {failed}. Дальше: python3 tools/import_characters.py --apply")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
