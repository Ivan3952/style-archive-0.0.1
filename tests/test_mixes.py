#!/usr/bin/env python3
"""Проверка tools/import_mixes.py: разбор строк микса и запись на выдуманном экспорте."""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import import_mixes as im  # noqa: E402


def check_parser():
    a, t = im.parse_prompt("@[(b_spa_gyoreva:1.2|suda_ayaka|(big squid man:0.7)], @wengwengchim")
    assert [(x["tag"], x.get("weight"), x.get("group")) for x in a] == [
        ("@b_spa_gyoreva", 1.2, 1), ("@suda_ayaka", None, 1), ("@big squid man", 0.7, 1), ("@wengwengchim", None, None)
    ], a  # скобки в «@[...]» не уравновешены, как в реальном посте: нельзя терять следующего художника
    a, t = im.parse_prompt("(@eleanor (ohmyeleanor):1.4), ((@spearmintaii)), @blackbox (blackbox9158), oil painting \\(medium\\)")
    assert [(x["tag"], x.get("weight")) for x in a] == [
        ("@eleanor (ohmyeleanor)", 1.4), ("@spearmintaii", None), ("@blackbox (blackbox9158)", None)
    ], a
    assert t == [{"tag": "oil painting (medium)"}], t
    a, t = im.parse_prompt("(painterly, brushwork texture:1.4), (@a, @b:1.2), @(c:1.4)")
    assert [x["tag"] for x in t] == ["painterly", "brushwork texture"] and t[0]["weight"] == 1.4
    assert [(x["tag"], x.get("weight")) for x in a] == [("@a", 1.2), ("@b", 1.2), ("@c", 1.4)], a


def msg(mid, date, text="", photo=None, fwd="Автор"):
    m = {"id": mid, "type": "message", "date": date, "text": text, "forwarded_from": fwd}
    if photo:
        m["photo"] = photo
    return m


def check_import():
    tmp = Path(tempfile.mkdtemp(prefix="mix_test_"))
    try:
        root, export = tmp / "site", tmp / "export"
        (root / "data").mkdir(parents=True)
        for f in ("styles.json", "media.json", "archives.json"):
            shutil.copy(ROOT / "data" / f, root / "data" / f)
        (export / "photos").mkdir(parents=True)
        for i in range(1, 6):
            Image.new("RGB", (800, 600), (i * 40, 20, 20)).save(export / "photos" / f"p{i}.jpg")
        known = json.loads((root / "data" / "styles.json").read_text())[0]["name"]
        msgs = [
            msg(10, "2026-11-09T19:22:48", f"Привет!\n🐋🐋🐋\n{known}, @[(x1:1.2)|x2], oil painting (medium)\n🐋#test_mixing🐋", "photos/p1.jpg"),
            msg(11, "2026-11-09T19:22:48", "", "photos/p2.jpg"),
            msg(12, "2026-11-09T19:22:49", "", "photos/p3.jpg"),
            msg(13, "2026-11-09T19:23:00", "просто пост", "photos/p4.jpg"),
            msg(14, "2026-11-10T10:00:00", "#ampreview #main\n🎨 От Имя (#s123)\n@gen1, (@gen2:1.3), 1girl, solo, scene...", "photos/p5.jpg", "Blog"),
        ]
        (export / "result.json").write_text(
            json.dumps({"name": "Мешанины", "id": 7, "messages": msgs}, ensure_ascii=False), encoding="utf-8"
        )
        tool = str(ROOT / "tools" / "import_mixes.py")

        def run(*extra):
            r = subprocess.run([sys.executable, tool, str(export), "--root", str(root), *extra], capture_output=True, text=True)
            assert r.returncode == 0, r.stdout + r.stderr
            return r.stdout

        out = run()
        assert not (root / "data" / "mixes.json").exists(), "dry-run записал файл"
        assert "Миксов к импорту: 2, картинок: 4" in out, out
        run("--apply")
        mixes = json.loads((root / "data" / "mixes.json").read_text())
        by = {m["id"]: m for m in mixes}
        m = by["mix_10"]
        assert len(m["media"]) == 3 and "note" not in m and "title" not in m, m
        assert "Привет" not in json.dumps(m, ensure_ascii=False) and "test_mixing" not in json.dumps(m)
        assert m["artists"][0]["style_id"] is not None and m["artists"][1]["style_id"] is None
        assert [a.get("group") for a in m["artists"]] == [None, 1, 1]
        g = by["mix_14"]
        assert g["origin"] == "generation_post" and g["prompt_raw"] == "@gen1, (@gen2:1.3)" and "#s123" not in json.dumps(g)
        media = json.loads((root / "data" / "media.json").read_text())
        assert all(x in media for mm in mixes for x in mm["media"])
        try:
            import jsonschema
            jsonschema.validate(mixes, json.loads((ROOT / "data" / "schema" / "mixes.schema.json").read_text()))
        except ImportError:
            print("jsonschema не установлен: проверка схемы пропущена")
        snap = (root / "data" / "mixes.json").read_bytes()
        run("--apply")
        assert (root / "data" / "mixes.json").read_bytes() == snap, "повторный запуск изменил данные"
        print("OK: import_mixes")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    check_parser()
    check_import()
