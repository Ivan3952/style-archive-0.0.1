#!/usr/bin/env python3
"""Выгружает доступные через API CivitAI LoRA для Anima в части models-*.json."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

API = "https://civitai.com/api/v1/models"
MAX_PART = 16 * 1024 * 1024


def fetch_page(url: str) -> dict:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "StyleArchiveExporter/1.0"})
    for attempt in range(4):
        try:
            with urlopen(request, timeout=60) as response:
                return json.load(response)
        except HTTPError as error:
            if attempt == 3 or (error.code != 429 and error.code < 500):
                raise
            retry_after = error.headers.get("Retry-After", "")
            time.sleep(int(retry_after) if retry_after.isdigit() else 10 * (attempt + 1))
        except (URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))


def walk(include_adult: bool):
    query = {"types": "LORA", "baseModels": "Anima", "sort": "Newest", "limit": 100,
             "nsfw": str(include_adult).lower()}
    url = f"{API}?{urlencode(query)}"
    visited = set()
    while url:
        parts = urlsplit(url)
        if (parts.scheme, parts.netloc, parts.path) != ("https", "civitai.com", "/api/v1/models"):
            raise ValueError("API вернул ссылку на другую страницу или домен")
        if url in visited:
            raise ValueError("API повторил ссылку пагинации")
        visited.add(url)
        page = fetch_page(url)
        items = page["items"]
        if not isinstance(items, list):
            raise ValueError("API вернул некорректный список моделей")
        yield items
        metadata = page.get("metadata") or {}
        next_page = metadata.get("nextPage")
        if not next_page and metadata.get("nextCursor"):
            params = dict(parse_qsl(parts.query))
            params["cursor"] = metadata["nextCursor"]
            next_page = urlunsplit(parts._replace(query=urlencode(params)))
        url = urljoin(url, next_page) if next_page else ""
        if url:
            time.sleep(1)


def export(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=False)
    part, rows, size = 1, [], 13
    seen = set()

    def flush() -> None:
        nonlocal part, rows, size
        if not rows:
            return
        name = directory / f"models-{part:03}.json"
        name.write_bytes(b'{"items":[' + b",".join(rows) + b"]}\n")
        print(f"{name}: {len(rows)} моделей", flush=True)
        part, rows, size = part + 1, [], 13

    try:
        # Сначала запрос с 18+, чтобы при совпадении ID сохранить данные из этой выдачи.
        for include_adult in (True, False):
            for items in walk(include_adult):
                for model in items:
                    model_id = model["id"]
                    if type(model_id) is not int or model_id < 1:
                        raise ValueError("API вернул некорректный ID")
                    if model_id in seen:
                        continue
                    packed = json.dumps(model, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
                    if size + len(packed) + 1 > MAX_PART:
                        flush()
                    if size + len(packed) + 1 > MAX_PART:
                        raise ValueError(f"Запись {model_id} превышает размер части")
                    rows.append(packed)
                    size += len(packed) + 1
                    seen.add(model_id)
    finally:
        flush()
    print(f"Выгрузка завершена: {len(seen)} уникальных моделей, {part - 1} файлов.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, nargs="?", default=Path("civitai-anima-export"),
                        help="новая папка для JSON-файлов (по умолчанию civitai-anima-export)")
    args = parser.parse_args()
    try:
        export(args.directory)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Выгрузка не завершена: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
