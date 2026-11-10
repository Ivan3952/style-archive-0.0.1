#!/usr/bin/env python3
"""Смоук-тест сайта: быстро проверяет, что главное работает и в консоли нет ошибок.

Запуск из корня репозитория:
  python3 tests/smoke.py                      # соберёт сайт (npm run build) и поднимет локальный сервер
  python3 tests/smoke.py https://stylearchive.art   # проверить уже выложенный сайт

Нужно (один раз):  pip install playwright && playwright install chromium
Через переменную CHROME_PATH можно указать уже установленный Chrome/Chromium.

Что проверяется:
  1. страница открывается без JS-ошибок и ошибок консоли;
  2. сетка показывает карточки, и картинки берутся из media/thumb (миниатюры);
  3. данные Danbooru загрузились;
  4. переключение архивов AM / OPUS / SKY: карточки есть, счётчик меняется;
  5. поиск находит известный стиль и пустой запрос возвращает всё;
  6. вьювер открывается и закрывается по Esc, «Save» увеличивает счётчик Saved;
  7. переключатели темы и языка работают;
  8. на мобильной ширине нет горизонтальной прокрутки.
Код возврата 0, если всё прошло; 1, если что-то упало.
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
from contextlib import closing
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
IGNORED_CONSOLE = ("favicon",)  # пока в репозитории нет favicon

results: list[tuple[bool, str]] = []


def check(ok: bool, label: str, detail: str = "") -> bool:
    results.append((ok, label))
    print(f"  {'OK  ' if ok else 'FAIL'}  {label}" + (f"   [{detail}]" if detail and not ok else ""))
    return ok


def free_port() -> int:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def build_site() -> Path:
    """Собирает сайт (npm run build) и подкладывает media в dist ссылкой.

    На хостинг media едет отдельно (см. workflow), поэтому в самой сборке её нет;
    для локальной проверки достаточно символической ссылки dist/media -> ../media.
    """
    npm = "npm.cmd" if os.name == "nt" else "npm"
    if not (ROOT / "node_modules").exists():
        subprocess.run([npm, "install", "--no-audit", "--no-fund"], cwd=ROOT, check=True)
    subprocess.run([npm, "run", "build"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    dist = ROOT / "dist"
    link = dist / "media"
    if not link.exists():
        try:
            link.symlink_to(ROOT / "media", target_is_directory=True)
        except OSError as exc:  # Windows без прав на симлинки
            raise SystemExit(f"Не удалось создать dist/media -> ../media: {exc}")
    return dist


def start_server() -> tuple[subprocess.Popen, str]:
    port = free_port()
    dist = build_site()
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=dist, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(0.8)
    return proc, f"http://127.0.0.1:{port}"


def first_style_name() -> str:
    styles = json.loads((ROOT / "data" / "styles.json").read_text(encoding="utf-8"))
    return next(s["name"] for s in styles if s.get("media"))


def count_cards(page) -> int:
    return page.locator("#gallery .card-media").count()


def wait_cards(page, timeout=20000) -> bool:
    try:
        page.wait_for_function("document.querySelectorAll('#gallery .card-media').length > 0", timeout=timeout)
        return True
    except Exception:
        return False


def run(base: str) -> None:
    exe = os.environ.get("CHROME_PATH")
    with sync_playwright() as p:
        launch = {"args": ["--no-sandbox"]}
        if exe:
            launch["executable_path"] = exe
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: errors.append(f"console.error: {m.text}")
            if m.type == "error" and not any(k in (m.text + str(m.location)).lower() for k in IGNORED_CONSOLE)
            else None,
        )
        page.on(
            "response",
            lambda r: errors.append(f"HTTP {r.status}: {r.url}")
            if r.status >= 400 and not any(k in r.url.lower() for k in IGNORED_CONSOLE)
            else None,
        )

        print(f"\nSmoke test: {base}\n")

        # 1-3. Загрузка, карточки, миниатюры, Danbooru
        page.goto(base + "/index.html", wait_until="networkidle", timeout=120000)
        check(wait_cards(page), "сетка отрисовала карточки")
        page.wait_for_timeout(1500)
        srcs = page.eval_on_selector_all("#gallery img", "els => els.map(e => e.getAttribute('src') || '')")
        thumbs = [s for s in srcs if "/thumb/" in s]
        full = [s for s in srcs if "/web/" in s]
        check(bool(srcs) and not full, "в сетке используются миниатюры, а не полноразмерные файлы",
              f"thumb={len(thumbs)} web={len(full)}")
        visual = int((page.inner_text("#brandVisualCount") or "0").strip() or 0)
        check(visual > 0, "счётчик визуального архива заполнен", f"{visual}")
        try:
            page.wait_for_function(
                "!/LOADING|ЗАГРУЗКА/i.test((document.querySelector('#danbooruSyncNote')||{}).textContent||'')",
                timeout=15000,
            )
            check(True, "данные Danbooru загружены")
        except Exception:
            check(False, "данные Danbooru загружены", "индикатор загрузки так и не исчез")

        # 4. Архивы
        counts = {}
        for key in ("am", "opus", "sky"):
            btn = page.locator(f'[data-archive-v004="{key}"]')
            if btn.count() == 0:
                check(False, f"кнопка архива {key} существует")
                continue
            if key != "am":
                btn.first.click()
                page.wait_for_timeout(1200)
            ok = wait_cards(page)
            counts[key] = page.inner_text("#brandVisualCount").strip()
            check(ok, f"архив {key.upper()}: карточки отрисованы", f"счётчик {counts[key]}")
        check(len(set(counts.values())) == len(counts) and len(counts) == 3, "счётчики трёх архивов различаются", str(counts))
        page.locator('[data-archive-v004="am"]').first.click()
        page.wait_for_timeout(1200)
        wait_cards(page)

        # 5. Поиск
        name = first_style_name()
        page.fill("#searchInput", name.lstrip("@"))
        page.wait_for_timeout(900)
        check(count_cards(page) >= 1, f"поиск находит «{name}»", f"cards={count_cards(page)}")
        page.fill("#searchInput", "")
        page.wait_for_timeout(900)
        check(count_cards(page) > 1, "пустой запрос возвращает список")

        # 6. Вьювер и Saved
        page.locator("#gallery .card-media").first.click()
        page.wait_for_timeout(700)
        # #viewer это <dialog>: открыт ровно тогда, когда у него свойство open
        opened = page.evaluate("document.querySelector('#viewer').open === true")
        check(opened, "вьювер открывается по клику на карточку")
        before = int(page.inner_text("#savedCount").strip() or 0)
        if page.locator("#viewerSave").count():
            page.locator("#viewerSave").click()
            page.wait_for_timeout(400)
        after = int(page.inner_text("#savedCount").strip() or 0)
        check(after == before + 1, "кнопка Save увеличивает счётчик Saved", f"{before}->{after}")
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        closed = page.evaluate("document.querySelector('#viewer').open === false")
        check(closed, "вьювер закрывается по Esc")

        # 7. Тема и язык
        t0 = page.evaluate("document.documentElement.dataset.theme")
        page.click("#themeButton")
        page.wait_for_timeout(300)
        t1 = page.evaluate("document.documentElement.dataset.theme")
        check(t0 != t1, "переключатель темы меняет тему", f"{t0}->{t1}")
        l0 = page.inner_text("#languageButton").strip()
        page.click("#languageButton")
        page.wait_for_timeout(500)
        l1 = page.inner_text("#languageButton").strip()
        check(l0 != l1, "переключатель языка меняет язык", f"{l0}->{l1}")

        # 8. Мобильная ширина
        page.set_viewport_size({"width": 390, "height": 800})
        page.reload(wait_until="networkidle")
        wait_cards(page)
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(overflow <= 1, "на ширине 390px нет горизонтальной прокрутки", f"overflow={overflow}px")

        check(not errors, "в консоли и сети нет ошибок", "; ".join(errors[:4]))
        browser.close()


def main() -> int:
    server = None
    base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else None
    try:
        if not base:
            server, base = start_server()
        run(base)
    finally:
        if server:
            server.terminate()
    failed = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} проверок пройдено")
    if failed:
        print("Упало:\n  - " + "\n  - ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
