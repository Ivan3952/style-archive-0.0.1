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
loras, reasons, review = mod.select(items + items[:2])  # дубли тоже проверим
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
    "триггеры: наборы автора сохранены, внутри — отдельные теги",
    character["triggers"][0] == ["cure arcana shadow", "meitantei precure!"] and character["triggers"][1][-1] == "black capelet",
    character["triggers"],)

check("технические LoRA отдельно", by_id[2560840]["category"] == "tool")
check("художник = style", by_id[2638819]["category"] == "style")
check("версия 748cm — новая с картинкой", by_id[2638819]["version_id"] == 3020719)
check("старый формат /orig тоже уменьшается", mod.resized("https://image.civitai.com/k/u/orig") == "https://image.civitai.com/k/u/width=450")

review_ids = {item["id"] for item in review}
check("в пересмотр попадают XXX, без превью и с тегами", review_ids == {929497, 2640938, 2718862}, review_ids)
check("minor в пересмотр не попадает", 465603 not in review_ids)
xxx = next(item for item in review if item["id"] == 929497)
check("в пересмотре только безопасные превью и счётчики", xxx["image_levels"] == {"1": 1} and len(xxx["safe_images"]) == 1, xxx)
check("причина записана", xxx["reason"] == "выше R")

# уровень считается по версиям под Anima, а не по модели целиком
pony_x = {"nsfwLevel": 31, "modelVersions": [
    {"baseModel": "Anima", "nsfwLevel": 7}, {"baseModel": "Pony", "nsfwLevel": 31}]}
check("X только у версии Pony — модель проходит по уровню", mod.anima_level(pony_x) == 7)
two_anima = {"nsfwLevel": 15, "modelVersions": [
    {"baseModel": "Anima", "nsfwLevel": 7}, {"baseModel": "Anima", "nsfwLevel": 15}]}
check("X у любой версии под Anima — модель выше R", mod.anima_level(two_anima) == 15)
check("без уровня у версий — уровень модели", mod.anima_level({"nsfwLevel": 31, "modelVersions": [{"baseModel": "Anima"}]}) == 31)

row = mod.pack(ba)
check("в строке число доп. превью", row[-2] == len(ba["images"]) - 1, row)
row = row
check("компактная строка — массив по FIELDS", isinstance(row, list) and len(row) == len(mod.FIELDS), row)
check("префикс картинки вынесен", row[-3][0] == "88745feb-cdb2-4993-8021-5b64c1a594b6/130846892.jpeg", row[-3])
back = mod.unpack(row)
check("pack/unpack без потерь (кроме версии и лишних картинок)", back == {k: v for k, v in ba.items() if k != "version"} | {"described": []} | {"images": ba["images"][:1]}, back)
check("чужой хост картинки хранится полным URL", mod.pack_image({"url": "https://x.org/a.jpg", "width": 1, "height": 2})[0] == "https://x.org/a.jpg")
check("без картинки", mod.pack({**ba, "images": []})[-3] == 0 and mod.unpack(mod.pack({**ba, "images": []}))["images"] == [])

tr = mod.clean_triggers(["a, B, a", "b, a", "b, " + "x" * 61, ", c ,"] + [f"t{i}, u{i}" for i in range(40)])
check("триггеры: дубли наборов и проза отброшены", tr[:3] == [["a", "B"], ["b"], ["c"]], tr)
check("тег <lora:…> из триггеров убран", mod.clean_triggers(["<lora:momo_ayase:0.8>, momo ayase"]) == [["momo ayase"]])
check("триггеры: не больше 6 наборов", len(tr) == 6, tr)

multi = {**ba, "images": [{"url": f"{mod.IMAGE_PREFIX}u{i}/width=450/{i}.jpeg", "width": 1, "height": 2} for i in range(4)]}
shards = mod.gallery_shards([multi, {**ba, "id": 7}])
check("галерея: без первой картинки, по шарду id % N", shards == {ba["id"] % mod.GALLERY_SHARDS: {str(ba["id"]): [[f"u{i}/{i}.jpeg", 1, 2] for i in (1, 2, 3)]}}, shards)

desc = (
    '<p><strong>Operators:</strong></p><pre><code>\nperlica \\(arknights\\)\nchen qianyu \\(arknights\\)\n\nperlica \\(arknights\\)\n</code></pre>'
    "<p>Settings:</p><pre><code>Steps: 30, CFG: 4, Sampler: euler\n</code></pre>"
    "<pre><code>worst quality, low quality, lowres</code></pre>"
    "<p>trigger <code>arknights &amp; co</code></p>"
)
check(
    "теги из описания: блоки кода, без настроек и негатива",
    mod.described_tags(desc) == ["perlica \\(arknights\\)", "chen qianyu \\(arknights\\)", "arknights & co"],
    mod.described_tags(desc),
)
check("теги из описания: версия первой, без повторов", mod.described_tags("<code>a</code>", "<code>a</code><code>b</code>") == ["a", "b"])

real = json.loads((ROOT / "tests" / "fixtures" / "civitai_description.json").read_text(encoding="utf-8"))
tags = mod.described_tags(*real)
check(
    "реальное описание (пак Arknights: Endfield): 34 персонажа, без примера промпта",
    len(tags) == 34 and tags[0] == "arcane \\(arknights\\)" and "perlica \\(arknights\\)" in tags and not any(len(t.split()) > 4 for t in tags),
    tags,
)

check(
    "мусор из описаний отбрасывается",
    [t for t in ["1.0", "8", "er_sde/simple", "Beta", "DoloresInsect:", "a realistic image of ashley graham", "832x1216", "ProdigyPlusScheduleFree", "4-5 (Anima)", "masterpiece, best quality, absurdres, score_7", "1girl", "ComfyUI/custom_nodes/", "子供っぽい性格で、負けず嫌い。ただ、根は素直。", "I always think of Ikatsuchi", "DPM++ 2M SDE GPU", "beta57", "perlica", "blonde hair,bob cut"] if mod.tag_like(t)] == ["1girl", "perlica", "blonde hair,bob cut"],
)
check(
    "подписи снимаются, конфиги и вес отбрасываются",
    mod.clean_described(["Trigger Words: Bleach Senna", "Weight: 0.8 - 1", "max_steps = 500", "经典造型：hair rings", "perlica \\(arknights\\)"], [])
    == ["Bleach Senna", "hair rings", "perlica \\(arknights\\)"],
    mod.clean_described(["Trigger Words: Bleach Senna", "Weight: 0.8 - 1", "max_steps = 500", "经典造型：hair rings", "perlica \\(arknights\\)"], []),
)
check("теги из описания без дублей триггеров", mod.without_triggers(["a", "a, b", "c"], [["a", "b"]]) == ["c"])

check("ручной блок-лист: 14 id, причина не пересматривается", len(mod.MANUAL_BLOCK) == 14 and mod.reject_reason({"id": 2272678, "type": "LORA"}) == "ручной блок-лист" and "ручной блок-лист" in mod.NEVER_REVIEW)

print(f"\n{passed} проверок пройдено")
