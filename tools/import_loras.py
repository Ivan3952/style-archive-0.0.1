#!/usr/bin/env python3
"""Каталог LoRA под Anima (AM Preview в Stable Waifu) через открытый API CivitAI.

Бот Stable Waifu подключает LoRA прямо из промпта: <lora:ID:0.8>. Для AM Preview подходят только LoRA,
обученные под Anima (baseModel = "Anima" в CivitAI). Этот сборщик собирает их в data/loras.json.

Порядок (на своём ПК, из корня репозитория):
  python3 tools/import_loras.py --pages 2 --inspect 3   # как разобраны первые модели, ничего не пишет
  python3 tools/import_loras.py --probe 1030872         # что API отдаёт про доступность версий одной модели
  python3 tools/import_loras.py                         # пробный прогон: отчёт «добавлено / изменено / пропало»
  python3 tools/import_loras.py --apply                 # записать data/loras.json
  python3 tools/import_loras.py --add-new 3 --apply     # добавить подходящие новые модели с первых трёх страниц
  python3 tools/import_loras.py --from-json models.json # пробный импорт сохранённого ответа API
  python3 tools/import_loras.py --add-ids ID --adult --apply  # добавить проверенный вручную ID в отдельный каталог 18+

Что попадает в каталог (решено 14.11.2026, порог «R»; форматы и платный доступ — 16.11.2026):
  - типы моделей: сейчас только LORA; LoCon и DoRA готовы, но выключены (ENABLED_TYPES), у записи есть поле kind;
  - версии Public и EarlyAccess (платный ранний доступ): для платных access = 1 и until = дата, когда
    версия станет бесплатной. Выбирается новейшая публичная версия с безопасным превью; платная — только
    если у модели нет ни одной бесплатной версии под Anima;
  - все версии под Anima не выше уровня R (nsfwLevel ≤ 7 по шкале CivitAI: 1 PG, 2 PG-13, 4 R,
    8 X, 16 XXX). Уровень модели целиком не годится: он собирает и версии под Pony/Illustrious и т. п.
    (решено 14.11.2026). Если у версий нет nsfwLevel, берётся уровень модели;
  - не помечена как связанная с несовершеннолетними (minor) или реальными людьми (poi);
  - нет «взрослых» тегов (NSFW_TAGS) — даже если рядом стоит «sfw»: при сомнении не показываем;
  - у Anima-версии есть хотя бы одна безопасная картинка (nsfwLevel = 1, не minor/poi): только такие и показываются.
  - для LoRA с подтверждённым рейтингом ниже R достаточно подходящей версии Anima: без PG-превью
    показывается заглушка, а отдельная метка NSFW или взрослый тег не меняет раздел.
Картинки не копируются: сайт показывает их с CDN CivitAI в уменьшенном виде (width=450), у автора, со ссылкой.

Формат API (сверен 14.11.2026, ~6000+ LoRA под Anima): items[].modelVersions[] (новые первыми),
у версии baseModel, trainedWords, images[] с url вида https://image.civitai.com/<key>/<uuid>/original=true/<id>.jpeg.
Постранично: metadata.nextPage (курсор).
"""
from __future__ import annotations

import argparse
import html
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "loras.json"
ADULT_FILE = ROOT / "data" / "loras-adult.json"
BLOCKLIST_FILE = ROOT / "data" / "lora_blocklist.json"
# Исключённое для ручного пересмотра: только локально (в .gitignore, на сайт не копируется).
REVIEW_FILE = ROOT / "data" / "loras_review.json"
# Эти причины не пересматриваются и в файл пересмотра не попадают вообще.
NEVER_REVIEW = {"minor", "реальный человек", "ручной блок-лист"}
# Типы моделей CivitAI, которые берём (по одному запросу на тип): kind -> код в файле.
TYPES = {"LORA": "lora", "LoCon": "locon", "DoRA": "dora"}
KIND_CODES = ["lora", "locon", "dora"]
# Что реально берётся в каталог. LoCon и DoRA включаются, когда выяснится, работают ли они в боте
# Stable Waifu по тому же <lora:ID:вес>: добавить "LoCon", "DoRA" в кортеж.
ENABLED_TYPES = ("LORA",)
API_URL = (
    "https://civitai.com/api/v1/models?types={type}&baseModels=Anima"
    "&sort=Most%20Downloaded&limit=100"
)
PUBLIC = "Public"
EARLY = "EarlyAccess"  # платный ранний доступ: бесплатной версия станет к earlyAccessEndsAt
AVAILABLE = (PUBLIC, EARLY)
USER_AGENT = "StyleArchiveImporter/1.0 (+https://stylearchive.art)"
REQUEST_DELAY = 1.0
BASE_MODEL = "Anima"

MAX_MODEL_LEVEL = 7  # порог «R»
SAFE_IMAGE_LEVEL = 1  # превью только PG
IMAGE_WIDTH = 450
MAX_REVIEW_IMAGES = 10  # объём примеров в локальном отчёте, не лимит галереи
MAX_TAGS = 8
MAX_TRIGGERS = 32  # тегов во всех наборах вместе
MAX_TRIGGER_LEN = 60
MAX_TRIGGER_GROUPS = 6
LORA_TAG = re.compile(r"^<\s*lora\s*:", re.I)

NSFW_TAGS = {
    "nsfw", "hentai", "porn", "nude", "nudity", "naked", "sex", "sexual", "erotic", "ecchi", "lewd",
    "breasts", "nipples", "pussy", "penis", "anus", "puckered anus", "ass", "butt", "cum", "ahegao",
    "lingerie", "underwear", "panties", "bdsm", "fetish", "futanari", "loli", "shota", "pregnant",
    "thighs slider", "hips slider", "breast slider", "big breasts", "huge breasts",
}
NSFW_NAME = re.compile(r"\b(nsfw|hentai|porn|nude|lewd|ecchi|sex)\b", re.I)

# категория по тегам; порядок важен: технические LoRA часто помечены и как «style»
CATEGORIES = (
    ("tool", {"tool", "slider", "enhancer", "detailer", "detail", "quality", "turbo", "distill",
              "distillation", "base model", "dmd2", "lcm", "optimizer", "colorfix", "assets"}),
    ("character", {"character", "game character", "vtuber", "characters", "anime character", "oc"}),
    ("style", {"style", "styles", "artist style", "art style", "artstyle", "artist", "painterly",
               "illustration style"}),
    ("concept", {"concept", "clothing", "pose", "background", "lighting", "outfit", "costume",
                 "scenery", "effect", "effects"}),
)


# ---------------------------------------------------------------- разбор


def anima_versions(model: dict) -> list[dict]:
    """Версии под Anima: бесплатные и в платном раннем доступе (Private и прочие не берём)."""
    return [
        v for v in model.get("modelVersions") or []
        if v.get("baseModel") == BASE_MODEL and v.get("availability", PUBLIC) in AVAILABLE
    ]


def anima_level(model: dict) -> int:
    """Самый высокий nsfwLevel среди версий под Anima: бот сам выбирает версию,
    поэтому ни одна из них не должна быть выше порога. Без поля у версий — уровень модели."""
    levels = [v.get("nsfwLevel") for v in anima_versions(model)]
    if levels and all(isinstance(level, int) for level in levels):
        return max(levels)
    return model.get("nsfwLevel") or 0


def anima_version(model: dict) -> dict | None:
    """Самая новая бесплатная версия под Anima с безопасными картинками; если бесплатных нет вовсе —
    самая новая платная (ранний доступ). Так записи, которые уже в каталоге, не меняются."""
    versions = anima_versions(model)
    for pool in (
        [v for v in versions if v.get("availability", PUBLIC) == PUBLIC],
        [v for v in versions if v.get("availability") == EARLY],
    ):
        for version in pool:
            if safe_images(version):
                return version
        if pool:
            return pool[0]
    return None


def early_ends(version: dict) -> str:
    """Дата (ГГГГ-ММ-ДД), когда ранний доступ закончится, если он ещё идёт; иначе пустая строка.
    API может отдавать availability=Public и при этом earlyAccessEndsAt в будущем (так и было замечено
    у платной LoRA 1030872), поэтому смотрим на дату, а не только на availability."""
    raw = version.get("earlyAccessEndsAt") or ""
    try:
        ends = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return ""
    if ends.tzinfo is None:
        ends = ends.replace(tzinfo=dt.timezone.utc)
    return raw[:10] if ends > dt.datetime.now(dt.timezone.utc) else ""


def is_early(version: dict) -> bool:
    return version.get("availability") == EARLY or bool(early_ends(version))


def safe_images(version: dict) -> list[dict]:
    return [
        image for image in version.get("images") or []
        if image.get("nsfwLevel") == SAFE_IMAGE_LEVEL
        and image.get("type", "image") == "image"
        and not image.get("minor")
        and not image.get("poi")
        and image.get("url")
    ]


def resized(url: str) -> str:
    """original=true (или иной размер) -> width=450: CDN CivitAI отдаёт уменьшенную копию."""
    new, count = re.subn(r"/(original=true|width=\d+)(?=/)", f"/width={IMAGE_WIDTH}", url)
    if count:
        return new
    return re.sub(r"/orig$", f"/width={IMAGE_WIDTH}", url)


def load_blocklist() -> set[int]:
    if not BLOCKLIST_FILE.exists():
        return set()
    return {int(k) for k in json.loads(BLOCKLIST_FILE.read_text(encoding="utf-8")).get("ids", {})}


MANUAL_BLOCK = load_blocklist()


def restricted_subject(model: dict, versions: list[dict]) -> bool:
    if any(
        entry.get("minor") or entry.get("poi")
        for version in versions
        for entry in (version, *(version.get("images") or []))
    ):
        return True
    labels = " ".join([model.get("name") or "", *map(str, model.get("tags") or [])])
    return bool(re.search(r"\b(?:minor|underage|loli(?:con)?|shota(?:con)?)\b", labels.replace("_", " "), re.I))


def below_r_standard(model: dict) -> bool:
    if (
        model.get("type") not in ENABLED_TYPES
        or model.get("id") in MANUAL_BLOCK
        or model.get("minor")
        or model.get("poi")
    ):
        return False
    versions = anima_versions(model)
    levels = [version.get("nsfwLevel", model.get("nsfwLevel")) for version in versions]
    # 1 = PG, 2 = PG-13, 3 = обе отметки; значение 0 означает неизвестный рейтинг.
    return bool(levels) and all(type(level) is int and 1 <= level <= 3 for level in levels) and not restricted_subject(model, versions)


def reject_reason(model: dict) -> str | None:
    if model.get("type") not in ENABLED_TYPES:
        return "не LoRA"
    if model.get("id") in MANUAL_BLOCK:
        return "ручной блок-лист"
    if model.get("minor"):
        return "minor"
    if model.get("poi"):
        return "реальный человек"
    if below_r_standard(model):
        return None
    if model.get("nsfw"):
        return "nsfw"
    if anima_level(model) > MAX_MODEL_LEVEL:
        return "выше R"
    tags = {str(tag).strip().lower() for tag in model.get("tags") or []}
    if tags & NSFW_TAGS:
        return "взрослые теги"
    if NSFW_NAME.search(model.get("name") or ""):
        return "взрослое название"
    version = anima_version(model)
    if not version:
        return "нет версии под Anima"
    if not safe_images(version):
        return "нет безопасных превью"
    return None


def category_of(tags: list[str]) -> str:
    lowered = {tag.lower() for tag in tags}
    for name, keys in CATEGORIES:
        if lowered & keys:
            return name
    return "other"


def clean_triggers(words: list[str]) -> list[list[str]]:
    """Триггеры — наборами, как их ввёл автор: каждая строка trainedWords — отдельный набор
    (часто это разные образы персонажа или альтернативные токены). Внутри набора — отдельные
    теги без дублей; повторы целых наборов и описания прозой отбрасываются."""
    groups, seen_groups, total = [], set(), 0
    for word in words or []:
        group, seen = [], set()
        for part in str(word).split(","):
            text = re.sub(r"\s+", " ", part).strip()
            # некоторые авторы вписывают в триггеры собственный тег <lora:файл:вес> — это не триггер
            if not text or len(text) > MAX_TRIGGER_LEN or text.lower() in seen or LORA_TAG.match(text):
                continue
            seen.add(text.lower())
            group.append(text)
        key = frozenset(seen)
        if not group or key in seen_groups:
            continue
        group = group[: max(0, MAX_TRIGGERS - total)]
        if not group:
            break
        seen_groups.add(key)
        groups.append(group)
        total += len(group)
        if len(groups) >= MAX_TRIGGER_GROUPS:
            break
    return groups


def gallery_images(model: dict, version: dict) -> list[dict]:
    """Безопасные картинки выбранной версии, затем других публичных версий под Anima; без повторов."""
    versions = [version] + [
        v for v in anima_versions(model)
        if v is not version and is_early(v) == is_early(version)
    ]
    out, seen = [], set()
    for v in versions:
        for image in safe_images(v):
            if image["url"] in seen:
                continue
            seen.add(image["url"])
            out.append(image)
    return out


# ---------------------------------------------------------------- теги из описания

# Паки персонажей и многие LoRA не заполняют поле триггеров, а пишут теги в описании блоками кода.
MAX_DESCRIBED = 48
SETTINGS_LINE = re.compile(
    r"\b(steps?|cfg|sampler|scheduler|seed|clip ?skip|denoise|hires|upscale|resolution|negative)\b\s*[:=]?|\d+\s*x\s*\d+",
    re.I,
)
SAMPLER_WORDS = {
    "euler", "euler a", "euler_a", "euler ancestral", "dpm", "dpmpp", "dpm++", "karras", "exponential",
    "simple", "beta", "normal", "sgm_uniform", "ddim", "uni_pc", "lcm", "heun", "er_sde", "res_multistep",
}


QUALITY_TAGS = {
    "masterpiece", "best quality", "high quality", "good quality", "normal quality", "amazing quality",
    "very aesthetic", "aesthetic", "absurdres", "highres", "newest", "recent", "year 2025", "year 2024", "safe",
}


def strip_label(text: str) -> str:
    """«Trigger Words: x» / «经典造型：x» -> «x»; подписи веса и строки конфигов (a = b) -> ""."""
    text = text.strip()
    if "=" in text:
        return ""
    match = re.match(r"^([^:：,]{1,30})[:：]\s*(.+)$", text)
    if match and len(match.group(1).split()) <= 3 and not re.search(r"\\\(", match.group(1)):
        if re.search(r"weight|strength|вес|权重|強度", match.group(1), re.I):
            return ""
        return match.group(2).strip()
    return text


def clean_described(items: list[str], triggers: list[list[str]]) -> list[str]:
    out, seen = [], set()
    for item in items:
        item = strip_label(item)
        if tag_like(item) and item.lower() not in seen:
            seen.add(item.lower())
            out.append(item)
    return without_triggers(out, triggers)


def tag_like(text: str) -> bool:
    """Похоже ли на тег промпта: не число/настройка, не заголовок «Имя:», не фраза."""
    low = text.lower().strip()
    if not low or len(text) > MAX_TRIGGER_LEN or LORA_TAG.match(text):
        return False
    if re.fullmatch(r"[\d\s.,:/x×*+\-]+", low):  # 1.0, 8, 832x1216
        return False
    if low.endswith(":") or SETTINGS_LINE.search(text):
        return False
    if re.search(r"dpm\+\+|\b(euler|karras|sde|ddim|unipc|beta\d+)\b", low):
        return False
    if any(word in SAMPLER_WORDS for word in re.split(r"[\s/,]+", low)) and len(low.split()) <= 2:
        return False
    if re.match(r"\d", low) and not re.match(r"\d+\+?(girl|boy|other)s?\b", low):  # 4-5 (Anima), 2.0 weight
        return False
    if re.search(r"\b(prodigy|adamw|adafactor|lion|came|schedulefree|lycoris|locon|dora|epochs?|dim|alpha)\b|scheduleFree", low, re.I):
        return False
    if re.search(r"[。！？]|https?:|\w/\S*/", text) or (re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", text) and len(text) > 24):
        return False  # проза на японском/китайском, ссылки, пути к файлам
    parts = [part.strip() for part in low.split(",") if part.strip()]
    if parts and all(part in QUALITY_TAGS or part.startswith("score_") for part in parts):
        return False
    return all(len(part.split()) <= 4 for part in text.split(","))


NEGATIVE_HINTS = ("worst quality", "low quality", "lowres", "bad anatomy", "bad hands", "jpeg artifacts", "watermark")


def described_tags(*descriptions: str) -> list[str]:
    """Теги из блоков кода (<pre>, <code>) описания: по строке на тег; строки настроек генерации
    и негативных промптов отбрасываются. Порядок авторский, без повторов."""
    out, seen = [], set()
    for description in descriptions:
        text = description or ""
        blocks = re.findall(r"<pre[^>]*>(.*?)</pre>", text, re.S | re.I)
        text = re.sub(r"<pre[^>]*>.*?</pre>", " ", text, flags=re.S | re.I)
        blocks += re.findall(r"<code[^>]*>(.*?)</code>", text, re.S | re.I)
        # пункты списка вида «имя \\(тайтл\\)» — так часто пишут новых персонажей в описании версии
        blocks += [
            item for item in re.findall(r"<li[^>]*>(.*?)</li>", text, re.S | re.I)
            if re.search(r"\\\(", item) and len(re.sub(r"<[^>]+>", "", item)) <= MAX_TRIGGER_LEN
        ]
        for block in blocks:
            plain = html.unescape(re.sub(r"<[^>]+>", "\n", block))
            if any(hint in plain.lower() for hint in NEGATIVE_HINTS):
                continue
            for line in plain.splitlines():
                line = re.sub(r"\s+", " ", line).strip().strip(",").strip()
                line = strip_label(line)
                if not line or SETTINGS_LINE.search(line) or LORA_TAG.match(line) or line.endswith(":"):
                    continue
                if len(line) <= MAX_TRIGGER_LEN:
                    parts = [line]
                else:
                    parts = [p.strip() for p in line.split(",")]
                    # длинная строка из коротких тегов — это теги; если части — фразы, это пример промпта
                    if any(len(p.split()) > 4 for p in parts):
                        continue
                for part in parts:
                    if tag_like(part) and part.lower() not in seen:
                        seen.add(part.lower())
                        out.append(part)
                        if len(out) >= MAX_DESCRIBED:
                            return out
    return out


def without_triggers(described: list[str], triggers: list[list[str]]) -> list[str]:
    """Теги из описания, которых нет среди триггеров (иначе раздел дублирует триггеры)."""
    known = {tag.lower() for group in triggers for tag in group}
    out = []
    for item in described:
        parts = [part.strip().lower() for part in item.split(",") if part.strip()]
        if parts and all(part in known for part in parts):
            continue
        out.append(item)
    return out


def convert(model: dict, *, previews: bool = True) -> dict:
    version = anima_version(model)
    images = gallery_images(model, version) if previews else []
    tags = [str(tag).strip() for tag in model.get("tags") or [] if str(tag).strip()]
    stats = model.get("stats") or {}
    return {
        "id": model["id"],
        "version_id": version["id"],
        "version": version.get("name") or "",
        "name": re.sub(r"\s+", " ", model.get("name") or "").strip(),
        "category": category_of(tags),
        "kind": TYPES.get(model.get("type"), "lora"),
        "access": 1 if is_early(version) else 0,
        "until": (version.get("earlyAccessEndsAt") or "")[:10] if is_early(version) else "",
        "tags": tags[:MAX_TAGS],
        "creator": (model.get("creator") or {}).get("username") or "",
        "downloads": stats.get("downloadCount") or 0,
        "likes": stats.get("thumbsUpCount") or 0,
        "published": (version.get("publishedAt") or "")[:10],
        "triggers": (triggers := clean_triggers(version.get("trainedWords"))),
        "described": clean_described(
            described_tags(version.get("description") or "", model.get("description") or ""), triggers
        ),
        "images": [
            {
                "url": resized(image["url"]),
                "width": image.get("width") or 0,
                "height": image.get("height") or 0,
            }
            for image in images
        ],
        "url": f"https://civitai.com/models/{model['id']}?modelVersionId={version['id']}",
    }


# ---------------------------------------------------------------- компактный формат файла

# Формат 2: каждая LoRA — массив значений в порядке FIELDS (без повторения ключей),
# одна картинка (на карточке показывается только первая), общий префикс URL картинок вынесен.
FORMAT = 2
FIELDS = ["id", "version_id", "name", "category", "tags", "creator", "downloads", "likes", "published", "triggers", "image", "more", "described", "kind", "access", "until"]
# Галерея: остальные превью раскладываются по GALLERY_SHARDS файлам (id % N): окно просмотра
# грузит один небольшой файл, а не все картинки каталога сразу.
GALLERY_DIR = ROOT / "data" / "loras-gallery"
ADULT_GALLERY_DIR = ROOT / "data" / "loras-adult-gallery"
GALLERY_SHARDS = 100
CATEGORY_CODES = ["character", "style", "concept", "tool", "other"]
IMAGE_PREFIX = "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"


def pack_image(image: dict | None):
    """{url,width,height} -> ["uuid/123.jpeg", w, h]; если префикс другой — полный URL."""
    if not image:
        return 0
    url = image["url"]
    marker = f"/width={IMAGE_WIDTH}/"
    if url.startswith(IMAGE_PREFIX) and marker in url:
        url = url[len(IMAGE_PREFIX):].replace(marker, "/", 1)
    return [url, image.get("width") or 0, image.get("height") or 0]


def unpack_image(packed) -> dict | None:
    if not packed:
        return None
    url, width, height = packed
    if not url.startswith("http"):
        uuid, _, file = url.rpartition("/")
        url = f"{IMAGE_PREFIX}{uuid}/width={IMAGE_WIDTH}/{file}"
    return {"url": url, "width": width, "height": height}


def pack(lora: dict) -> list:
    return [
        lora["id"],
        lora["version_id"],
        lora["name"],
        CATEGORY_CODES.index(lora["category"]) if lora["category"] in CATEGORY_CODES else lora["category"],
        lora["tags"],
        lora["creator"],
        lora["downloads"],
        lora["likes"],
        lora["published"],
        lora["triggers"],
        pack_image(lora["images"][0] if lora["images"] else None),
        max(0, len(lora["images"]) - 1),
        lora.get("described") or 0,
        KIND_CODES.index(lora.get("kind", "lora")),
        lora.get("access") or 0,
        lora.get("until") or 0,
    ]


def unpack(row: list) -> dict:
    item = dict(zip(FIELDS, row))
    if isinstance(item["category"], int):
        item["category"] = CATEGORY_CODES[item["category"]]
    image = unpack_image(item.pop("image"))
    item.pop("more", None)
    item["kind"] = KIND_CODES[item["kind"]] if isinstance(item.get("kind"), int) else "lora"
    item["access"] = item.get("access") or 0
    item["until"] = item.get("until") or ""
    item["described"] = item.get("described") or []
    item["images"] = [image] if image else []
    item["url"] = f"https://civitai.com/models/{item['id']}?modelVersionId={item['version_id']}"
    return item


def gallery_shards(loras: list[dict]) -> dict[int, dict]:
    shards: dict[int, dict] = {}
    for lora in loras:
        if len(lora["images"]) > 1:
            shards.setdefault(lora["id"] % GALLERY_SHARDS, {})[str(lora["id"])] = [
                pack_image(image) for image in lora["images"][1:]
            ]
    return shards


def write_gallery(loras: list[dict]) -> int:
    GALLERY_DIR.mkdir(parents=True, exist_ok=True)
    for old in GALLERY_DIR.glob("*.json"):
        old.unlink()
    shards = gallery_shards(loras)
    for index, shard in shards.items():
        (GALLERY_DIR / f"{index}.json").write_text(
            json.dumps(shard, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    return sum(len(path.read_bytes()) for path in GALLERY_DIR.glob("*.json"))


def review_entry(model: dict, reason: str) -> dict:
    """Исключённая модель для пересмотра: только безопасные превью и счётчики картинок по уровням."""
    version = next(
        (v for v in model.get("modelVersions") or [] if v.get("baseModel") == BASE_MODEL), None
    ) or {}
    levels: dict[str, int] = {}
    for image in version.get("images") or []:
        key = str(image.get("nsfwLevel"))
        levels[key] = levels.get(key, 0) + 1
    tags = [str(tag).strip() for tag in model.get("tags") or [] if str(tag).strip()]
    return {
        "id": model.get("id"),
        "version_id": version.get("id"),
        "name": re.sub(r"\s+", " ", model.get("name") or "").strip(),
        "reason": reason,
        "model_level": model.get("nsfwLevel"),
        "anima_level": anima_level(model),
        "category": category_of(tags),
        "tags": tags[:MAX_TAGS],
        "creator": (model.get("creator") or {}).get("username") or "",
        "downloads": (model.get("stats") or {}).get("downloadCount") or 0,
        "image_levels": levels,
        "safe_images": [
            {"url": resized(image["url"]), "width": image.get("width") or 0, "height": image.get("height") or 0}
            for image in safe_images(version)[:MAX_REVIEW_IMAGES]
        ],
        "url": f"https://civitai.com/models/{model.get('id')}"
        + (f"?modelVersionId={version['id']}" if version.get("id") else ""),
    }


def select(models: list[dict]) -> tuple[list[dict], dict, list[dict]]:
    kept, reasons, review, seen = [], {}, [], set()
    for model in models:
        if model.get("id") in seen:
            continue
        seen.add(model.get("id"))
        reason = reject_reason(model)
        if reason:
            reasons[reason] = reasons.get(reason, 0) + 1
            if reason not in NEVER_REVIEW:
                review.append(review_entry(model, reason))
            continue
        kept.append(convert(model))
    return kept, reasons, review


# ---------------------------------------------------------------- загрузка


def fetch_json(url: str, retries: int = 4) -> dict:
    last_error = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code == 429:  # просят подождать — ждём дольше
                time.sleep(30 * (attempt + 1))
                continue
            if error.code in (401, 403, 404):
                raise RuntimeError(f"HTTP {error.code}: {url}") from error
            time.sleep(5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"не удалось получить {url}: {last_error}")


def crawl(max_pages: int | None) -> list[dict]:
    """По одному обходу на тип модели (LORA, LoCon, DoRA); --pages ограничивает каждый обход."""
    models = []
    for api_type in ENABLED_TYPES:
        url, pages, got = API_URL.format(type=api_type), 0, 0
        while url and (max_pages is None or pages < max_pages):
            data = fetch_json(url)
            pages += 1
            items = data.get("items") or []
            models.extend(items)
            got += len(items)
            print(f"  {api_type}, страница {pages}: {len(items)} (тип: {got}, всего {len(models)})", file=sys.stderr)
            url = (data.get("metadata") or {}).get("nextPage")
            time.sleep(REQUEST_DELAY)
    return models


# ---------------------------------------------------------------- отчёт и запись


def load_previous() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    rows = json.loads(DATA_FILE.read_text(encoding="utf-8")).get("loras", [])
    return [unpack(row) if isinstance(row, list) else row for row in rows]


def adult_eligible(model: dict) -> bool:
    """Только явно отмеченные модели, отдельно проверенные редактором по ID."""
    if reject_reason(model) not in {"nsfw", "выше R", "взрослые теги", "взрослое название"}:
        return False
    versions = anima_versions(model)
    return bool(versions) and not restricted_subject(model, versions)


def cdn_previews(images: list[dict]) -> list[dict]:
    previews = []
    for image in images:
        url = urllib.parse.urlsplit(image["url"])
        if url.scheme == "https" and url.netloc == "image.civitai.com":
            previews.append({"url": resized(image["url"]), "width": image.get("width") or 0,
                             "height": image.get("height") or 0})
    return previews


def write_json(path: Path, payload: dict) -> None:
    temp = path.with_suffix(".json.tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temp.replace(path)


def catalog_payload(loras: list[dict]) -> dict:
    return {
        "source": "https://civitai.com (open API, baseModel Anima)",
        "kinds": KIND_CODES,
        "updated_at": dt.date.today().isoformat(),
        "count": len(loras),
        "format": FORMAT,
        "fields": FIELDS,
        "categories": CATEGORY_CODES,
        "image_prefix": IMAGE_PREFIX,
        "image_width": IMAGE_WIDTH,
        "gallery_shards": GALLERY_SHARDS,
        "loras": [pack(lora) for lora in loras],
    }


def remove_from_adult(ids: set[int]) -> int:
    if not ids or not ADULT_FILE.exists():
        return 0
    payload = json.loads(ADULT_FILE.read_text(encoding="utf-8"))
    if not payload["loras"]:
        return 0
    i = payload["fields"].index("id")
    rows = [row for row in payload["loras"] if row[i] not in ids]
    removed = len(payload["loras"]) - len(rows)
    if removed:
        payload.update(loras=rows, count=len(rows), updated_at=dt.date.today().isoformat())
        write_json(ADULT_FILE, payload)
    return removed


def add_entries(models: list[dict], *, adult: bool, apply: bool) -> int:
    path = ADULT_FILE if adult else DATA_FILE
    payload = json.loads(path.read_text(encoding="utf-8")) if path.exists() else catalog_payload([])
    if not payload.get("fields") and not payload["loras"]:
        payload = catalog_payload([])
    fields = payload["fields"]
    id_index = fields.index("id")
    known = {row[id_index] for row in payload["loras"]}
    if adult:
        known.update(lora["id"] for lora in load_previous())
    additions = []
    for model in models:
        if model["id"] in known:
            continue
        if not (adult_eligible(model) if adult else reject_reason(model) is None):
            continue
        known.add(model["id"])
        entry = convert(model, previews=not adult)
        if adult:
            entry["images"] = cdn_previews(safe_images(anima_version(model)))
        additions.append(entry)
    print(f"Получено моделей: {len(models)}, новые подходящие записи: {len(additions)}")
    for lora in additions:
        print(f"  {lora['id']} · {lora['name']}")
    if not apply:
        return 0
    promoted = {model["id"] for model in models if not adult and below_r_standard(model)}
    if not additions:
        remove_from_adult(promoted & known)
        return 0

    for field in FIELDS:
        if field not in fields:
            fields.append(field)
    for lora in additions:
        packed = dict(zip(FIELDS, pack(lora)))
        payload["loras"].append([packed[field] for field in fields])

    gallery_dir = ADULT_GALLERY_DIR if adult else GALLERY_DIR
    for index, entries in gallery_shards(additions).items():
        gallery_dir.mkdir(parents=True, exist_ok=True)
        shard_path = gallery_dir / f"{index}.json"
        shard = json.loads(shard_path.read_text(encoding="utf-8")) if shard_path.exists() else {}
        write_json(shard_path, {**shard, **entries})
    payload["updated_at"] = dt.date.today().isoformat()
    payload["count"] = len(payload["loras"])
    write_json(path, payload)
    if promoted:
        print(f"Перенесено из 18+: {remove_from_adult(promoted & known)}")
    return 0


def newest_models(max_pages: int) -> list[dict]:
    url = API_URL.format(type="LORA").replace("Most%20Downloaded", "Newest") + "&nsfw=false"
    models = []
    for _ in range(max_pages):
        if not url:
            break
        page = fetch_json(url)
        models.extend(page["items"])
        url = (page.get("metadata") or {}).get("nextPage")
        if url:
            time.sleep(REQUEST_DELAY)
    return models


def models_from_files(paths: list[Path], ids: list[int] | None) -> list[dict]:
    models = []
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        if isinstance(data, dict) and "items" in data:
            batch = data["items"]
        elif isinstance(data, dict) and "modelVersions" in data:
            batch = [data]
        else:
            raise ValueError(f"{path}: ожидается страница API CivitAI (items) или отдельная модель")
        if not isinstance(batch, list) or any(
            not isinstance(model, dict) or type(model.get("id")) is not int or model["id"] < 1
            for model in batch
        ):
            raise ValueError(f"{path}: некорректный список моделей или ID")
        models.extend(batch)
    if not ids:
        return models
    requested = set(ids)
    missing = requested - {model["id"] for model in models}
    if missing:
        raise ValueError("ID отсутствуют в файлах: " + ", ".join(map(str, sorted(missing))))
    return [model for model in models if model["id"] in requested]


def models_from_preview_results(path: Path):
    with path.open(encoding="utf-8-sig") as file:
        for number, line in enumerate(file, 1):
            try:
                row = json.loads(line)
                model_id, version_id, images = row["model_id"], row["version_id"], row["images"]
                if (
                    any(type(value) is not int or value < 1 for value in (model_id, version_id))
                    or not isinstance(images, list)
                    or any(not isinstance(image, dict) for image in images)
                ):
                    raise ValueError("некорректный ID или список кадров")
            except (ValueError, KeyError, TypeError) as error:
                raise ValueError(f"{path}:{number}: {error}") from error
            yield {"id": model_id, "modelVersions": [
                {"id": version_id, "baseModel": BASE_MODEL, "images": images},
            ]}


def refresh_previews(paths: list[Path], *, apply: bool, preview_results: bool = False) -> int:
    """Дополняет галереи только уже отобранных моделей, сохраняя обложки и порядок."""
    for path, directory in ((DATA_FILE, GALLERY_DIR), (ADULT_FILE, ADULT_GALLERY_DIR)):
        if not path.exists():
            continue
        catalog = json.loads(path.read_text(encoding="utf-8"))
        if not catalog["loras"]:
            continue
        fields = {name: i for i, name in enumerate(catalog["fields"])}
        rows = {row[fields["id"]]: row for row in catalog["loras"]}
        image_index, more_index = fields["image"], fields["more"]
        shard_count = catalog.get("gallery_shards", GALLERY_SHARDS)
        shards = {}
        changed = set()
        added = filled = 0
        matched = set()

        for source in paths:
            models = models_from_preview_results(source) if preview_results else models_from_files([source], None)
            for model in models:
                model_id = model["id"]
                row = rows.get(model_id)
                if row is None:
                    continue
                version = next((v for v in anima_versions(model) if v["id"] == row[fields["version_id"]]), None)
                if version is None:
                    continue
                matched.add(model_id)
                previews = cdn_previews(safe_images(version) if path == ADULT_FILE else gallery_images(model, version))
                index = model_id % shard_count
                if index not in shards:
                    file = directory / f"{index}.json"
                    shards[index] = json.loads(file.read_text(encoding="utf-8")) if file.exists() else {}
                extras = shards[index].get(str(model_id), [])
                images = ([row[image_index]] if row[image_index] else []) + extras
                urls = {unpack_image(packed)["url"] for packed in images}
                for image in previews:
                    if image["url"] not in urls:
                        images.append(pack_image(image))
                        urls.add(image["url"])
                        added += 1
                        changed.add(index)
                if not row[image_index] and images:
                    filled += 1
                row[image_index] = images[0] if images else 0
                row[more_index] = max(0, len(images) - 1)
                if images[1:] != extras:
                    shards[index][str(model_id)] = images[1:]
                    changed.add(index)

        print(
            f"{path.name}: совпали версии у {len(matched)} из {len(rows)} моделей; "
            f"добавлено кадров {added}, заполнено пустых карточек {filled}, "
            f"без превью {sum(not row[image_index] for row in rows.values())}"
        )
        if apply:
            if changed:
                directory.mkdir(parents=True, exist_ok=True)
            for index in sorted(changed):
                write_json(directory / f"{index}.json", shards[index])
            write_json(path, catalog)
    return 0


def refresh_access(paths: list[Path], *, apply: bool) -> int:
    for catalog_file in (DATA_FILE, ADULT_FILE):
        if not catalog_file.exists():
            continue
        catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
        if not catalog["loras"]:
            continue
        fields = catalog["fields"]
        rows = {row[fields.index("id")]: row for row in catalog["loras"]}
        version_index = fields.index("version_id")
        updates = {}
        for path in paths:
            for model in models_from_files([path], None):
                row = rows.get(model["id"])
                if not row:
                    continue
                version = next((v for v in anima_versions(model) if v["id"] == row[version_index]), None)
                if not version:
                    continue
                if version.get("availability") != EARLY:
                    # В выдаче моделей CivitAI может быть Public без полей раннего доступа.
                    try:
                        dt.datetime.fromisoformat((version.get("earlyAccessEndsAt") or "").replace("Z", "+00:00"))
                    except ValueError:
                        continue
                updates[model["id"]] = (int(is_early(version)), early_ends(version) or 0)
        if not updates:
            print(f"{catalog_file.name}: подтверждённых обновлений доступа нет")
            continue
        for field in ("access", "until"):
            if field not in fields:
                fields.append(field)
        access_idx, until_idx = fields.index("access"), fields.index("until")
        changed = 0
        for model_id, (access, until) in updates.items():
            row = rows[model_id]
            current = [row[index] if index < len(row) else 0 for index in (access_idx, until_idx)]
            if current == [access, until]:
                continue
            row.extend([0] * (len(fields) - len(row)))
            row[access_idx], row[until_idx] = access, until
            changed += 1
        print(f"{catalog_file.name}: проверено {len(updates)}, платных {sum(x[0] for x in updates.values())}, изменено {changed}")
        if apply and changed:
            write_json(catalog_file, catalog)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--apply", action="store_true", help="записать data/loras.json")
    ap.add_argument("--pages", type=int, help="не больше N страниц по 100 (для проверки)")
    ap.add_argument("--inspect", type=int, metavar="N", help="показать первые N отобранных и выйти")
    ap.add_argument("--probe", type=int, metavar="ID", help="показать, что API отдаёт про доступность версий модели ID, и выйти")
    ap.add_argument("--force", action="store_true", help="записать, даже если LoRA стало заметно меньше")
    add = ap.add_mutually_exclusive_group()
    add.add_argument("--add-ids", nargs="+", type=int, metavar="ID", help="добавить конкретные модели без удаления старых")
    add.add_argument("--add-new", type=int, metavar="PAGES", help="добавить новые обычные LoRA с указанного числа страниц")
    ap.add_argument("--from-json", action="append", type=Path, metavar="FILE",
                    help="взять модели из сохранённого ответа API CivitAI без сети; можно повторить")
    ap.add_argument("--refresh-previews", action="store_true", help="дополнить галереи обоих каталогов из --from-json")
    ap.add_argument("--refresh-access", action="store_true", help="обновить платность известных версий из --from-json")
    ap.add_argument("--preview-results", action="append", type=Path, metavar="JSONL",
                    help="дополнить галереи результатами export_civitai_previews.py; можно повторить")
    ap.add_argument("--adult", action="store_true", help="каталог 18+ с PG-превью под спойлером; только одобренные --add-ids")
    args = ap.parse_args()
    if args.refresh_access:
        if not args.from_json or any((args.preview_results, args.refresh_previews, args.add_ids,
                                      args.add_new is not None, args.adult, args.probe, args.inspect,
                                      args.pages, args.force)):
            ap.error("--refresh-access требует --from-json и совместим только с --apply")
        try:
            return refresh_access(args.from_json, apply=args.apply)
        except (OSError, ValueError, KeyError, TypeError) as error:
            print(error, file=sys.stderr)
            return 1
    if args.preview_results:
        if any((args.from_json, args.refresh_previews, args.add_ids, args.add_new is not None,
                args.adult, args.probe, args.inspect, args.pages, args.force)):
            ap.error("--preview-results совместим только с --apply")
        try:
            return refresh_previews(args.preview_results, apply=args.apply, preview_results=True)
        except (OSError, ValueError, KeyError, TypeError) as error:
            print(error, file=sys.stderr)
            return 1
    if args.refresh_previews:
        if not args.from_json or any((args.add_ids, args.add_new is not None, args.adult,
                                      args.probe, args.inspect, args.pages, args.force)):
            ap.error("--refresh-previews требует --from-json и совместим только с --apply")
        return refresh_previews(args.from_json, apply=args.apply)
    if args.adult and not args.add_ids:
        ap.error("--adult требует отдельно проверенные --add-ids")
    if args.add_new is not None and args.add_new < 1:
        ap.error("--add-new требует положительное число страниц")
    if args.from_json and args.add_new is not None:
        ap.error("--from-json несовместим с --add-new")
    if args.from_json or args.add_ids or args.add_new is not None:
        if args.probe or args.inspect or args.pages or args.force:
            ap.error("режим добавления несовместим с --probe, --inspect, --pages и --force")
        try:
            if args.from_json:
                models = models_from_files(args.from_json, args.add_ids)
            elif args.add_ids:
                models = [fetch_json(f"https://civitai.com/api/v1/models/{id}") for id in dict.fromkeys(args.add_ids)]
            else:
                models = newest_models(args.add_new)
        except (RuntimeError, OSError, ValueError) as error:
            print(error, file=sys.stderr)
            return 1
        return add_entries(models, adult=args.adult, apply=args.apply)
    if args.probe:
        model = fetch_json(f"https://civitai.com/api/v1/models/{args.probe}")
        print(f"{model.get('name')} (type={model.get('type')})")
        for v in model.get("modelVersions") or []:
            print({k: v.get(k) for k in ("id", "name", "baseModel", "availability", "earlyAccessEndsAt", "earlyAccessConfig", "publishedAt")})
            print("  → платная по импортёру:", is_early(v), "| до:", early_ends(v) or "-")
        return 0
    if args.pages and args.apply:
        print("--pages нельзя совмещать с --apply: каталог получился бы неполным.", file=sys.stderr)
        return 2

    print("Загрузка списка LoRA под Anima…", file=sys.stderr)
    models = crawl(args.pages)
    loras, reasons, review = select(models)

    if args.inspect:
        for lora in loras[: args.inspect]:
            print(json.dumps(lora, ensure_ascii=False, indent=2))
        return 0

    by_category: dict[str, int] = {}
    for lora in loras:
        by_category[lora["category"]] = by_category.get(lora["category"], 0) + 1
    print(f"Получено моделей: {len(models)}, в каталог: {len(loras)}")
    by_kind = {k: sum(1 for lora in loras if lora["kind"] == k) for k in KIND_CODES}
    paid = sum(1 for lora in loras if lora["access"])
    print("  форматы: " + ", ".join(f"{k} {v}" for k, v in by_kind.items()) + f"; платных (ранний доступ): {paid}")
    print("  по категориям: " + ", ".join(f"{k} {v}" for k, v in sorted(by_category.items(), key=lambda x: -x[1])))
    print("  исключено: " + ", ".join(f"{k} {v}" for k, v in sorted(reasons.items(), key=lambda x: -x[1])))

    previous = load_previous()
    before = {lora["id"] for lora in previous}
    after = {lora["id"] for lora in loras}
    print(f"Добавлено: {len(after - before)}, пропало: {len(before - after)}")

    if not args.apply:
        print("\nПробный прогон: ничего не записано. Для записи добавьте --apply.")
        return 0
    if previous and len(loras) < len(previous) * 0.8 and not args.force:
        print(
            f"\nLoRA стало {len(loras)} вместо {len(previous)}: похоже, API ответил не полностью. "
            "Ничего не записано; при необходимости запустите с --force.",
            file=sys.stderr,
        )
        return 1

    payload = catalog_payload(loras)
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    remove_from_adult({model["id"] for model in models if model["id"] in after and below_r_standard(model)})
    size = DATA_FILE.stat().st_size / 1024 / 1024
    print(f"\nЗаписано: {DATA_FILE.relative_to(ROOT)} ({len(loras)} LoRA, {size:.1f} МБ)")
    gallery = write_gallery(loras)
    extra = sum(max(0, len(lora["images"]) - 1) for lora in loras)
    print(f"Галерея: {GALLERY_DIR.relative_to(ROOT)}/ ({extra} доп. превью, {gallery / 1024 / 1024:.1f} МБ в {GALLERY_SHARDS} файлах)")

    review_payload = {
        "note": "Исключённые LoRA для ручного пересмотра. Только локально: не публикуется и не коммитится.",
        "updated_at": dt.date.today().isoformat(),
        "count": len(review),
        "by_reason": {k: v for k, v in reasons.items() if k not in NEVER_REVIEW},
        "loras": sorted(review, key=lambda item: -item["downloads"]),
    }
    REVIEW_FILE.write_text(json.dumps(review_payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    with_safe = sum(1 for item in review if item["safe_images"])
    print(
        f"Для пересмотра: {REVIEW_FILE.relative_to(ROOT)} ({len(review)}, из них с безопасными превью {with_safe}); "
        "minor и реальные люди туда не попадают"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
