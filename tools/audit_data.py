#!/usr/bin/env python3
"""Проверка целостности данных сайта. Запускать перед каждым релизом.

  python3 tools/audit_data.py            # отчёт; код возврата 1 при ОШИБКАХ
  python3 tools/audit_data.py --strict   # предупреждения тоже считаются ошибками

ОШИБКИ (сайт сломан или покажет не то):
  - id стилей не уникальны;
  - стиль ссылается на media-id, которого нет в media*.json;
  - файл src или thumb из media*.json отсутствует на диске;
  - число стилей / медиа не совпадает с заявленным в data/archives.json;
  - у media-записи нет ширины/высоты (ломает раскладку сетки).
ПРЕДУПРЕЖДЕНИЯ (стоит посмотреть, но сайт работает):
  - у стиля нет ни одного изображения;
  - есть media-записи, на которые не ссылается ни один стиль;
  - одно и то же имя написано по-разному (регистр, «_» вместо пробела);
  - файлы в media/ без записи в media*.json.
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def key(name: str) -> str:
    return re.sub(r"[\s_]+", " ", name.replace("\\", "").lower()).strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    referenced_files: set[str] = set()

    archives = load("data/archives.json")["archives"]
    for name, a in archives.items():
        styles = load(a["styles"])
        media = load(a["media"])
        tag = f"[{name}]"

        ids = collections.Counter(s["id"] for s in styles)
        dup_ids = [i for i, c in ids.items() if c > 1]
        if dup_ids:
            errors.append(f"{tag} неуникальные id стилей: {dup_ids[:5]}")

        used = set()
        for s in styles:
            used.update(s.get("media", []))
            used.update(s.get("reference_media", []))
            if not s.get("media"):
                warnings.append(f"{tag} у стиля {s['id']} ({s['name']}) нет изображений")
        missing = sorted(m for m in used if m not in media)
        if missing:
            errors.append(f"{tag} ссылки на несуществующие media-id: {missing[:5]} (всего {len(missing)})")

        unused = sorted(m for m in media if m not in used)
        if unused:
            warnings.append(f"{tag} media без стиля: {len(unused)} шт., например {unused[:3]}")

        bad_dims = [k for k, v in media.items() if not v.get("width") or not v.get("height")]
        if bad_dims:
            errors.append(f"{tag} нет width/height у media: {bad_dims[:5]} (всего {len(bad_dims)})")

        missing_files = []
        for k, v in media.items():
            for field in ("src", "thumb"):
                rel = v[field].lstrip("/")
                referenced_files.add(rel)
                if not (ROOT / rel).exists():
                    missing_files.append(f"{k}.{field}")
        if missing_files:
            errors.append(f"{tag} файлов нет на диске: {len(missing_files)}, например {missing_files[:4]}")

        if a.get("visualCount") != len(styles):
            errors.append(f"{tag} visualCount={a.get('visualCount')}, а в файле {len(styles)} стилей")
        if a.get("mediaCount") != len(media):
            errors.append(f"{tag} mediaCount={a.get('mediaCount')}, а в файле {len(media)} записей")
        if a.get("supported"):
            sup = load(a["supported"])
            if a.get("supportedCount") != len(sup):
                errors.append(f"{tag} supportedCount={a.get('supportedCount')}, а в файле {len(sup)} имён")

        variants: dict[str, set[str]] = collections.defaultdict(set)
        for s in styles:
            variants[key(s["name"])].add(s["name"])
        spelled = [sorted(v) for v in variants.values() if len(v) > 1]
        if spelled:
            warnings.append(f"{tag} одно имя, разные написания: {len(spelled)}, например {spelled[:3]}")

        print(f"{tag} стилей {len(styles)}, медиа {len(media)}")

    # файлы в media/, на которые ничего не ссылается (кроме original/ - это архив, не часть сайта)
    orphan = [
        str(p.relative_to(ROOT)).replace("\\", "/")
        for d in ("web", "thumb", "opus", "sky")
        if (ROOT / "media" / d).is_dir()
        for p in (ROOT / "media" / d).iterdir()
        if str(p.relative_to(ROOT)).replace("\\", "/") not in referenced_files
    ]
    if orphan:
        warnings.append(f"файлы в media/ без записи в media*.json: {len(orphan)}, например {orphan[:3]}")

    print()
    for e in errors:
        print("ОШИБКА      ", e)
    for w in warnings:
        print("предупрежд. ", w)
    if not errors and not warnings:
        print("Всё чисто.")
    print(f"\nИтого: ошибок {len(errors)}, предупреждений {len(warnings)}")
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
