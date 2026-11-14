#!/usr/bin/env python3
"""Контактные листы превью персонажей для просмотра глазами.

Собирает превью из media/characters/ в листы по 60 нумерованных миниатюр (10×6) и кладёт их в
reports/contact_sheets/ вместе с index.json (номер на листе -> файл превью и персонаж). Порядок:
  1. «приоритет» — основные превью, в тегах которых есть откровенные слова (их стоит проверить первыми);
  2. «наряды» — превью дополнительных нарядов (<id>--N.webp);
  3. «остальные» — все прочие основные превью.

Что делать с плохими: записать их ключи (например abigail-williams-fate--3) и перегенерировать
  python3 tools/generate_character_previews.py --all-variants --ids <id> --overwrite
либо удалить файл и выполнить python3 tools/import_characters.py --media-only (наряд покажет основное превью).

Запуск:
  python3 tools/contact_sheets.py                  # все листы
  python3 tools/contact_sheets.py --group priority # только приоритетные
Нужно: pip install pillow
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CHARACTERS = ROOT / "data" / "characters.json"
MEDIA_DIR = ROOT / "media" / "characters"
OUT_DIR = ROOT / "reports" / "contact_sheets"

COLS, ROWS = 10, 6
THUMB_W, THUMB_H = 170, 248
LABEL_H = 22
PAD = 6


def revealing_pattern():
    """Тот же фильтр, что у генератора, чтобы «приоритет» совпадал с его правилами."""
    spec = importlib.util.spec_from_file_location("gen", ROOT / "tools" / "generate_character_previews.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.REVEALING


def collect() -> dict[str, list[dict]]:
    revealing = revealing_pattern()
    characters = json.loads(CHARACTERS.read_text(encoding="utf-8"))["characters"]
    groups: dict[str, list[dict]] = {"priority": [], "variants": [], "rest": []}
    for character in characters:
        variants = character.get("variants") or []
        if character.get("image"):
            tags = variants[0].get("tags", "") if variants else ""
            item = {"key": character["id"], "name": character["name"], "variant": variants[0].get("label", "") if variants else "", "tags": tags}
            groups["priority" if revealing.search(tags) else "rest"].append(item)
        for index, variant in enumerate(variants[1:], start=1):
            if variant.get("image"):
                groups["variants"].append(
                    {
                        "key": f"{character['id']}--{index + 1}",
                        "name": character["name"],
                        "variant": variant.get("label", ""),
                        "tags": variant.get("tags", ""),
                    }
                )
    return groups


def font(size: int):
    for name in ("arial.ttf", "DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def build_sheet(items: list[dict], start: int, title: str, path: Path) -> None:
    head = 34
    width = PAD + COLS * (THUMB_W + PAD)
    height = head + PAD + ROWS * (THUMB_H + LABEL_H + PAD)
    sheet = Image.new("RGB", (width, height), (32, 34, 40))
    draw = ImageDraw.Draw(sheet)
    draw.text((PAD, 8), title, fill=(235, 235, 235), font=font(18))
    small = font(13)
    for offset, item in enumerate(items):
        col, row = offset % COLS, offset // COLS
        x = PAD + col * (THUMB_W + PAD)
        y = head + PAD + row * (THUMB_H + LABEL_H + PAD)
        file = MEDIA_DIR / f"{item['key']}.webp"
        try:
            with Image.open(file) as picture:
                thumb = picture.convert("RGB")
                thumb.thumbnail((THUMB_W, THUMB_H))
                sheet.paste(thumb, (x + (THUMB_W - thumb.width) // 2, y + (THUMB_H - thumb.height) // 2))
        except OSError:
            draw.rectangle((x, y, x + THUMB_W, y + THUMB_H), outline=(200, 60, 60), width=2)
            draw.text((x + 8, y + 8), "нет файла", fill=(230, 90, 90), font=small)
        number = start + offset
        draw.rectangle((x, y + THUMB_H, x + THUMB_W, y + THUMB_H + LABEL_H), fill=(18, 19, 23))
        label = f"{number}  {item['key']}"
        draw.text((x + 4, y + THUMB_H + 4), label[:26], fill=(220, 220, 220), font=small)
    sheet.save(path, quality=82)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--group", choices=("priority", "variants", "rest"), help="только одна группа")
    args = ap.parse_args()

    groups = collect()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.jpg"):
        old.unlink()

    per_sheet = COLS * ROWS
    index, sheets, number = {}, 0, 1
    names = {"priority": "приоритет", "variants": "наряды", "rest": "остальные"}
    for group, items in groups.items():
        if args.group and group != args.group:
            continue
        for chunk_start in range(0, len(items), per_sheet):
            chunk = items[chunk_start : chunk_start + per_sheet]
            sheets += 1
            file = OUT_DIR / f"{sheets:03d}-{group}.jpg"
            title = f"{names[group]}: {chunk_start + 1}–{chunk_start + len(chunk)} из {len(items)}   ·   лист {sheets}"
            build_sheet(chunk, number, title, file)
            for offset, item in enumerate(chunk):
                index[number + offset] = {**item, "group": group, "sheet": file.name}
            number += len(chunk)
        print(f"{names[group]}: {len(items)}")

    (OUT_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Листов: {sheets} -> {OUT_DIR.relative_to(ROOT)}/ (номера на листах -> index.json)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
