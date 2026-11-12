#!/usr/bin/env python3
"""Импорт поддерживаемых персонажей с сайта Stable Waifu (раздел «Characters AM»).

Источник: https://sites.google.com/view/stable-waifu/characters-am
Только основной список: буквы A–Z и «Цифры». «Мемы» и «OC модераторов» не берутся.

Порядок обновления (запускать на своём ПК, из корня репозитория):
  python3 tools/import_characters.py --only A --inspect 5   # как разобраны первые персонажи буквы A, ничего не пишет
  python3 tools/import_characters.py                        # пробный прогон: отчёт «добавлено / изменено / пропало»
  python3 tools/import_characters.py --apply                # записать data/characters.json и скачать новые картинки
  python3 tools/audit_data.py && python3 tests/smoke.py     # проверить

Формат источника (сверен 13.11.2026: 44 страницы, 3117 персонажей, 4576 вариантов образов, 21 заметка):
  - Сайт на Google Sites, HTML отдаётся сервером целиком, JavaScript не нужен.
  - Один персонаж = один <section>: картинка (sites.google.com/sitesv-images-rt/...=w1280, 512 px по ширине),
    абзац с именем «Имя (Тайтл)» и абзац(ы) с тегами. Строки внутри абзаца разделены <br>.
  - Строка тегов: «1girl, aak \\(arknights\\), white coat, ...» — скобки уже экранированы, берём как есть.
  - Вариант образа: «подпись: теги» («стандарт: 1girl, ...», «Starting Future: 1girl, ...»,
    бывает «Химера:1girl, ...» без пробела и «гоночный костюм:: 1girl, ...»).
  - Строка с кириллицей вне подписи — заметка («рекомендуется негатив ...», «+arm cannon», «заменяемые теги: ...»).
  - У большой буквы несколько страниц (aam1, aam1/aam2, aam1/aam3): страницы находятся обходом ссылок.

Картинки: media/characters/<id>.webp (WebP, ширина до 512). По умолчанию скачиваются только для новых
персонажей; --refresh-images перекачивает все и перезаписывает изменившиеся.

Нужно: pip install pillow
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = "https://sites.google.com/view/stable-waifu/characters-am"
SOURCE_PATH = urlparse(SOURCE_URL).path
SKIP_PATHS = ("/meme", "/oc-moderators")
DATA_FILE = ROOT / "data" / "characters.json"
MEDIA_DIR = ROOT / "media" / "characters"
MEDIA_URL = "/media/characters/"
USER_AGENT = "StyleArchiveImporter/1.0 (+https://stylearchive.art)"
IMAGE_WIDTH = 512
IMAGE_QUALITY = 82

CYRILLIC = re.compile(r"[а-яё]", re.I)
VARIANT_START = re.compile(r"^\d?(girl|boy|other)s?\b", re.I)
LABELED = re.compile(r"^([^,:]{1,80}?)::?\s*(.*)$", re.S)
TITLED = re.compile(r"^(.*?)\s*\(([^()]*)\)\s*$")


# ---------------------------------------------------------------- разбор страницы


class _PageParser(HTMLParser):
    """Собирает секции страницы: картинки и абзацы (абзац = список строк, <br> начинает новую строку)."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.sections: list[dict] = []
        self.links: list[str] = []
        self._section: dict | None = None
        self._para: list[str] | None = None
        self._svg_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "svg":
            self._svg_depth += 1
        if tag == "section":
            self._section = {"images": [], "paragraphs": []}
            self.sections.append(self._section)
        elif self._section is not None:
            if tag == "img" and "sitesv-images-rt" in (attrs.get("src") or ""):
                self._section["images"].append(attrs["src"])
            elif tag == "p":
                self._para = [""]
                self._section["paragraphs"].append(self._para)
            elif tag == "br" and self._para is not None:
                self._para.append("")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "svg":
            self._svg_depth = max(0, self._svg_depth - 1)
        elif tag == "p":
            self._para = None
        elif tag == "section":
            self._section = None
            self._para = None

    def handle_data(self, data):
        if self._para is not None and not self._svg_depth:
            self._para[-1] += data


def clean_line(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace(" ", " ")).strip()


def clean_tags(text: str) -> str:
    """Нормализует пробелы и пустые элементы, не трогая сами теги и экранирование."""
    parts = [clean_line(part) for part in text.split(",")]
    return ", ".join(part for part in parts if part)


def classify(line: str) -> dict:
    """Строка абзаца -> вариант образа {label, tags} или заметка {note}."""
    match = LABELED.match(line)
    if match:
        label, rest = match.group(1).strip(), match.group(2).strip()
        colon_with_space = re.match(r"^[^,:]{1,80}?::?\s", line) is not None
        if (
            "," in rest
            and not CYRILLIC.search(rest)
            and (colon_with_space or CYRILLIC.search(label) or VARIANT_START.match(rest))
        ):
            return {"label": label, "tags": clean_tags(rest)}
    # строка тегов без подписи; «1girl, …» — теги, даже если в ней опечатка кириллицей («braceletб»)
    if "," in line and (not CYRILLIC.search(line) or VARIANT_START.match(line)):
        return {"label": "", "tags": clean_tags(line)}
    return {"note": line}


def split_name(name: str) -> tuple[str, str]:
    match = TITLED.match(name)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return name, ""


def parse_page(html: str) -> tuple[list[dict], list[str]]:
    """HTML страницы -> (персонажи, ссылки). Персонаж: name, base, title, variants, notes, image_src."""
    parser = _PageParser()
    parser.feed(html)
    parser.close()

    characters = []
    for section in parser.sections:
        paragraphs = [
            [clean_line(line) for line in para if clean_line(line)] for para in section["paragraphs"]
        ]
        paragraphs = [para for para in paragraphs if para]
        if not section["images"] or len(paragraphs) < 2:
            continue

        name = " ".join(paragraphs[0])
        variants, notes = [], []
        for line in (line for para in paragraphs[1:] for line in para):
            item = classify(line)
            if "note" in item:
                notes.append(item["note"])
            else:
                variants.append(item)

        base, title = split_name(name)
        characters.append(
            {
                "name": name,
                "base": base,
                "title": title,
                "variants": variants,
                "notes": notes,
                "image_src": section["images"][0],
            }
        )
    return characters, parser.links


def letter_of(path: str) -> str:
    """/view/.../characters-am/aam1/aam2 -> «A», numbers-am -> «#»."""
    first = path[len(SOURCE_PATH) :].strip("/").split("/")[0]
    if first.startswith("numbers"):
        return "#"
    return first[:1].upper() if first else "?"


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "character"


def assign_ids(characters: list[dict], previous: dict[str, str]) -> None:
    """id по имени; если имя уже было в прошлом импорте, id сохраняется."""
    used: set[str] = set()
    for character in characters:
        key = character["name"].casefold()
        candidate = previous.get(key) or slugify(character["name"])
        base, n = candidate, 2
        while candidate in used:
            candidate = f"{base}-{n}"
            n += 1
        used.add(candidate)
        character["id"] = candidate


# ---------------------------------------------------------------- загрузка


def fetch(url: str, retries: int = 3, delay: float = 0.4) -> bytes:
    last_error = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=40) as response:
                body = response.read()
            time.sleep(delay)
            return body
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"не удалось скачать {url}: {last_error}")


def crawl(only: set[str] | None) -> tuple[list[dict], list[str]]:
    """Обходит раздел, начиная с корня. Возвращает персонажей в порядке страниц и список страниц."""
    queue, seen, pages, characters = [SOURCE_PATH], set(), [], []
    while queue:
        path = queue.pop(0)
        if path in seen:
            continue
        seen.add(path)

        letter = letter_of(path)
        if only and path != SOURCE_PATH and letter not in only:
            continue

        html = fetch(urljoin(SOURCE_URL, path)).decode("utf-8", "replace")
        found, links = parse_page(html)
        if path != SOURCE_PATH:
            pages.append(path)
        for character in found:
            character["letter"] = letter
            character["page"] = path[len(SOURCE_PATH) :] or "/"
        characters.extend(found)
        print(f"  {path[len(SOURCE_PATH):] or '/'}: {len(found)}", file=sys.stderr)

        for href in links:
            target = urlparse(urljoin(SOURCE_URL, href))
            if target.netloc != "sites.google.com":
                continue
            link = target.path.rstrip("/")
            if not link.startswith(SOURCE_PATH + "/") or any(skip in link for skip in SKIP_PATHS):
                continue
            if link not in seen and link not in queue:
                queue.append(link)
    return characters, pages


def save_image(data: bytes, dst: Path) -> tuple[int, int]:
    from PIL import Image  # pillow нужен только для --apply

    with Image.open(io.BytesIO(data)) as image:
        image = image.convert("RGB")
        width = min(IMAGE_WIDTH, image.width)
        height = max(1, round(image.height * width / image.width))
        if width != image.width:
            image = image.resize((width, height), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=IMAGE_QUALITY, method=6)
    payload = buffer.getvalue()
    if not dst.exists() or dst.read_bytes() != payload:
        dst.write_bytes(payload)
    return width, height


# ---------------------------------------------------------------- сравнение и запись


def load_previous() -> dict:
    if not DATA_FILE.exists():
        return {"characters": []}
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def comparable(character: dict) -> str:
    keys = ("name", "variants", "notes")
    return json.dumps({key: character.get(key) for key in keys}, ensure_ascii=False, sort_keys=True)


def diff(previous: list[dict], current: list[dict]) -> dict:
    before = {c["id"]: c for c in previous}
    after = {c["id"]: c for c in current}
    return {
        "added": [after[i]["name"] for i in after if i not in before],
        "removed": [before[i]["name"] for i in before if i not in after],
        "changed": [
            after[i]["name"] for i in after if i in before and comparable(after[i]) != comparable(before[i])
        ],
    }


def print_report(report: dict, total: int, pages: int, variants: int, notes: int) -> None:
    print(f"Страниц: {pages}, персонажей: {total}, вариантов образов: {variants}, заметок: {notes}")
    for key, title in (("added", "Добавлено"), ("changed", "Изменено"), ("removed", "Пропало")):
        names = report[key]
        print(f"{title}: {len(names)}")
        for name in names[:25]:
            print(f"    {name}")
        if len(names) > 25:
            print(f"    … и ещё {len(names) - 25}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--apply", action="store_true", help="записать data/characters.json и скачать картинки")
    ap.add_argument("--only", help="только эти буквы через запятую (A,B или #); вместе с --apply запрещено")
    ap.add_argument("--inspect", type=int, metavar="N", help="показать, как разобраны первые N персонажей")
    ap.add_argument("--refresh-images", action="store_true", help="перекачать картинки всех персонажей")
    ap.add_argument("--force", action="store_true", help="записать, даже если персонажей стало заметно меньше")
    args = ap.parse_args()

    only = {letter.strip().upper() for letter in args.only.split(",")} if args.only else None
    if only and args.apply:
        print("--only нельзя совмещать с --apply: остальные буквы пропали бы из данных.", file=sys.stderr)
        return 2

    print("Обход страниц…", file=sys.stderr)
    characters, pages = crawl(only)

    previous = load_previous()
    previous_ids = {c["name"].casefold(): c["id"] for c in previous.get("characters", [])}
    assign_ids(characters, previous_ids)

    if args.inspect:
        for character in characters[: args.inspect]:
            print(json.dumps({k: v for k, v in character.items() if k != "image_src"}, ensure_ascii=False, indent=2))
        return 0

    variants = sum(len(c["variants"]) for c in characters)
    notes = sum(len(c["notes"]) for c in characters)
    without_tags = [c["name"] for c in characters if not c["variants"]]

    old = previous.get("characters", [])
    if only:
        old = [c for c in old if c.get("letter") in only]
    report = diff(old, characters)
    print_report(report, len(characters), len(pages), variants, notes)
    if without_tags:
        print(f"Без строки тегов: {len(without_tags)} — {', '.join(without_tags[:10])}")

    if not args.apply:
        print("\nПробный прогон: ничего не записано. Для записи добавьте --apply.")
        return 0

    if old and len(characters) < len(old) * 0.8 and not args.force:
        print(
            f"\nПерсонажей стало {len(characters)} вместо {len(old)}: похоже, сайт изменился или не догрузился. "
            "Ничего не записано. Проверьте и при необходимости запустите с --force.",
            file=sys.stderr,
        )
        return 1

    previous_by_id = {c["id"]: c for c in previous.get("characters", [])}
    downloaded = skipped = failed = 0
    for index, character in enumerate(characters, 1):
        dst = MEDIA_DIR / f"{character['id']}.webp"
        known = previous_by_id.get(character["id"], {})
        if dst.exists() and not args.refresh_images and known.get("width"):
            character["width"], character["height"] = known["width"], known["height"]
            skipped += 1
            continue
        try:
            character["width"], character["height"] = save_image(fetch(character["image_src"], delay=0.15), dst)
            downloaded += 1
        except Exception as error:  # картинка не критична: персонаж остаётся, превью нет
            failed += 1
            print(f"  картинка не скачалась: {character['name']}: {error}", file=sys.stderr)
        if index % 100 == 0:
            print(f"  картинки: {index}/{len(characters)}", file=sys.stderr)

    out = []
    for character in characters:
        has_image = (MEDIA_DIR / f"{character['id']}.webp").exists()
        out.append(
            {
                "id": character["id"],
                "name": character["name"],
                "base": character["base"],
                "title": character["title"],
                "letter": character["letter"],
                "variants": character["variants"],
                "notes": character["notes"],
                "image": f"{MEDIA_URL}{character['id']}.webp" if has_image else None,
                "width": character.get("width"),
                "height": character.get("height"),
            }
        )

    payload = {
        "source": SOURCE_URL,
        "updated_at": dt.date.today().isoformat(),
        "count": len(out),
        "characters": out,
    }
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    digest = hashlib.sha1(DATA_FILE.read_bytes()).hexdigest()[:10]
    print(f"\nЗаписано: {DATA_FILE.relative_to(ROOT)} ({len(out)} персонажей, sha1 {digest})")
    print(f"Картинки: скачано {downloaded}, уже были {skipped}, ошибок {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
