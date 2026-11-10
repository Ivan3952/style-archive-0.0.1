#!/usr/bin/env python3
"""Импорт новых стилей из экспорта Telegram (Telegram Desktop -> Export chat history -> JSON).

Порядок ежемесячного обновления: docs/UPDATING.md. Кратко:
  python3 tools/import_telegram.py путь/к/ChatExport --inspect 20   # как разобраны первые посты, ничего не пишет
  python3 tools/import_telegram.py путь/к/ChatExport                # пробный прогон: отчёт без записи
  python3 tools/import_telegram.py путь/к/ChatExport --apply        # записать
  python3 tools/audit_data.py && python3 tests/smoke.py             # проверить

Формат источника (сверен с реальным экспортом чата «Стили» от 10.11.2026: 166 сообщений, пересланные посты):
  - Пост = подписанное сообщение + идущие за ним сообщения без текста от того же пересылавшего (альбом).
    Telegram Desktop не отдаёт media_group_id, поэтому границу альбома задаёт следующая подпись.
  - Стилевой пост содержит хештег #previewstyle (--tag меняет).
  - Художники: теги «@имя» в подписи, по одному и более. Имя может содержать пробелы и скобки;
    экранированные скобки Telegram превращаются в обычные. Хвосты «→ main» и «-> alt» отбрасываются.
  - Пресет: main/мейн/мэйн и alt/альт в подписи (в порядке появления). Нет пресета: пост не импортируется
    (решение владельца: арт перегенерируется).
  - Один пресет:   1 художник, k картинок -> одна запись с k картинками;
                   n художников, n картинок -> n записей по одной картинке.
  - Два пресета (main и alt): 2 картинки на каждого художника, подряд: «main, alt» в порядке подписи.
  - Другое соотношение: пост не импортируется, попадает в «Сомнительные».
  - Стиль с таким названием уже есть: картинки добавляются к старой записи, пресеты объединяются,
    ставится updated_at (решение владельца).
  - Дата записи = дата сообщения в чате (когда стиль попал в коллекцию), а не дата исходной публикации.
  - Идентификаторы записей: <префикс><номер сообщения> (префикс по умолчанию «g»), для нескольких
    художников в посте «g1385-1» … «g1385-6». Старые числовые id (номера сообщений канала) не затрагиваются.
  - Повторный запуск безопасен: data/import_state.json хранит для каждого чата обработанные посты.

Только архив AM. Нужно: pip install pillow
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
ARTIST_RE = re.compile(r"@[^@#,;\n→]+")
ESCAPED_PAREN_RE = re.compile(r"\\+(?=[()])")
PRESET_WORDS = {
    "main": "main", "мейн": "main", "мэйн": "main", "майн": "main", "мэин": "main",
    "alt": "alt", "альт": "alt",
}
PRESET_RE = re.compile(r"(?<![\w@])(" + "|".join(PRESET_WORDS) + r")(?![\w])", re.IGNORECASE)
ARROW_TAIL_RE = re.compile(r"\s*(?:->|-|—|:)?\s*$")


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
    forwarded_from: str = ""


def load_messages(export: Path) -> tuple[list[dict], Path, dict]:
    """Возвращает (сообщения, папка экспорта, {"id": ..., "name": ...})."""
    result = export / "result.json" if export.is_dir() else export
    if not result.exists():
        raise SystemExit(f"Не найден result.json: {result}")
    data = json.loads(result.read_text(encoding="utf-8"))
    messages = data.get("messages")
    if not isinstance(messages, list):
        raise SystemExit("В result.json нет списка messages: это не экспорт чата Telegram Desktop (формат JSON)?")
    return messages, result.parent, {"id": str(data.get("id", "")), "name": str(data.get("name") or "")}


ALBUM_GAP_SECONDS = 5  # части одного пересланного альбома приходят с разницей в секунду-две


def as_time(value) -> float:
    try:
        return dt.datetime.fromisoformat(str(value)).timestamp()
    except ValueError:
        return 0.0


def group_posts(messages: list[dict], base: Path) -> list[Post]:
    """Склеивает сообщения альбома в пост: подпись открывает пост, безымянные сообщения дополняют его."""
    posts: list[Post] = []
    for m in messages:
        if m.get("type") != "message":
            continue
        mid = int(m["id"])
        photo = m.get("photo")
        text = flatten_text(m.get("text")).strip()
        fwd = str(m.get("forwarded_from") or m.get("from") or "")
        prev = posts[-1] if posts else None
        continues = (
            prev is not None
            and not text
            and photo
            and fwd == prev.forwarded_from
            and abs(as_time(m.get("date")) - as_time(prev.date)) <= ALBUM_GAP_SECONDS
        )
        if continues:
            prev.message_ids.append(mid)
            prev.photos.append(base / photo)
        else:
            posts.append(Post(mid, m.get("date", ""), text, [base / photo] if photo else [], [mid], fwd))
    return posts


def parse_caption(text: str) -> dict:
    text = ESCAPED_PAREN_RE.sub("", text)
    hashtags = [h.lower() for h in HASHTAG_RE.findall(text)]
    artists = []
    for raw in ARTIST_RE.findall(text):
        name = ARROW_TAIL_RE.sub("", raw.strip()).strip()
        if len(name) > 1 and name not in artists:
            artists.append(name)
    presets: list[str] = []
    rest = ARTIST_RE.sub(" ", HASHTAG_RE.sub(" ", text))
    for word in PRESET_RE.findall(rest):
        value = PRESET_WORDS[word.lower()]
        if value not in presets:
            presets.append(value)
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


def match_key(name: str) -> str:
    """Ключ поиска уже существующего стиля: как на сайте, но «_» и пробел считаются одним и тем же
    (в подписях бывает «@aya_(lezon)», а в архиве уже лежит «@aya (lezon)»: это один художник)."""
    return site_key(name).replace("_", " ")


STATE_FILE = "import_state.json"
CANON_ORDER = {"main": 0, "alt": 1}


def load_state(root: Path, chat_id: str) -> dict:
    """Состояние импорта для одного чата: baseline_message_id (всё, что не новее, пропускается)
    и processed (номера уже обработанных постов)."""
    path = root / "data" / STATE_FILE
    full = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    chat = full.setdefault("chats", {}).setdefault(chat_id or "unknown", {"baseline_message_id": 0, "processed": []})
    state = {"full": full, "chat": chat}
    return state


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


def merge_presets(old: list[str], extra: list[str]) -> list[str]:
    return sorted({*old, *extra}, key=lambda p: CANON_ORDER.get(p, 9))


def split_post(artists: list[str], photos: list, presets: list[str]):
    """Возвращает [(художник, [картинки], [пресеты])] или None, если соотношение не поддерживается."""
    n, k, p = len(artists), len(photos), len(presets)
    if p == 1:
        if n == 1:
            return [(artists[0], photos, presets)]
        if k == n:
            return [(a, [ph], presets) for a, ph in zip(artists, photos)]
    elif p == 2 and k == 2 * n:
        return [(a, photos[2 * i : 2 * i + 2], presets) for i, a in enumerate(artists)]
    return None


def make_plan(posts: list[Post], styles: list[dict], media: dict, tag: str, state: dict, chat: dict, prefix: str) -> Plan:
    plan = Plan()
    counter = next_media_number(media)
    by_name: dict[str, list[dict]] = {}
    for s in styles:
        by_name.setdefault(match_key(s["name"]), []).append(s)
    new_by_name: dict[str, dict] = {}
    now = dt.datetime.now(MSK).isoformat(timespec="seconds")
    processed = set(state["chat"]["processed"])
    baseline = state["chat"]["baseline_message_id"]

    def new_media_id() -> str:
        nonlocal counter
        mid = f"p{counter:06d}"
        counter += 1
        return mid

    for post in posts:
        plan.seen_posts += 1
        plan.max_message_id = max(plan.max_message_id, *post.message_ids)
        if post.first_id <= baseline or post.first_id in processed:
            plan.skip("уже импортировано", post)
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

        parts = split_post(artists, photos, info["presets"])
        if parts is None:
            plan.suspicious.append(
                f"сообщение {post.first_id}: художников {len(artists)}, картинок {len(photos)}, "
                f"пресеты {'/'.join(info['presets'])}: правило для такого соотношения не принято, пост пропущен"
            )
            plan.skip("сомнительное соотношение художников, картинок и пресетов", post)
            continue

        published = iso(post.date)
        for index, (name, files, presets) in enumerate(parts, 1):
            record_id = f"{prefix}{post.first_id}" if len(parts) == 1 else f"{prefix}{post.first_id}-{index}"
            media_ids = []
            for f in files:
                mid = new_media_id()
                plan.media_jobs.append((mid, f))
                media_ids.append(mid)

            key = match_key(name)
            existing = [new_by_name[key]] if key in new_by_name else by_name.get(key)
            if existing:
                target = max(existing, key=lambda s: s.get("published_at") or "")
                target["media"] = [*target["media"], *media_ids]
                target["presets"] = merge_presets(target["presets"], presets)
                target["updated_at"] = now
                plan.appended.append((f"{target['id']} {target['name']}", media_ids))
                continue

            record = {
                "id": record_id,
                "name": name,
                "copy_value": name,
                "section": "preview-am",
                "presets": presets,
                "is_mix": False,
                "media": media_ids,
                "reference_media": [],
                "published_at": published,
                "source": {"kind": "telegram", "message_id": post.first_id, "imported_at": now},
            }
            if chat.get("name"):
                record["source"]["chat"] = chat["name"]
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
        lines += [f"  {rid}: +{len(ms)}" for rid, ms in plan.appended[:60]]
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
    ap.add_argument("--id-prefix", default="g", help="префикс id новых записей (по умолчанию g)")
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

    state = load_state(root, chat["id"])
    if args.from_id is not None:
        state["chat"]["baseline_message_id"] = args.from_id
    state["chat"]["name"] = chat["name"]
    plan = make_plan(posts, styles, media, args.tag, state, chat, args.id_prefix)
    print(report(plan, args.apply))

    if args.apply and (plan.new_styles or plan.appended):
        save_images(plan, root, media)
        styles.extend(plan.new_styles)
        update_counts(archives, styles, media)
        dump(root / "data" / "styles.json", styles)
        dump(root / "data" / "media.json", media)
        dump(root / "data" / "archives.json", archives)
        state["chat"]["processed"] = sorted({*state["chat"]["processed"], *plan.done_posts})
        dump(root / "data" / STATE_FILE, state["full"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
