#!/usr/bin/env python3
"""Собирает ссылки на PG-кадры CivitAI для версий Anima из очереди архива."""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from email.utils import parsedate_to_datetime
from itertools import islice
from pathlib import Path
from threading import Event, Lock
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen

API = "https://civitai.com/api/v1/images"
PART_BYTES = 8 * 1024 * 1024
REQUEST_INTERVAL = 0.34


class Pacer:
    """Общий интервал между запросами и пауза от сервера для всех потоков."""

    def __init__(self) -> None:
        self.next_request = 0.0
        self.lock = Lock()
        self.stopped = Event()

    def wait(self) -> None:
        while not self.stopped.is_set():
            with self.lock:
                now = time.monotonic()
                delay = self.next_request - now
                if delay <= 0:
                    self.next_request = now + REQUEST_INTERVAL
                    return
            self.stopped.wait(delay)
        raise InterruptedError("Выгрузка остановлена")

    def pause(self, delay: float) -> None:
        with self.lock:
            self.next_request = max(self.next_request, time.monotonic() + delay)


def retry_delay(header: str, fallback: int) -> int:
    if header.isdecimal():
        return int(header)
    try:
        return max(1, int(parsedate_to_datetime(header).timestamp() - time.time()) + 1)
    except (ValueError, TypeError, OverflowError):
        return fallback


def fetch_page(url: str, pacer: Pacer) -> dict:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "StyleArchivePreviewExport/1.0"})
    for attempt in range(4):
        pacer.wait()
        try:
            with urlopen(request, timeout=20) as response:
                return json.load(response)
        except HTTPError as error:
            if attempt == 3 or (error.code != 429 and error.code < 500):
                raise
            retry_after = error.headers.get("Retry-After", "")
            delay = retry_delay(retry_after, 5 * (attempt + 1))
            print(f"HTTP {error.code}, повтор через {delay} сек.", flush=True)
            if error.code in (429, 503) or retry_after:
                pacer.pause(delay)
            elif pacer.stopped.wait(delay):
                raise InterruptedError("Выгрузка остановлена") from error
        except (URLError, TimeoutError):
            if attempt == 3:
                raise
            if pacer.stopped.wait(5 * (attempt + 1)):
                raise InterruptedError("Выгрузка остановлена")


def is_pg(image: dict) -> bool:
    level = image.get("browsingLevel")
    if level is not None:
        return type(level) is int and level == 1
    legacy = image.get("nsfwLevel")
    return ((type(legacy) is int and legacy == 1) or legacy == "None") and not image.get("nsfw")


def collect(version_id: int, pacer: Pacer) -> list[dict]:
    params = {"modelVersionId": version_id, "type": "image", "browsingLevel": 1, "limit": 200}
    previews = {}
    cursors = set()
    while True:
        page = fetch_page(f"{API}?{urlencode(params)}", pacer)
        if not isinstance(page.get("items"), list):
            raise ValueError("API returned no image list")
        for image in page["items"]:
            if not is_pg(image) or image.get("type", "image") != "image" or image.get("minor") or image.get("poi"):
                continue
            versions = image.get("modelVersionIds")
            if isinstance(versions, list) and str(version_id) not in {str(item) for item in versions}:
                continue
            link = urlsplit(image.get("url") or "")
            if link.scheme != "https" or link.netloc != "image.civitai.com" or not link.path.strip("/"):
                continue
            url = link.geturl()
            previews.setdefault(link.path, {"url": url, "nsfwLevel": 1, "type": "image",
                                          "width": image.get("width"), "height": image.get("height")})
        metadata = page.get("metadata") or {}
        cursor = metadata.get("nextCursor")
        if cursor is None and metadata.get("nextPage"):
            cursor = parse_qs(urlsplit(metadata["nextPage"]).query).get("cursor", [None])[0]
            if cursor is None:
                raise ValueError("API returned a next page without a cursor")
        if cursor is None or cursor == "":
            return list(previews.values())
        if not isinstance(cursor, (str, int)) or str(cursor) in cursors:
            raise ValueError("API repeated or returned an invalid cursor")
        cursors.add(str(cursor))
        params["cursor"] = cursor


def completed(directory: Path) -> tuple[set[tuple[int, int]], int]:
    done = set()
    files = sorted(directory.glob("previews-*.jsonl"))
    for path in files:
        with path.open("rb+") as file:
            while line := file.readline():
                if not line.endswith(b"\n"):
                    if path != files[-1]:
                        raise ValueError(f"Incomplete record in {path}")
                    # A power loss may leave a partial final line. Repeat that version.
                    file.truncate(file.tell() - len(line))
                    break
                entry = json.loads(line)
                done.add((entry["model_id"], entry["version_id"]))
    last = max((int(path.stem.removeprefix("previews-")) for path in files), default=0)
    return done, last


def parallel_collect(pending: list[tuple[int, int]], workers: int):
    pacer = Pacer()
    todo = iter(pending)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        active = {
            pool.submit(collect, version_id, pacer): (model_id, version_id)
            for model_id, version_id in islice(todo, workers)
        }
        try:
            while active:
                ready, _ = wait(active, return_when=FIRST_COMPLETED)
                for task in ready:
                    model_id, version_id = active.pop(task)
                    try:
                        yield model_id, version_id, task.result()
                    except (OSError, ValueError, KeyError, TypeError) as error:
                        raise RuntimeError(f"Модель {model_id}, версия {version_id}: {error}") from error
                    row = next(todo, None)
                    if row is not None:
                        active[pool.submit(collect, row[1], pacer)] = row
        finally:
            pacer.stopped.set()
            for task in active:
                task.cancel()


def export(queue: Path, directory: Path, scan: str, limit: int | None, workers: int = 4) -> None:
    manifest = json.loads(queue.read_text(encoding="utf-8-sig"))
    if manifest.get("format") != 1:
        raise ValueError("Unsupported preview queue")
    directory.mkdir(parents=True, exist_ok=True)
    done, part = completed(directory)
    pending = [
        (model, version) for model, version, count in manifest["models"]
        if (scan == "all" or (scan == "missing" and count == 0) or (scan == "existing" and count > 0))
        and (model, version) not in done
    ]
    if limit is not None:
        pending = pending[:limit]
    print(f"К проверке: {len(pending)}. Уже сохранено: {len(done)}. Потоков: {workers}.", flush=True)
    size = PART_BYTES
    found = 0
    for index, (model_id, version_id, images) in enumerate(parallel_collect(pending, workers), 1):
        row = json.dumps({"model_id": model_id, "version_id": version_id, "images": images},
                         ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
        if len(row) > PART_BYTES:
            raise ValueError(f"Слишком большой результат для версии {version_id}")
        if size + len(row) > PART_BYTES:
            part += 1
            size = 0
        path = directory / f"previews-{part:05}.jsonl"
        with path.open("ab") as file:
            file.write(row)
        size += len(row)
        found += len(images)
        print(f"[{index}/{len(pending)}] {model_id}: {len(images)} кадров → {path.name}", flush=True)
    print(f"Обход завершён. Сохранено версий: {len(pending)}, найдены кадры: {found}.", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", type=Path, default=Path(__file__).with_name("preview-queue.json"))
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("civitai-preview-results"))
    parser.add_argument("--scan", choices=("missing", "existing", "all"), default="missing",
                        help="missing: модели без превью; existing: только с превью; all: все")
    parser.add_argument("--limit", type=int, help="число версий в одном запуске")
    parser.add_argument("--workers", type=int, choices=range(1, 5), default=4, help="параллельные запросы (до 4)")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit должен быть положительным")
    try:
        export(args.queue, args.output, args.scan, args.limit, args.workers)
    except KeyboardInterrupt:
        print("\nОстановлено. Повторный запуск продолжит с несохранённой версии.", flush=True)
        return 130
    except (OSError, RuntimeError, ValueError, KeyError, TypeError) as error:
        print(f"Выгрузка остановлена: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
