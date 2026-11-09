#!/usr/bin/env python3
"""Строит лёгкий data/danbooru.min.json из полного data/danbooru.json.

Полный файл остаётся источником правды (его формирует твой Danbooru-экспорт).
Сайт грузит только .min.json: в нём оставлены поля, которые реально читает код
  danbooru-v003.js / app.js:  status, match, post_count, source
  search-v004.js (алиасы):    danbooru_tag, matched_candidate, но только у записей
                              с match == "alias"
Не используются и поэтому убираются: tag_id, checked_at, candidates, а также
danbooru_tag / matched_candidate у всех остальных записей.

Запуск из корня репозитория после каждого обновления danbooru.json:
  python3 tools/slim_danbooru.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "danbooru.json"
DST = ROOT / "data" / "danbooru.min.json"
KEEP = ("status", "match", "post_count", "source")
KEEP_ALIAS_EXTRA = ("danbooru_tag", "matched_candidate")


def slim(rec: dict) -> dict:
    keys = KEEP + (KEEP_ALIAS_EXTRA if rec.get("status") == "matched" and rec.get("match") == "alias" else ())
    return {k: rec[k] for k in keys if k in rec}


def main() -> int:
    with SRC.open(encoding="utf-8") as f:
        full = json.load(f)

    slim_styles = {name: slim(rec) for name, rec in full["styles"].items()}
    out = {"meta": full.get("meta", {}), "styles": slim_styles}

    with DST.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"{len(slim_styles)} записей: {SRC.stat().st_size:,} -> {DST.stat().st_size:,} байт")
    return 0


if __name__ == "__main__":
    sys.exit(main())
