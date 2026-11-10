#!/usr/bin/env python3
"""Импорт «мешанин» (миксов стилей) из экспорта Telegram в data/mixes.json.

  python3 tools/import_mixes.py путь/к/ChatExport            # пробный прогон: отчёт, ничего не пишет
  python3 tools/import_mixes.py путь/к/ChatExport --apply    # записать data/mixes.json и картинки

Два вида постов (сверены с реальными экспортами от 10.11.2026):
  - «mixing»: подпись с хештегом вида #автор_mixing; строки с @художниками и есть микс, приветствие и
    хештег не сохраняются; к посту идут 4-8 превью (сообщения без текста следом).
  - «generation»: одиночная генерация из блога (#ampreview ...): миксом считаются токены с @ из текста,
    остальной промпт (персонаж, сцена, обрезан на «...») не сохраняется, теги не разбираются.
    Идентификатор пользователя бота (#s123...) не сохраняется.

Разбор строки микса: теги на верхнем уровне через запятую, учитываются скобки и «@[a|b|c]».
  @name, (@name:1.4), ((@name)) -> художник (вес, если указан); @[a|(b:1.2)|c] -> группа чередования
  (у художников поле group одинаковое); остальное -> теги с весами. prompt_raw хранится дословно.
Связь со стилем архива (style_id) ищется по названию так же, как склейка названий на сайте.
Только дописывает в data/mixes.json, записи старых запусков не трогает. Повторный запуск безопасен.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

from import_telegram import (
    MSK, STATE_FILE, Post, dump, group_posts, iso, load_messages, load_state, next_media_number,
    save_images, site_key,
)

ROOT = Path(__file__).resolve().parent.parent
MIXING_TAG_RE = re.compile(r"#(\w*_mixing)\b", re.IGNORECASE)
GENERATION_TAG = "#ampreview"
WEIGHTED_RE = re.compile(r"^\(+\s*(.+?)\s*(?::\s*(-?\d+(?:\.\d+)?))?\s*\)+$", re.S)
UNESCAPE_RE = re.compile(r"\\+(?=[()\[\]])")


def split_top(text: str) -> list[str]:
    """Делит по запятым верхнего уровня. «[...]» атомарна (там бывают неуравновешенные скобки)."""
    parts, buf, depth, i = [], [], 0, 0
    while i < len(text):
        ch = text[i]
        if ch == "[":
            j = text.find("]", i)
            j = len(text) - 1 if j == -1 else j
            buf.append(text[i : j + 1])
            i = j + 1
            continue
        if ch == "\\" and i + 1 < len(text):
            buf.append(text[i : i + 2])
            i += 2
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
        i += 1
    parts.append("".join(buf).strip())
    return [p for p in parts if p]


def weighted(token: str) -> tuple[str, float | None]:
    """«(name:1.4)» / «((name))» / «name» -> (name, вес или None)."""
    token = token.strip()
    if token.startswith("("):
        m = WEIGHTED_RE.match(token)
        if m:
            return m.group(1).strip(), float(m.group(2)) if m.group(2) else None
    return token, None


def clean(name: str) -> str:
    return UNESCAPE_RE.sub("", name).strip()


def parse_prompt(prompt: str) -> tuple[list[dict], list[dict]]:
    artists: list[dict] = []
    tags: list[dict] = []
    group_no = 0
    for token in split_top(prompt):
        if token.startswith("@["):
            group_no += 1
            inner = token[2:].rsplit("]", 1)[0]
            for item in inner.split("|"):
                name, w = weighted(item.strip().lstrip("(").rstrip(")") if ":" not in item else item.strip().strip("()"))
                name = clean(name.lstrip("@"))
                if not name:
                    continue
                # «(name:1.2» без закрывающей скобки: вес всё равно читаем
                m = re.match(r"^(.*?):\s*(-?\d+(?:\.\d+)?)$", name)
                if m:
                    name, w = m.group(1).strip(), float(m.group(2))
                entry = {"tag": "@" + name, "group": group_no}
                if w is not None:
                    entry["weight"] = w
                artists.append(entry)
            continue
        if token.startswith("@("):  # опечатка «@(name:1.4)»
            token = "(@" + token[2:]
        name, w = weighted(token)
        if token.startswith("(") and "@" in name and not name.startswith("@"):
            name = "@" + name  # (@a, ...) без явного начала
        if token.startswith("(") and "@" in name and "," in name:
            for t in split_top(name):
                entry = {"tag": "@" + clean(t.lstrip("@")) if t.startswith("@") else clean(t)}
                if w is not None:
                    entry["weight"] = w
                (artists if t.startswith("@") else tags).append(entry)
        elif name.startswith("@"):
            entry = {"tag": "@" + clean(name[1:])}
            if w is not None:
                entry["weight"] = w
            artists.append(entry)
        elif token.startswith("("):
            for t in split_top(name):
                entry = {"tag": clean(t)}
                if w is not None:
                    entry["weight"] = w
                tags.append(entry)
        else:
            tags.append({"tag": clean(token)})
    return artists, tags


def style_lookup(styles: list[dict]):
    index: dict[str, dict] = {}
    for s in sorted(styles, key=lambda s: s.get("published_at") or ""):
        index[site_key(s["name"])] = s
    def find(tag: str) -> str | None:
        for variant in (tag, tag.replace("_", " ")):
            hit = index.get(site_key(variant))
            if hit:
                return hit["id"]
        return None
    return find


def mixing_prompt(text: str) -> str:
    """Строки с @ — это микс; приветствие автора и хештег отбрасываются."""
    return " ".join(line.strip() for line in text.splitlines() if "@" in line)


AUTHOR_ID_RE = re.compile(r"\(?#s\d+\)?")
FOOTER_RE = re.compile(r"↗️.*|\*Автор исчерпал.*", re.S)


def generation_prompt(text: str) -> str:
    """Генерация из блога: микс = все токены с @ в тексте (стилевой префикс и хвост про персонажа
    в этих постах перемешаны и бывают обрезаны на «...»), собираем из них строку микса."""
    body = FOOTER_RE.sub("", AUTHOR_ID_RE.sub(" ", text))
    body = re.sub(r"#\w+", " ", body)
    tokens = []
    for token in split_top(" ".join(body.splitlines())):
        if "@" not in token:
            continue
        for t in re.split(r"(?=\(+@)", token):
            m = re.search(r"\(*@", t)
            if m:
                tokens.append(t[m.start() :].strip())
    return ", ".join(t.strip(" ,") for t in tokens)


def build_mixes(posts: list[Post], styles: list[dict], media: dict, state: dict, chat: dict):
    find = style_lookup(styles)
    counter = next_media_number(media)
    processed = set(state["chat"]["processed"])
    now = dt.datetime.now(MSK).isoformat(timespec="seconds")
    mixes, jobs, skipped, unknown = [], [], {}, {}

    def skip(reason, post):
        skipped.setdefault(reason, []).append(post.first_id)

    for post in posts:
        if post.first_id in processed or post.first_id <= state["chat"]["baseline_message_id"]:
            skip("уже импортировано", post)
            continue
        mixing = MIXING_TAG_RE.search(post.text)
        generation = GENERATION_TAG in post.text.lower() and "@" in post.text
        if not (mixing or generation):
            skip("не пост-микс (нет #…_mixing и #ampreview)", post)
            continue
        if mixing:
            prompt, origin = mixing_prompt(post.text), "mixing_post"
        else:
            prompt, origin = generation_prompt(post.text), "generation_post"
        if not prompt:
            skip("не нашёл строку с @художниками", post)
            continue
        if not post.photos or any(not p.exists() for p in post.photos):
            skip("нет картинок или файлов в экспорте", post)
            continue
        artists, tags = parse_prompt(prompt)
        if not artists:
            skip("в строке микса нет художников", post)
            continue
        for a in artists:
            a["style_id"] = find(a["tag"])
            if a["style_id"] is None:
                unknown[a["tag"]] = unknown.get(a["tag"], 0) + 1
        media_ids = []
        for f in post.photos:
            mid = f"p{counter:06d}"
            counter += 1
            jobs.append((mid, f))
            media_ids.append(mid)
        mix = {
            "id": f"mix_{post.first_id}",
            "origin": origin,
            "prompt_raw": prompt,
            "artists": artists,
            "tags": tags,
            "media": media_ids,
            "published_at": iso(post.date),
            "source": {"kind": "telegram", "message_id": post.first_id, "imported_at": now},
        }
        if chat.get("name"):
            mix["source"]["chat"] = chat["name"]
        mixes.append(mix)
    return mixes, jobs, skipped, unknown


class _Plan:  # минимальный набор для save_images
    def __init__(self, jobs):
        self.media_jobs = jobs


def report(mixes, skipped, unknown, apply):
    lines = [f"Миксов к импорту: {len(mixes)}, картинок: {sum(len(m['media']) for m in mixes)}"]
    for m in mixes:
        linked = sum(1 for a in m["artists"] if a["style_id"])
        groups = len({a["group"] for a in m["artists"] if "group" in a})
        lines.append(
            f"  {m['id']:<12} {m['origin']:<16} художников {len(m['artists']):>2} (в архиве {linked}), групп чередования {groups},"
            f" тегов {len(m['tags']):>2}, картинок {len(m['media'])}"
        )
    if unknown:
        lines.append(f"\nХудожники из миксов, которых нет в архиве ({len(unknown)}): " + ", ".join(sorted(unknown)[:60]))
    quiet = ("уже импортировано", "не пост-микс")
    for reason, ids in skipped.items():
        if reason.startswith(quiet):
            lines.append(f"\nПропущено без шума: {reason}: {len(ids)}")
        else:
            lines.append(f"\nПропущено: {reason}: {', '.join(map(str, ids[:20]))} (всего {len(ids)})")
    lines.append("\n" + ("ЗАПИСАНО." if apply else "Это пробный прогон, ничего не записано. Для записи добавьте --apply."))
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", type=Path)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--show", type=int, metavar="N", help="показать разбор первых N миксов и выйти")
    ap.add_argument("--root", type=Path, default=ROOT, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    root: Path = args.root

    messages, base, chat = load_messages(args.export)
    posts = group_posts(messages, base)
    styles = json.loads((root / "data" / "styles.json").read_text(encoding="utf-8"))
    media = json.loads((root / "data" / "media.json").read_text(encoding="utf-8"))
    mixes_path = root / "data" / "mixes.json"
    existing = json.loads(mixes_path.read_text(encoding="utf-8")) if mixes_path.exists() else []
    state = load_state(root, chat["id"])

    mixes, jobs, skipped, unknown = build_mixes(posts, styles, media, state, chat)
    taken = {m["id"] for m in existing}
    clash = [m["id"] for m in mixes if m["id"] in taken]
    if clash:
        print("Конфликт id с существующими миксами:", clash, file=sys.stderr)
        return 1
    if args.show:
        for m in mixes[: args.show]:
            print(json.dumps({k: v for k, v in m.items() if k != "source"}, ensure_ascii=False, indent=1))
        return 0
    print(report(mixes, skipped, unknown, args.apply))
    if args.apply and mixes:
        save_images(_Plan(jobs), root, media)
        dump(mixes_path, [*existing, *mixes])
        dump(root / "data" / "media.json", media)
        archives_path = root / "data" / "archives.json"
        archives = json.loads(archives_path.read_text(encoding="utf-8"))
        archives["archives"]["am"]["mediaCount"] = len(media)
        dump(archives_path, archives)
        state["chat"]["processed"] = sorted({*state["chat"]["processed"], *(int(m["source"]["message_id"]) for m in mixes)})
        state["chat"]["name"] = chat["name"]
        dump(root / "data" / STATE_FILE, state["full"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
