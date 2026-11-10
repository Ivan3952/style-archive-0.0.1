#!/usr/bin/env python3
"""Проверка целостности данных сайта. Запускать перед каждым релизом.

  python3 tools/audit_data.py            # отчёт; код возврата 1 при ОШИБКАХ
  python3 tools/audit_data.py --strict   # предупреждения тоже считаются ошибками

ОШИБКИ (сайт сломан или покажет не то):
  - id стилей не уникальны;
  - стиль ссылается на media-id, которого нет в media*.json;
  - файл src или thumb из media*.json отсутствует на диске;
  - число стилей / медиа не совпадает с заявленным в data/archives.json
    (в том числе uniqueCount: сколько стилей остаётся после склейки одинаковых названий);
  - у media-записи нет ширины/высоты (ломает раскладку сетки);
  - файл данных не соответствует схеме из data/schema/ (нужен пакет jsonschema).
ПРЕДУПРЕЖДЕНИЯ (стоит посмотреть, но сайт работает):
  - у стиля нет ни одного изображения;
  - в файле есть записи с одинаковым названием (сайт склеивает их в одну карточку);
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
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def key(name: str) -> str:
    return re.sub(r"[\s_]+", " ", name.replace("\\", "").lower()).strip()



def site_name_key(style: dict, index: int) -> str:
    """Ключ склейки как на сайте: NFKC, нижний регистр, ё=е, пробелы схлопнуты."""
    value = unicodedata.normalize("NFKC", str(style.get("name") or style.get("copy_value") or ""))
    value = re.sub(r"\s+", " ", value.lower().replace("ё", "е").strip())
    return value or f"__record_{style.get('id') or index}"



def validate_schemas(errors: list[str], warnings: list[str]) -> None:
    """Проверка файлов данных по JSON Schema из data/schema/ (нужен пакет jsonschema)."""
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        warnings.append("схемы данных не проверены: установите пакет (pip install jsonschema)")
        return

    def check(path: Path, schema_name: str) -> None:
        if not path.exists():
            return
        schema = json.loads((ROOT / "data" / "schema" / schema_name).read_text(encoding="utf-8"))
        data = json.loads(path.read_text(encoding="utf-8"))
        problems = sorted(Draft202012Validator(schema).iter_errors(data), key=lambda e: list(e.absolute_path))
        for e in problems[:5]:
            where = "/".join(str(p) for p in e.absolute_path) or "(корень)"
            errors.append(f"{path.name}: {where}: {e.message[:140]}")
        if len(problems) > 5:
            errors.append(f"{path.name}: ... и ещё {len(problems) - 5} нарушений схемы {schema_name}")

    check(ROOT / "data" / "archives.json", "archives.schema.json")
    cfg = json.loads((ROOT / "data" / "archives.json").read_text(encoding="utf-8"))
    for a in cfg["archives"].values():
        check(ROOT / a["styles"], "styles.schema.json")
        check(ROOT / a["media"], "media.schema.json")
        if a.get("supported"):
            check(ROOT / a["supported"], "supported.schema.json")
    # новые типы данных (появятся в обновлениях Foundation и позже)
    for name, schema in (("mixes", "mixes"), ("events", "events"), ("characters", "characters")):
        check(ROOT / "data" / f"{name}.json", f"{schema}.schema.json")


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
        # Сколько стилей видит посетитель: сайт склеивает записи с одинаковым названием
        # (та же нормализация, что normalizeStyleName в src/legacy/app.js).
        unique = len({site_name_key(s, i) for i, s in enumerate(styles)})
        if a.get("uniqueCount") != unique:
            errors.append(f"{tag} uniqueCount={a.get('uniqueCount')}, а после склейки одинаковых названий {unique}")
        if unique != len(styles):
            warnings.append(f"{tag} записей с повторяющимся названием: {len(styles) - unique} (на сайте склеиваются в одну карточку)")
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

    validate_schemas(errors, warnings)

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
