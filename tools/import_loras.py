#!/usr/bin/env python3
"""Каталог LoRA под Anima (AM Preview в Stable Waifu) через открытый API CivitAI.

Бот Stable Waifu подключает LoRA прямо из промпта: <lora:ID:0.8>. Для AM Preview подходят только LoRA,
обученные под Anima (baseModel = "Anima" в CivitAI). Этот сборщик собирает их в data/loras.json.

Порядок (на своём ПК, из корня репозитория):
  python3 tools/import_loras.py --pages 2 --inspect 3   # как разобраны первые модели, ничего не пишет
  python3 tools/import_loras.py                         # пробный прогон: отчёт «добавлено / изменено / пропало»
  python3 tools/import_loras.py --apply                 # записать data/loras.json

Что попадает в каталог (решено 14.11.2026, порог «R»):
  - модель целиком не выше уровня R (nsfwLevel ≤ 7 по шкале CivitAI: 1 PG, 2 PG-13, 4 R, 8 X, 16 XXX);
  - не помечена как связанная с несовершеннолетними (minor) или реальными людьми (poi);
  - нет «взрослых» тегов (NSFW_TAGS) — даже если рядом стоит «sfw»: при сомнении не показываем;
  - у Anima-версии есть хотя бы одна безопасная картинка (nsfwLevel = 1, не minor/poi): только такие и показываются.
Картинки не копируются: сайт показывает их с CDN CivitAI в уменьшенном виде (width=450), у автора, со ссылкой.

Формат API (сверен 14.11.2026, ~6000+ LoRA под Anima): items[].modelVersions[] (новые первыми),
у версии baseModel, trainedWords, images[] с url вида https://image.civitai.com/<key>/<uuid>/original=true/<id>.jpeg.
Постранично: metadata.nextPage (курсор).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "loras.json"
API_URL = (
    "https://civitai.com/api/v1/models?types=LORA&baseModels=Anima"
    "&sort=Most%20Downloaded&limit=100"
)
USER_AGENT = "StyleArchiveImporter/1.0 (+https://stylearchive.art)"
REQUEST_DELAY = 1.0
BASE_MODEL = "Anima"

MAX_MODEL_LEVEL = 7  # порог «R»
SAFE_IMAGE_LEVEL = 1  # превью только PG
IMAGE_WIDTH = 450
MAX_IMAGES = 3
MAX_TAGS = 8
MAX_TRIGGERS = 8

NSFW_TAGS = {
    "nsfw", "hentai", "porn", "nude", "nudity", "naked", "sex", "sexual", "erotic", "ecchi", "lewd",
    "breasts", "nipples", "pussy", "penis", "anus", "puckered anus", "ass", "butt", "cum", "ahegao",
    "lingerie", "underwear", "panties", "bdsm", "fetish", "futanari", "loli", "shota", "pregnant",
    "thighs slider", "hips slider", "breast slider", "big breasts", "huge breasts",
}
NSFW_NAME = re.compile(r"\b(nsfw|hentai|porn|nude|lewd|ecchi|sex)\b", re.I)

# категория по тегам; порядок важен: технические LoRA часто помечены и как «style»
CATEGORIES = (
    ("tool", {"tool", "slider", "enhancer", "detailer", "detail", "quality", "turbo", "distill",
              "distillation", "base model", "dmd2", "lcm", "optimizer", "colorfix", "assets"}),
    ("character", {"character", "game character", "vtuber", "characters", "anime character", "oc"}),
    ("style", {"style", "styles", "artist style", "art style", "artstyle", "artist", "painterly",
               "illustration style"}),
    ("concept", {"concept", "clothing", "pose", "background", "lighting", "outfit", "costume",
                 "scenery", "effect", "effects"}),
)


# ---------------------------------------------------------------- разбор


def anima_version(model: dict) -> dict | None:
    """Самая новая публичная версия под Anima, у которой есть безопасные картинки."""
    versions = [
        v for v in model.get("modelVersions") or []
        if v.get("baseModel") == BASE_MODEL and v.get("availability", "Public") == "Public"
    ]
    for version in versions:
        if safe_images(version):
            return version
    return versions[0] if versions else None


def safe_images(version: dict) -> list[dict]:
    return [
        image for image in version.get("images") or []
        if image.get("nsfwLevel") == SAFE_IMAGE_LEVEL
        and image.get("type", "image") == "image"
        and not image.get("minor")
        and not image.get("poi")
        and image.get("url")
    ]


def resized(url: str) -> str:
    """original=true (или иной размер) -> width=450: CDN CivitAI отдаёт уменьшенную копию."""
    new, count = re.subn(r"/(original=true|width=\d+)(?=/)", f"/width={IMAGE_WIDTH}", url)
    if count:
        return new
    return re.sub(r"/orig$", f"/width={IMAGE_WIDTH}", url)


def reject_reason(model: dict) -> str | None:
    if model.get("type") != "LORA":
        return "не LoRA"
    if model.get("nsfw"):
        return "nsfw"
    if (model.get("nsfwLevel") or 0) > MAX_MODEL_LEVEL:
        return "выше R"
    if model.get("minor"):
        return "minor"
    if model.get("poi"):
        return "реальный человек"
    tags = {str(tag).strip().lower() for tag in model.get("tags") or []}
    if tags & NSFW_TAGS:
        return "взрослые теги"
    if NSFW_NAME.search(model.get("name") or ""):
        return "взрослое название"
    version = anima_version(model)
    if not version:
        return "нет версии под Anima"
    if not safe_images(version):
        return "нет безопасных превью"
    return None


def category_of(tags: list[str]) -> str:
    lowered = {tag.lower() for tag in tags}
    for name, keys in CATEGORIES:
        if lowered & keys:
            return name
    return "other"


def clean_triggers(words: list[str]) -> list[str]:
    out = []
    for word in words or []:
        text = re.sub(r"\s+", " ", str(word)).strip().strip(",").strip()
        if text and text not in out:
            out.append(text)
    return out[:MAX_TRIGGERS]


def convert(model: dict) -> dict:
    version = anima_version(model)
    images = safe_images(version)[:MAX_IMAGES]
    tags = [str(tag).strip() for tag in model.get("tags") or [] if str(tag).strip()]
    stats = model.get("stats") or {}
    return {
        "id": model["id"],
        "version_id": version["id"],
        "version": version.get("name") or "",
        "name": re.sub(r"\s+", " ", model.get("name") or "").strip(),
        "category": category_of(tags),
        "tags": tags[:MAX_TAGS],
        "creator": (model.get("creator") or {}).get("username") or "",
        "downloads": stats.get("downloadCount") or 0,
        "likes": stats.get("thumbsUpCount") or 0,
        "published": (version.get("publishedAt") or "")[:10],
        "triggers": clean_triggers(version.get("trainedWords")),
        "images": [
            {
                "url": resized(image["url"]),
                "width": image.get("width") or 0,
                "height": image.get("height") or 0,
            }
            for image in images
        ],
        "url": f"https://civitai.com/models/{model['id']}?modelVersionId={version['id']}",
    }


def select(models: list[dict]) -> tuple[list[dict], dict]:
    kept, reasons, seen = [], {}, set()
    for model in models:
        if model.get("id") in seen:
            continue
        seen.add(model.get("id"))
        reason = reject_reason(model)
        if reason:
            reasons[reason] = reasons.get(reason, 0) + 1
            continue
        kept.append(convert(model))
    return kept, reasons


# ---------------------------------------------------------------- загрузка


def fetch_json(url: str, retries: int = 4) -> dict:
    last_error = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code == 429:  # просят подождать — ждём дольше
                time.sleep(30 * (attempt + 1))
                continue
            if error.code in (401, 403, 404):
                raise RuntimeError(f"HTTP {error.code}: {url}") from error
            time.sleep(5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"не удалось получить {url}: {last_error}")


def crawl(max_pages: int | None) -> list[dict]:
    url, pages, models = API_URL, 0, []
    while url and (max_pages is None or pages < max_pages):
        data = fetch_json(url)
        pages += 1
        items = data.get("items") or []
        models.extend(items)
        print(f"  страница {pages}: {len(items)} (всего {len(models)})", file=sys.stderr)
        url = (data.get("metadata") or {}).get("nextPage")
        time.sleep(REQUEST_DELAY)
    return models


# ---------------------------------------------------------------- отчёт и запись


def load_previous() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    return json.loads(DATA_FILE.read_text(encoding="utf-8")).get("loras", [])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--apply", action="store_true", help="записать data/loras.json")
    ap.add_argument("--pages", type=int, help="не больше N страниц по 100 (для проверки)")
    ap.add_argument("--inspect", type=int, metavar="N", help="показать первые N отобранных и выйти")
    ap.add_argument("--force", action="store_true", help="записать, даже если LoRA стало заметно меньше")
    args = ap.parse_args()
    if args.pages and args.apply:
        print("--pages нельзя совмещать с --apply: каталог получился бы неполным.", file=sys.stderr)
        return 2

    print("Загрузка списка LoRA под Anima…", file=sys.stderr)
    models = crawl(args.pages)
    loras, reasons = select(models)

    if args.inspect:
        for lora in loras[: args.inspect]:
            print(json.dumps(lora, ensure_ascii=False, indent=2))
        return 0

    by_category: dict[str, int] = {}
    for lora in loras:
        by_category[lora["category"]] = by_category.get(lora["category"], 0) + 1
    print(f"Получено моделей: {len(models)}, в каталог: {len(loras)}")
    print("  по категориям: " + ", ".join(f"{k} {v}" for k, v in sorted(by_category.items(), key=lambda x: -x[1])))
    print("  исключено: " + ", ".join(f"{k} {v}" for k, v in sorted(reasons.items(), key=lambda x: -x[1])))

    previous = load_previous()
    before = {lora["id"] for lora in previous}
    after = {lora["id"] for lora in loras}
    print(f"Добавлено: {len(after - before)}, пропало: {len(before - after)}")

    if not args.apply:
        print("\nПробный прогон: ничего не записано. Для записи добавьте --apply.")
        return 0
    if previous and len(loras) < len(previous) * 0.8 and not args.force:
        print(
            f"\nLoRA стало {len(loras)} вместо {len(previous)}: похоже, API ответил не полностью. "
            "Ничего не записано; при необходимости запустите с --force.",
            file=sys.stderr,
        )
        return 1

    payload = {
        "source": "https://civitai.com (open API, baseModel Anima)",
        "updated_at": dt.date.today().isoformat(),
        "count": len(loras),
        "loras": loras,
    }
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"\nЗаписано: {DATA_FILE.relative_to(ROOT)} ({len(loras)} LoRA)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
