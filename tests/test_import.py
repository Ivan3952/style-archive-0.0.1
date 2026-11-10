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


def msg(mid, date, text="", photo=None, fwd="K-Ran"):
    m = {"id": mid, "type": "message", "date": date, "text": text, "forwarded_from": fwd}
    if photo:
        m["photo"] = photo
    return m


def build(export: Path):
    """Выдуманный чат в форме реального экспорта «Стили»: пересланные посты, подпись только у первого
    сообщения альбома, остальные без текста, части альбома с разницей в секунду."""
    (export / "photos").mkdir(parents=True)
    n = 0

    def img(color):
        nonlocal n
        n += 1
        name = f"photos/photo_{n}.jpg"
        Image.new("RGB", (1600, 900), color).save(export / name)
        return name

    big = 900000
    t = "2026-11-01T10:00:0"
    msgs = [
        msg(big + 1, t + "0", "просто сообщение без картинки"),
        # формат «@имя → main»: каждое сообщение отдельный пост, дата одна и та же
        msg(big + 2, t + "1", "@Test New One → main\n\n#previewstyle", img("red"), "Avri."),
        msg(big + 3, t + "1", "@Test Second → main\n\n#previewstyle\nкомментарий", img("blue"), "Avri."),
        # два художника, две картинки, preset мейн (русский), экранированные скобки
        msg(big + 4, t + "2", "@Pair A \\(x1\\)\n@Pair B\n#previewstyle мейн", img("green")),
        msg(big + 5, t + "3", "", img("yellow")),  # продолжение альбома через секунду
        # два пресета: один художник, две картинки
        msg(big + 6, t + "3", "#previewstyle main | alt\n@Both One", img("black"), "press elf"),
        msg(big + 7, t + "3", "", img("white"), "press elf"),
        # два пресета: два художника, четыре картинки
        msg(big + 8, t + "4", "#previewstyle\nМэйн / Альт\n1-2 @Both A\n3-4 @Both B", img("gray"), "Leon"),
        msg(big + 9, t + "4", "", img("pink"), "Leon"),
        msg(big + 10, t + "4", "", img("cyan"), "Leon"),
        msg(big + 11, t + "4", "", img("orange"), "Leon"),
        # без пресета
        msg(big + 12, t + "5", "#previewstyle\n@No Preset", img("purple")),
        # сомнительный: 3 художника, 1 картинка
        msg(big + 13, t + "6", "#previewstyle main\n@X1\n@X2\n@X3", img("brown")),
        # без картинки
        msg(big + 14, t + "7", "#previewstyle main\n@No Photo"),
    ]
    (export / "result.json").write_text(
        json.dumps({"name": "Стили", "type": "private_supergroup", "id": 42, "messages": msgs}, ensure_ascii=False),
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
        media0 = json.loads((root / "data" / "media.json").read_text())

        # пробный прогон ничего не пишет
        code, out = run(root, export)
        assert code == 0, out
        assert (root / "data" / "styles.json").read_bytes() == before, "dry-run изменил файл"
        assert not (root / "media").exists(), "dry-run создал media"
        assert "сомнительн" in out.lower() and "нет пресета" in out, out

        # пост про уже существующий стиль (другое написание регистра) с пресетом alt
        data = json.loads((export / "result.json").read_text())
        data["messages"] += [
            msg(900020, "2026-11-07T11:00:00", f"#previewstyle\n{existing.upper()}\nalt", "photos/photo_1.jpg")
        ]
        (export / "result.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

        code, out = run(root, export, "--apply")
        assert code == 0, out
        styles = json.loads((root / "data" / "styles.json").read_text())
        media = json.loads((root / "data" / "media.json").read_text())
        arch = json.loads((root / "data" / "archives.json").read_text())
        by_id = {s["id"]: s for s in styles}

        assert by_id["g900002"]["name"] == "@Test New One" and by_id["g900002"]["presets"] == ["main"]
        assert by_id["g900003"]["name"] == "@Test Second"
        a, b = by_id["g900004-1"], by_id["g900004-2"]
        assert (a["name"], b["name"]) == ("@Pair A (x1)", "@Pair B") and len(a["media"]) == len(b["media"]) == 1
        one = by_id["g900006"]
        assert one["presets"] == ["main", "alt"] and len(one["media"]) == 2, one
        ba, bb = by_id["g900008-1"], by_id["g900008-2"]
        assert ba["presets"] == bb["presets"] == ["main", "alt"] and len(ba["media"]) == len(bb["media"]) == 2
        assert not any(i.startswith(("g900012", "g900013", "g900014")) for i in by_id), "лишние посты попали в архив"
        assert len(by_id) == len(styles0) + 2 + 2 + 1 + 2, len(by_id)
        old = next(s for s in styles if s["id"] == styles0[0]["id"])
        assert "alt" in old["presets"] and "updated_at" in old and len(old["media"]) == len(styles0[0]["media"]) + 1
        for s in styles:
            for m in [*s["media"], *s["reference_media"]]:
                assert m in media, m
        new_ids = sorted(set(media) - set(media0))
        assert len(new_ids) == 11, new_ids  # 1+1+2+2+4 в новые записи и 1 к старой
        for mid in new_ids:
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
