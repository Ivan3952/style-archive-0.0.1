#!/usr/bin/env python3
"""Проверка разбора страниц персонажей (tools/import_characters.py) без сети.

Фикстура tests/fixtures/characters_page.html — фрагменты настоящей страницы Stable Waifu.
Запуск: python3 tests/test_characters.py
"""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("import_characters", ROOT / "tools" / "import_characters.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

html = (ROOT / "tests" / "fixtures" / "characters_page.html").read_text(encoding="utf-8")
characters, links = mod.parse_page(html)
by_name = {c["name"]: c for c in characters}
passed = 0


def check(title, condition, detail=""):
    global passed
    if not condition:
        print(f"FAIL {title} {detail}")
        sys.exit(1)
    passed += 1
    print(f"ok   {title}")


check("секции без картинки и счётчик страниц пропущены", len(characters) == 12, len(characters))

a2 = by_name["A2 (Nier)"]
check("имя и тайтл", (a2["base"], a2["title"]) == ("A2", "Nier"))
check(
    "экранирование и двоеточие в теге сохранены",
    a2["variants"] == [{"label": "", "tags": "1girl, a2 \\(nier:automata\\), android, elbow gloves, black short shorts, black shirt, thigh boots"}],
    a2["variants"],
)
check("картинка", a2["image_src"].endswith("APXyLQdd-a2=w1280"))
check("якорь секции", a2["anchor"] == "h.64ea59c8f851aaf2_6" and by_name["Batman"]["anchor"] == "")

abi = by_name["Abigail Williams (Fate)"]
check("варианты с русскими подписями", [v["label"] for v in abi["variants"]] == ["первое вознесение", "второе вознесение", "купальник (первое вознесение)"])
check("nbsp в имени убран", "Abigail Williams (Fate)" in by_name)

acerola = by_name["Acerola (Pokemon)"]
check("латинская подпись и подпись из разных span", [v["label"] for v in acerola["variants"]] == ["SM", "Master EX осень 2020"])

astartes = by_name["Adeptus Astartes (Warhammer 40k)"]
check("тег, разрезанный между span, склеен; висячая запятая убрана", astartes["variants"][0]["tags"] == "1boy, warhammer 40k, adeptus astartes, power armor")
check("заметка на русском", astartes["notes"] == ["добавьте название части и цвет брони"])

batman = by_name["Batman"]
check("имя без тайтла", (batman["base"], batman["title"]) == ("Batman", ""))

falin = by_name["Falin Touden (Dungeon Meshi)"]
check("подпись без пробела после двоеточия", [v["label"] for v in falin["variants"]] == ["Человек", "Химера"])
check("двойные пробелы в тегах", falin["variants"][0]["tags"] == "1girl, falin touden, tallman, dungeon meshi, brown eyes, white robe")

furina = by_name["Furina (Genshin Impact)"]
check("заменяемые теги — заметки, не варианты", len(furina["variants"]) == 1 and len(furina["notes"]) == 3, furina)

jingliu = by_name["Jingliu (Honkai: Star Rail)"]
check("двоеточие в тайтле не делает подпись", jingliu["variants"][0]["label"] == "" and jingliu["title"] == "Honkai: Star Rail")
check("«<>» в заметке", jingliu["notes"] == ["заменяемые теги: red eyes <> blindfold"])

kid = by_name["Kaitou Kid (Meitantei Conan)"]
check("варианты в нескольких абзацах", [v["label"] for v in kid["variants"]] == ["Фокусник", "повседневный"])

satono = by_name["Satono Diamond (Umamusume)"]
check("двойное двоеточие и хвостовой пробел", [v["label"] for v in satono["variants"]] == ["школа", "Starting Future", "гоночный костюм"])
check("теги варианта с двойным двоеточием", satono["variants"][2]["tags"].startswith("1girl, satono diamond \\(natural brilliance\\)"))

daki = by_name["Daki (Kimetsu no Yaiba)"]
check("строка тегов с русским хвостом — заметка", len(daki["variants"]) == 1 and daki["notes"] == ["white hair, green hair можно заменить на black hair"])

uzui = by_name["Uzui Tengen (Kimetsu no Yaiba)"]
check("опечатка кириллицей в строке «1boy, …» не делает её заметкой", len(uzui["variants"]) == 1 and not uzui["notes"])

check("ссылки собраны", "/view/stable-waifu/characters-am/aam1/aam2" in links)
check("буква по пути", mod.letter_of("/view/stable-waifu/characters-am/aam1/aam2") == "A" and mod.letter_of("/view/stable-waifu/characters-am/numbers-am") == "#")

ids = [dict(name=n) for n in ["Aak (Arknights)", "Aak (Arknights)", "Été"]]
mod.assign_ids(ids, {"ete": "keep-me"})
check("id: дубли получают суффикс", [c["id"] for c in ids[:2]] == ["aak-arknights", "aak-arknights-2"], ids)
ids = [dict(name="Old Name")]
mod.assign_ids(ids, {"old name": "old-id"})
check("id сохраняется из прошлого импорта", ids[0]["id"] == "old-id")

print(f"\n{passed} проверок пройдено")
