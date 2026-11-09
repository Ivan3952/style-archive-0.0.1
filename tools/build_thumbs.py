#!/usr/bin/env python3
"""Привязывает миниатюры к data/*media*.json и дорисовывает недостающие.

Что делает для каждой записи media-id в выбранном архиве:
  1. Ищет media/thumb/<id>.webp. Если файла нет, создаёт его из полноразмерного
     файла (поле "src") с тем же шириной/качеством, что у существующих миниатюр.
  2. Прописывает в JSON "thumb": "/media/thumb/<id>.webp". Поле "src"
     (полный размер для вьювера) и width/height не трогает: пропорции у миниатюры
     те же, поэтому раскладка сетки не меняется.

Запуск из корня репозитория:
  python3 tools/build_thumbs.py                 # только архив AM
  python3 tools/build_thumbs.py --archive all   # AM + OPUS + SKY
  python3 tools/build_thumbs.py --dry-run       # ничего не писать, только отчёт

Требуется Pillow с поддержкой WebP:  pip install pillow
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
THUMB_URL_PREFIX = "/media/thumb/"


def load_archives() -> dict:
    with (ROOT / "data" / "archives.json").open(encoding="utf-8") as f:
        return json.load(f)["archives"]


def make_thumb(src: Path, dst: Path, width: int, quality: int) -> None:
    with Image.open(src) as im:
        im = im.convert("RGB")
        target_w = min(width, im.width)  # не увеличиваем маленькие картинки
        target_h = max(1, round(im.height * target_w / im.width))
        im = im.resize((target_w, target_h), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "WEBP", quality=quality, method=6)


def process(name: str, media_rel: str, args: argparse.Namespace) -> dict:
    media_path = ROOT / media_rel
    with media_path.open(encoding="utf-8") as f:
        media = json.load(f)

    stats = {"total": len(media), "existing": 0, "created": 0, "relinked": 0, "missing_src": 0}

    for media_id, entry in media.items():
        thumb_rel = f"{THUMB_URL_PREFIX}{media_id}.webp"
        thumb_file = ROOT / thumb_rel.lstrip("/")

        if thumb_file.exists():
            stats["existing"] += 1
        else:
            src_file = ROOT / entry["src"].lstrip("/")
            if not src_file.exists():
                stats["missing_src"] += 1
                continue  # оставляем как есть: thumb == src
            if not args.dry_run:
                make_thumb(src_file, thumb_file, args.width, args.quality)
            stats["created"] += 1

        if entry.get("thumb") != thumb_rel:
            entry["thumb"] = thumb_rel
            stats["relinked"] += 1

    if not args.dry_run:
        with media_path.open("w", encoding="utf-8") as f:
            json.dump(media, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return stats


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--archive", default="am", help="am | opus | sky | all (по умолчанию am)")
    ap.add_argument("--width", type=int, default=560, help="ширина новых миниатюр, px (по умолчанию 560, как у существующих)")
    ap.add_argument("--quality", type=int, default=82, help="качество WebP (по умолчанию 82)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    archives = load_archives()
    names = list(archives) if args.archive == "all" else [args.archive]
    for name in names:
        if name not in archives:
            print(f"Неизвестный архив: {name}. Доступны: {', '.join(archives)}", file=sys.stderr)
            return 2

    for name in names:
        stats = process(name, archives[name]["media"], args)
        print(f"[{name}] {stats}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
