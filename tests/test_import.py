#!/usr/bin/env python3
"""Проверка tools/import_telegram.py на синтетическом экспорте (реальные данные не трогаются).

Фикстура выдуманная: формат result.json взят из описания Telegram Desktop, а не из настоящего экспорта.
Запуск: python3 tests/test_import.py
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TOOL = ROOT / "tools" / "import_telegram.py"


def msg(mid, date, text="", photo=None):
    m = {"id": mid, "type": "message", "date": date, "text": text}
    if photo:
        m["photo"] = photo
    return m


def build(export: Path):
    (export / "photos").mkdir(parents=True)
    n = 0

    def img(color):
        nonlocal n
        n += 1
        name = f"photos/photo_{n}.jpg"
        Image.new("RGB", (1600, 900), color).save(export / name)
        return name

    big = 900000
    msgs = [
        msg(big + 1, "2026-11-01T10:00:00", "просто новость"),
        # 1 художник, 2 картинки, main
        msg(big + 2, "2026-11-01T11:00:00", "#previewstyle\n@Test New One main", img("red")),
        msg(big + 3, "2026-11-01T11:00:00", "", img("blue")),
        # 2 художника, 2 картинки, alt
        msg(big + 4, "2026-11-02T11:00:00", "#previewstyle alt\n@Pair A\n@Pair B", img("green")),
        msg(big + 5, "2026-11-02T11:00:00", "", img("yellow")),
        # 2 художника, 3 картинки: первая общая
        msg(big + 6, "2026-11-03T11:00:00", "#previewstyle main\n@Ref A\n@Ref B", img("black")),
        msg(big + 7, "2026-11-03T11:00:00", "", img("white")),
        msg(big + 8, "2026-11-03T11:00:00", "", img("gray")),
        # без пресета
        msg(big + 9, "2026-11-04T11:00:00", "#previewstyle\n@No Preset", img("pink")),
        # сомнительный: 3 художника, 1 картинка
        msg(big + 10, "2026-11-05T11:00:00", "#previewstyle main\n@X1\n@X2\n@X3", img("cyan")),
        # без картинки (Photos не выгружены)
        msg(big + 11, "2026-11-06T11:00:00", "#previewstyle main\n@No Photo"),
    ]
    (export / "result.json").write_text(
        json.dumps({"name": "Test", "type": "public_channel", "id": 1, "messages": msgs}, ensure_ascii=False),
        encoding="utf-8",
    )


def run(root, export, *extra):
    r = subprocess.run(
        [sys.executable, str(TOOL), str(export), "--root", str(root), *extra],
        capture_output=True, text=True,
    )
    return r.returncode, r.stdout + r.stderr


def main():
    tmp = Path(tempfile.mkdtemp(prefix="imp_test_"))
    try:
        root = tmp / "site"
        (root / "data").mkdir(parents=True)
        for f in ("styles.json", "media.json", "archives.json"):
            shutil.copy(ROOT / "data" / f, root / "data" / f)
        export = tmp / "export"
        build(export)

        styles0 = json.loads((root / "data" / "styles.json").read_text())
        existing = styles0[0]["name"]  # для проверки «к старой записи»
        before = (root / "data" / "styles.json").read_bytes()

        # пробный прогон ничего не пишет
        code, out = run(root, export)
        assert code == 0, out
        assert (root / "data" / "styles.json").read_bytes() == before, "dry-run изменил файл"
        assert not (root / "media").exists(), "dry-run создал media"
        assert "сомнительн" in out.lower() and "нет пресета" in out, out

        # добавим пост про уже существующий стиль
        data = json.loads((export / "result.json").read_text())
        data["messages"] += [
            msg(900020, "2026-11-07T11:00:00", f"#previewstyle\n{existing} alt", "photos/photo_1.jpg")
        ]
        (export / "result.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

        code, out = run(root, export, "--apply")
        assert code == 0, out
        styles = json.loads((root / "data" / "styles.json").read_text())
        media = json.loads((root / "data" / "media.json").read_text())
        arch = json.loads((root / "data" / "archives.json").read_text())
        by_id = {s["id"]: s for s in styles}

        one = by_id["900002"]
        assert one["name"] == "@Test New One" and one["presets"] == ["main"] and len(one["media"]) == 2, one
        assert by_id["900004-1"]["presets"] == ["alt"] and by_id["900004-2"]["name"] == "@Pair B"
        assert by_id["900006-1"]["reference_media"] == by_id["900006-2"]["reference_media"] != []
        assert len(by_id["900006-1"]["media"]) == 1
        assert not any(i.startswith(("900009", "900010", "900011")) for i in by_id), "лишние посты попали в архив"
        assert len(by_id) == len(styles0) + 1 + 2 + 2, len(by_id)  # +1 +2 +2 новых записи
        assert "updated_at" in styles[0] or any("updated_at" in s for s in styles)
        for s in styles:
            for m in [*s["media"], *s["reference_media"]]:
                assert m in media, m
        for mid in ("p006585",):
            assert (root / "media" / "web" / f"{mid}.webp").exists()
            assert (root / "media" / "thumb" / f"{mid}.webp").exists()
        assert arch["archives"]["am"]["visualCount"] == len(styles)
        assert arch["archives"]["am"]["mediaCount"] == len(media)

        try:
            import jsonschema
            schema = json.loads((ROOT / "data" / "schema" / "styles.schema.json").read_text())
            jsonschema.validate(styles, schema)
        except ImportError:
            print("jsonschema не установлен: проверка схемы пропущена")

        # повторный запуск: всё уже импортировано, ничего не меняется
        snap = (root / "data" / "styles.json").read_bytes()
        code, out = run(root, export, "--apply")
        assert code == 0 and (root / "data" / "styles.json").read_bytes() == snap, out
        print("OK: import_telegram")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
