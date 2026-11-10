#!/usr/bin/env python3
"""Импорт новых стилей из экспорта Telegram (Telegram Desktop -> Export chat history -> JSON).

Ежемесячное обновление архива:
  1. В Telegram Desktop экспортировать канал: формат JSON, отметить Photos (размер можно не ограничивать).
     Можно экспортировать только новый период, а можно весь канал: уже импортированное пропускается.
  2. Пробный прогон (ничего не пишет, только отчёт):
       python3 tools/import_telegram.py путь/к/ChatExport --archive am
  3. Если отчёт устраивает, повторить с --apply. Скрипт добавит записи в data/styles.json и data/media.json,
     положит картинки в media/web и media/thumb и обновит счётчики в data/archives.json.
  4. python3 tools/audit_data.py  и  python3 tests/smoke.py, затем коммит.

Полезно при первом запуске на настоящем экспорте:
  python3 tools/import_telegram.py путь/к/ChatExport --inspect 20
  покажет, как разобраны первые 20 постов (текст, теги, художники, картинки), без какой-либо записи.

Правила (всё, что помечено «допущение», выведено из текущих данных и подтверждается на реальном экспорте):
  - Пост = альбом: подряд идущие сообщения с одной датой (или одним media_group_id/grouped_id), подпись берётся
    из первого сообщения, где она есть.
  - Стилевой пост содержит хештег #previewstyle (--tag меняет). Остальные посты пропускаются.
  - Художники: все теги «@имя» в подписи; имя может содержать пробелы и скобки («@zippo (3756c)»).
  - Пресет: слова main / alt в подписи (допущение), хештег #previewstyle_alt означает alt.
    Пост без пресета не импортируется (решение владельца: арт перегенерируется).
  - 1 художник, k картинок -> одна запись с k картинками, id = номер первого сообщения.
  - n художников, n картинок -> n записей «<сообщение>-1» … «<сообщение>-n» по одной картинке.
  - n художников, n+1 картинок -> первая картинка общая (reference_media), остальные по порядку (допущение:
    так устроен пост 37750 в текущих данных).
  - Иначе (картинок меньше, чем художников, и т. п.) пост НЕ импортируется и попадает в отчёт «сомнительные»:
    правило для таких постов ещё не принято.
  - Стиль с таким названием уже есть в архиве -> картинки добавляются к старой записи (решение владельца);
    если записей с таким названием несколько, берётся самая свежая. В запись пишется updated_at.
  - Повторный запуск безопасен: data/import_state.json хранит границу (всё, что не новее, уже в архиве)
    и номера уже обработанных постов. --from-id переопределяет границу.

Скрипт работает только с архивом AM: у OPUS и SKY другая схема id и источник данных.
Нужно: pip install pillow
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ARCHIVE_SECTION = {"am": "preview-am"}
WEB_MAX_SIDE = 1200  # как у существующих файлов в media/web
THUMB_WIDTH = 560
WEB_QUALITY = 85
THUMB_QUALITY = 82
MSK = dt.timezone(dt.timedelta(hours=3))

HASHTAG_RE = re.compile(r"#[\w]+", re.UNICODE)
ARTIST_RE = re.compile(r"@[^@#,;\n]+")
PRESET_RE = re.compile(r"(?<![\w@])(main|alt)(?![\w])", re.IGNORECASE)
TRAILING_MARK_RE = re.compile(r"\s+(main|alt)$", re.IGNORECASE)


# ----------------------------------------------------------------------------------------------
# разбор экспорта
# ----------------------------------------------------------------------------------------------


def flatten_text(value) -> str:
    """Поле text в экспорте бывает строкой или списком кусков (строки и объекты с полем text)."""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(part if isinstance(part, str) else str(part.get("text", "")) for part in value)
    return ""


@dataclass
class Post:
    first_id: int
    date: str
    text: str
    photos: list[Path]
    message_ids: list[int] = field(default_factory=list)


def load_messages(export: Path) -> tuple[list[dict], Path, str]:
    """Возвращает (сообщения, папка экспорта, название чата)."""
    result = export / "result.json" if export.is_dir() else export
    if not result.exists():
        raise SystemExit(f"Не найден result.json: {result}")
    data = json.loads(result.read_text(encoding="utf-8"))
    messages = data.get("messages")
    if not isinstance(messages, list):
        raise SystemExit("В result.json нет списка messages: это не экспорт чата Telegram Desktop (формат JSON)?")
    return messages, result.parent, str(data.get("name") or data.get("id") or "")


def group_posts(messages: list[dict], base: Path) -> list[Post]:
    """Склеивает сообщения альбома в один пост."""
    posts: list[Post] = []
    prev_key = None
    for m in messages:
        if m.get("type") != "message":
            prev_key = None
            continue
        mid = int(m["id"])
        group = m.get("media_group_id") or m.get("grouped_id")
        key = ("g", group) if group else ("d", m.get("date"))
        photo = m.get("photo")
        text = flatten_text(m.get("text")).strip()

        same = posts and prev_key == key and (group or (mid - posts[-1].message_ids[-1] == 1))
        if same:
            post = posts[-1]
            post.message_ids.append(mid)
            if text and not post.text:
                post.text = text
            if photo:
                post.photos.append(base / photo)
        else:
            posts.append(Post(mid, m.get("date", ""), text, [base / photo] if photo else [], [mid]))
        prev_key = key
    return posts


def parse_caption(text: str) -> dict:
    hashtags = [h.lower() for h in HASHTAG_RE.findall(text)]
    artists = []
    presets = []

    def add_preset(word: str) -> None:
        word = word.lower()
        if word not in presets:
            presets.append(word)

    for raw in ARTIST_RE.findall(text):
        raw = raw.strip()
        mark = TRAILING_MARK_RE.search(raw)
        if mark:  # «@имя main» / «@имя alt»
            add_preset(mark.group(1))
        name = TRAILING_MARK_RE.sub("", raw).strip()
        if len(name) > 1:
            artists.append(name)
    for word in PRESET_RE.findall(ARTIST_RE.sub(" ", HASHTAG_RE.sub(" ", text))):
        add_preset(word)
    if "#previewstyle_alt" in hashtags and "alt" not in presets:
        presets.append("alt")
    return {"hashtags": hashtags, "artists": artists, "presets": presets}


# ----------------------------------------------------------------------------------------------
# сопоставление с архивом
# ----------------------------------------------------------------------------------------------


def site_key(name: str) -> str:
    """Тот же ключ, что у склейки одинаковых названий на сайте (normalizeStyleName в app.js)."""
    value = unicodedata.normalize("NFKC", name or "").lower().replace("ё", "е").strip()
    return re.sub(r"\s+", " ", value)


STATE_FILE = "import_state.json"


def load_state(root: Path, styles: list[dict]) -> dict:
    """Состояние импорта: baseline_message_id (всё, что не новее, уже в архиве) и processed (номера обработанных постов).

    Первый запуск: baseline = максимальный номер сообщения среди записей архива."""
    path = root / "data" / STATE_FILE
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    ids = [int(m.group()) for s in styles if (m := re.match(r"\d+", s["id"]))]
    return {"baseline_message_id": max(ids, default=0), "processed": []}


def iso(date_str: str) -> str:
    """Дата из экспорта (местное время Telegram Desktop) -> ISO со смещением +03:00, как в данных."""
    value = dt.datetime.fromisoformat(date_str)
    if value.tzinfo is None:
        value = value.replace(tzinfo=MSK)
    return value.isoformat(timespec="seconds")


@dataclass
class Plan:
    new_styles: list[dict] = field(default_factory=list)
    appended: list[tuple[str, list[str]]] = field(default_factory=list)  # (id записи, новые media-id)
    media_jobs: list[tuple[str, Path]] = field(default_factory=list)  # (media-id, исходный файл)
    skipped: dict[str, list[int]] = field(default_factory=dict)
    suspicious: list[str] = field(default_factory=list)
    seen_posts: int = 0
    style_posts: int = 0
    max_message_id: int = 0
    done_posts: list[int] = field(default_factory=list)

    def skip(self, reason: str, post: Post) -> None:
        self.skipped.setdefault(reason, []).append(post.first_id)


def next_media_number(media: dict) -> int:
    nums = [int(k[1:]) for k in media if re.fullmatch(r"p\d+", k)]
    return max(nums, default=0) + 1


def make_plan(posts: list[Post], styles: list[dict], media: dict, tag: str, state: dict, chat: str) -> Plan:
    plan = Plan()
    counter = next_media_number(media)
    by_name: dict[str, list[dict]] = {}
    for s in styles:
        by_name.setdefault(site_key(s["name"]), []).append(s)
    new_by_name: dict[str, dict] = {}
    now = dt.datetime.now(MSK).isoformat(timespec="seconds")
    processed = set(state["processed"])

    def new_media_id() -> str:
        nonlocal counter
        mid = f"p{counter:06d}"
        counter += 1
        return mid

    for post in posts:
        plan.seen_posts += 1
        plan.max_message_id = max(plan.max_message_id, *post.message_ids)
        if post.first_id <= state["baseline_message_id"] or post.first_id in processed:
            plan.skip("уже импортировано (номер сообщения не новее последнего в архиве)", post)
            continue
        info = parse_caption(post.text)
        if f"#{tag}" not in info["hashtags"] and f"#{tag}_alt" not in info["hashtags"]:
            plan.skip(f"нет хештега #{tag}", post)
            continue
        plan.style_posts += 1
        artists, photos = info["artists"], post.photos
        if not artists:
            plan.skip("в подписи нет ни одного @художника", post)
            continue
        if not photos:
            plan.skip("в посте нет картинок (возможно, не выгружены Photos)", post)
            continue
        if not info["presets"]:
            plan.skip("нет пресета main/alt (по решению владельца такие посты не импортируются)", post)
            continue
        missing = [p for p in photos if not p.exists()]
        if missing:
            plan.skip(f"файл картинки не найден в экспорте ({missing[0].name})", post)
            continue

        n, k = len(artists), len(photos)
        reference = None
        if n == 1:
            pairs = [(artists[0], photos)]
            ids = [str(post.first_id)]
        elif k == n:
            pairs = [(a, [p]) for a, p in zip(artists, photos)]
            ids = [f"{post.first_id}-{i}" for i in range(1, n + 1)]
        elif k == n + 1:
            reference, rest = photos[0], photos[1:]
            pairs = [(a, [p]) for a, p in zip(artists, rest)]
            ids = [f"{post.first_id}-{i}" for i in range(1, n + 1)]
        else:
            plan.suspicious.append(
                f"сообщение {post.first_id}: художников {n}, картинок {k}: правило для такого соотношения не принято, пост пропущен"
            )
            plan.skip("сомнительное соотношение художников и картинок", post)
            continue

        ref_id = None
        if reference is not None:
            ref_id = new_media_id()
            plan.media_jobs.append((ref_id, reference))

        published = iso(post.date)
        for (name, files), record_id in zip(pairs, ids):
            media_ids = []
            for f in files:
                mid = new_media_id()
                plan.media_jobs.append((mid, f))
                media_ids.append(mid)

            key = site_key(name)
            existing = (new_by_name.get(key) and [new_by_name[key]]) or by_name.get(key)
            if existing:
                target = max(existing, key=lambda s: s.get("published_at") or "")
                target["media"] = [*target["media"], *media_ids]
                target["updated_at"] = now
                plan.appended.append((target["id"], media_ids))
                continue

            record = {
                "id": record_id,
                "name": name,
                "copy_value": name,
                "section": "preview-am",
                "presets": info["presets"],
                "is_mix": False,
                "media": media_ids,
                "reference_media": [ref_id] if ref_id else [],
                "published_at": published,
                "source": {"kind": "telegram", "message_id": post.first_id, "imported_at": now},
            }
            if chat:
                record["source"]["chat"] = chat
            plan.new_styles.append(record)
            new_by_name[key] = record
        plan.done_posts.append(post.first_id)
    return plan


# ----------------------------------------------------------------------------------------------
# запись
# ----------------------------------------------------------------------------------------------


def save_images(plan: Plan, root: Path, media: dict) -> None:
    from PIL import Image  # импорт здесь, чтобы --inspect работал без Pillow

    web_dir, thumb_dir = root / "media" / "web", root / "media" / "thumb"
    web_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)
    for media_id, source in plan.media_jobs:
        with Image.open(source) as im:
            im = im.convert("RGB")
            scale = min(1.0, WEB_MAX_SIDE / max(im.size))
            web = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS) if scale < 1 else im
            web.save(web_dir / f"{media_id}.webp", "WEBP", quality=WEB_QUALITY, method=6)
            tw = min(THUMB_WIDTH, web.width)
            th = max(1, round(web.height * tw / web.width))
            web.resize((tw, th), Image.LANCZOS).save(thumb_dir / f"{media_id}.webp", "WEBP", quality=THUMB_QUALITY, method=6)
            media[media_id] = {
                "src": f"/media/web/{media_id}.webp",
                "thumb": f"/media/thumb/{media_id}.webp",
                "width": web.width,
                "height": web.height,
            }


def dump(path: Path, data) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def update_counts(archives: dict, styles: list[dict], media: dict) -> None:
    am = archives["archives"]["am"]
    am["visualCount"] = len(styles)
    am["uniqueCount"] = len({site_key(s["name"] or "") or f"__record_{s['id']}" for s in styles})
    am["mediaCount"] = len(media)


def report(plan: Plan, apply: bool) -> str:
    lines = [
        f"Постов в экспорте: {plan.seen_posts}, стилевых и новых: {plan.style_posts}",
        f"Новых записей: {len(plan.new_styles)}, картинок добавлено к существующим стилям: {sum(len(m) for _, m in plan.appended)}"
        f" (в {len(plan.appended)} записей), всего картинок к загрузке: {len(plan.media_jobs)}",
    ]
    if plan.new_styles:
        lines.append("\nНовые записи:")
        lines += [f"  {s['id']:>12}  {s['name']}  {'/'.join(s['presets'])}  картинок {len(s['media'])}" for s in plan.new_styles[:40]]
        if len(plan.new_styles) > 40:
            lines.append(f"  ... и ещё {len(plan.new_styles) - 40}")
    if plan.appended:
        lines.append("\nКартинки добавлены к уже существующим стилям:")
        lines += [f"  {rid}: +{len(ms)}" for rid, ms in plan.appended[:40]]
    if plan.suspicious:
        lines.append("\nСОМНИТЕЛЬНЫЕ посты (не импортированы, нужно решение):")
        lines += [f"  {s}" for s in plan.suspicious]
    interesting = {k: v for k, v in plan.skipped.items() if not k.startswith(("уже импортировано", "нет хештега"))}
    quiet = {k: len(v) for k, v in plan.skipped.items() if k.startswith(("уже импортировано", "нет хештега"))}
    if interesting:
        lines.append("\nПропущены (причина: сообщения):")
        for reason, ids in interesting.items():
            lines.append(f"  {reason}: {', '.join(map(str, ids[:15]))}{' ...' if len(ids) > 15 else ''} (всего {len(ids)})")
    if quiet:
        lines.append("\nПропущены без шума: " + "; ".join(f"{k}: {v}" for k, v in quiet.items()))
    lines.append("\n" + ("ЗАПИСАНО." if apply else "Это пробный прогон, ничего не записано. Для записи добавьте --apply."))
    return "\n".join(lines)


def inspect(posts: list[Post], count: int, tag: str) -> None:
    for post in posts[:count]:
        info = parse_caption(post.text)
        print(f"--- сообщение {post.first_id} ({post.date}), сообщений в посте {len(post.message_ids)}, картинок {len(post.photos)}")
        print("  текст:", post.text.replace("\n", " ⏎ ")[:300] or "(пусто)")
        print("  хештеги:", info["hashtags"], "| стилевой:", f"#{tag}" in info["hashtags"] or f"#{tag}_alt" in info["hashtags"])
        print("  художники:", info["artists"], "| пресеты:", info["presets"] or "нет")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", type=Path, help="папка экспорта (с result.json) или сам result.json")
    ap.add_argument("--archive", default="am", help="только am")
    ap.add_argument("--tag", default="previewstyle", help="хештег стилевых постов без # (по умолчанию previewstyle)")
    ap.add_argument("--from-id", type=int, default=None, help="импортировать только сообщения новее этого номера")
    ap.add_argument("--apply", action="store_true", help="записать изменения (без флага: пробный прогон)")
    ap.add_argument("--inspect", type=int, metavar="N", help="показать разбор первых N постов и выйти")
    ap.add_argument("--root", type=Path, default=ROOT, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)

    if args.archive not in ARCHIVE_SECTION:
        print("Импорт поддерживается только для архива am.", file=sys.stderr)
        return 2

    messages, base, chat = load_messages(args.export)
    posts = group_posts(messages, base)
    if args.inspect:
        inspect(posts, args.inspect, args.tag)
        return 0

    root: Path = args.root
    styles = json.loads((root / "data" / "styles.json").read_text(encoding="utf-8"))
    media = json.loads((root / "data" / "media.json").read_text(encoding="utf-8"))
    archives = json.loads((root / "data" / "archives.json").read_text(encoding="utf-8"))

    state = load_state(root, styles)
    if args.from_id is not None:
        state["baseline_message_id"] = args.from_id
    plan = make_plan(posts, styles, media, args.tag, state, chat)
    print(report(plan, args.apply))

    if args.apply and (plan.new_styles or plan.appended):
        save_images(plan, root, media)
        styles.extend(plan.new_styles)
        update_counts(archives, styles, media)
        dump(root / "data" / "styles.json", styles)
        dump(root / "data" / "media.json", media)
        dump(root / "data" / "archives.json", archives)
        state["processed"] = sorted({*state["processed"], *plan.done_posts})
        dump(root / "data" / STATE_FILE, state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
