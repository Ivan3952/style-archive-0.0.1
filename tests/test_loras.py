#!/usr/bin/env python3
"""Проверка отбора LoRA (tools/import_loras.py) без сети на фикстуре с настоящими ответами CivitAI.

Запуск: python3 tests/test_loras.py
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("import_loras", ROOT / "tools" / "import_loras.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

items = json.loads((ROOT / "tests" / "fixtures" / "civitai_loras.json").read_text(encoding="utf-8"))["items"]
loras, reasons = mod.select(items + items[:2])  # дубли тоже проверим
by_id = {lora["id"]: lora for lora in loras}
passed = 0


def check(title, condition, detail=""):
    global passed
    if not condition:
        print(f"FAIL {title} {detail}")
        sys.exit(1)
    passed += 1
    print(f"ok   {title}")


check("отобраны ровно безопасные и R", sorted(by_id) == sorted([2540444, 2530730, 2400317, 2638819, 2560840]), sorted(by_id))
check("XXX исключён", 929497 not in by_id and reasons.get("выше R") == 1, reasons)
check("minor исключён", 465603 not in by_id and reasons.get("minor") == 1)
check("без безопасных превью исключён", 2640938 not in by_id and reasons.get("нет безопасных превью") == 1)
check("тег nsfw рядом с sfw всё равно исключает", 2718862 not in by_id and reasons.get("взрослые теги") == 1)
check("дубли не повторяются", len(loras) == 5)

ba = by_id[2530730]
check("берётся новая версия с безопасной картинкой", ba["version_id"] == 2949191)
check("только PG-картинки", len(ba["images"]) == 1, ba["images"])
check(
    "картинка уменьшена через CDN",
    ba["images"][0]["url"] == "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/88745feb-cdb2-4993-8021-5b64c1a594b6/width=450/130846892.jpeg",
    ba["images"][0]["url"],
)
check("категория style", ba["category"] == "style")
check("ссылка на версию", ba["url"] == "https://civitai.com/models/2530730?modelVersionId=2949191")

character = by_id[2400317]
check("категория character", character["category"] == "character")
check(
    "триггеры очищены от висячих запятых",
    character["triggers"][1].endswith("black capelet") and character["triggers"][0] == "cure arcana shadow, meitantei precure!",
    character["triggers"],
)

check("технические LoRA отдельно", by_id[2560840]["category"] == "tool")
check("художник = style", by_id[2638819]["category"] == "style")
check("версия 748cm — новая с картинкой", by_id[2638819]["version_id"] == 3020719)
check("старый формат /orig тоже уменьшается", mod.resized("https://image.civitai.com/k/u/orig") == "https://image.civitai.com/k/u/width=450")

print(f"\n{passed} проверок пройдено")
