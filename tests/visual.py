#!/usr/bin/env python3
"""Попиксельная проверка оформления: снять скриншоты «до» и сравнить с «после».

Нужна при чистке CSS/JS, когда смоук-тест (он проверяет, что сайт работает) не заметит
сдвиг на пару пикселей или потерянный цвет.

  python3 tests/visual.py snap  /tmp/before      # собрать сайт и снять скриншоты в папку
  ... правим код ...
  python3 tests/visual.py snap  /tmp/after
  python3 tests/visual.py diff  /tmp/before /tmp/after   # код 1, если снимки различаются

Снимается по 3 архива, тёмная и светлая темы, десктоп и телефон, вьювер, окно Info,
меню (command palette), поиск, режим Supported. Анимации отключаются, чтобы снимки были
воспроизводимыми. Нужно: pip install playwright pillow && playwright install chromium.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import smoke  # noqa: E402  (используем его сборку и локальный сервер)

FREEZE = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"


def settle(page, ms=1200):
    try:
        page.wait_for_function("document.querySelectorAll('#gallery .card-media').length > 0", timeout=20000)
    except Exception:
        pass
    try:
        page.wait_for_function(
            "!/LOADING|ЗАГРУЗКА/i.test((document.querySelector('#danbooruSyncNote')||{}).textContent||'')", timeout=15000
        )
    except Exception:
        pass
    # дождаться, пока загрузятся картинки в видимой части (остальные грузятся лениво)
    try:
        page.wait_for_function(
            "[...document.querySelectorAll('#gallery img')].filter(i => i.getBoundingClientRect().top < innerHeight)"
            ".every(i => i.complete && i.naturalWidth > 0)",
            timeout=20000,
        )
    except Exception:
        print("  (не все видимые картинки догрузились)")
    page.wait_for_timeout(ms)


def images_ready(page):
    try:
        page.wait_for_function(
            "[...document.querySelectorAll('#gallery img')].filter(i => i.getBoundingClientRect().top < innerHeight)"
            ".every(i => i.complete)",
            timeout=15000,
        )
    except Exception:
        pass
    page.wait_for_timeout(500)


def shot(page, out: Path, name: str, full=False):
    page.screenshot(path=str(out / f"{name}.png"), full_page=full)
    print("  снято", name)


def snap(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    proc, base = smoke.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox"])
            for theme in ("dark", "light"):
                for viewport, tag in (({"width": 1440, "height": 900}, "pc"), ({"width": 390, "height": 844}, "m")):
                    ctx = browser.new_context(viewport=viewport, locale="ru-RU", color_scheme=theme, reduced_motion="reduce")
                    ctx.add_init_script(
                        f"try{{localStorage.setItem('style-archive:theme','{theme}');localStorage.setItem('style-archive:lang','ru')}}catch(e){{}}"
                    )
                    page = ctx.new_page()
                    for archive in ("am", "opus", "sky"):
                        page.goto(f"{base}/index.html?archive={archive}", wait_until="networkidle")
                        page.add_style_tag(content=FREEZE)
                        settle(page)
                        shot(page, out, f"{theme}-{tag}-{archive}-grid")
                    # дальнейшие состояния: AM
                    page.goto(f"{base}/index.html?archive=am", wait_until="networkidle")
                    page.add_style_tag(content=FREEZE)
                    settle(page)
                    if tag == "pc":
                        # поиск
                        page.fill("#searchInput", "pecopeco")
                        page.wait_for_timeout(900)
                        images_ready(page)
                        shot(page, out, f"{theme}-{tag}-search")
                        # пустой результат поиска
                        page.fill("#searchInput", "zzqqxxnotastyle")
                        page.wait_for_timeout(900)
                        shot(page, out, f"{theme}-{tag}-zero")
                        page.fill("#searchInput", "")
                        page.wait_for_timeout(600)
                        # меню Discover
                        page.click("#discoverPolishButton")
                        page.wait_for_timeout(500)
                        shot(page, out, f"{theme}-{tag}-discover")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(300)
                        # вьювер
                        page.locator("#gallery .card-media").first.click()
                        page.wait_for_timeout(1200)
                        shot(page, out, f"{theme}-{tag}-viewer")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(400)
                        # Info
                        page.click("#infoButton")
                        page.wait_for_timeout(700)
                        shot(page, out, f"{theme}-{tag}-info")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(400)
                        # меню (command palette)
                        page.click("#commandSearchButton")
                        page.wait_for_timeout(700)
                        shot(page, out, f"{theme}-{tag}-menu")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(400)
                        # Supported
                        page.click('.mode-tab[data-mode="supported"]')
                        page.wait_for_timeout(1800)
                        shot(page, out, f"{theme}-{tag}-supported")
                    else:
                        page.fill("#searchInput", "zzqqxxnotastyle")
                        page.wait_for_timeout(900)
                        shot(page, out, f"{theme}-{tag}-zero")
                        page.fill("#searchInput", "")
                        page.wait_for_timeout(600)
                        page.click("#discoverPolishButton")
                        page.wait_for_timeout(500)
                        shot(page, out, f"{theme}-{tag}-discover")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(300)
                        page.click("#commandSearchButton")
                        page.wait_for_timeout(700)
                        shot(page, out, f"{theme}-{tag}-menu")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(400)
                        page.locator("#gallery .card-media").first.click()
                        page.wait_for_timeout(1200)
                        shot(page, out, f"{theme}-{tag}-viewer")
                    ctx.close()
            browser.close()
    finally:
        proc.terminate()


def diff(a: Path, b: Path) -> int:
    names = sorted(p.name for p in a.glob("*.png"))
    bad = 0
    for n in names:
        pa, pb = a / n, b / n
        if not pb.exists():
            print(f"  НЕТ    {n}")
            bad += 1
            continue
        ia, ib = Image.open(pa).convert("RGB"), Image.open(pb).convert("RGB")
        if ia.size != ib.size:
            print(f"  РАЗМЕР {n}: {ia.size} -> {ib.size}")
            bad += 1
            continue
        box = ImageChops.difference(ia, ib).getbbox()
        if box:
            changed = sum(1 for px in ImageChops.difference(ia, ib).convert("L").tobytes() if px > 8)
            if changed == 0:  # шум сглаживания ниже порога заметности
                print(f"  ок     {n}")
            else:
                print(f"  ОТЛИЧИЕ {n}: область {box}, пикселей заметно отличается: {changed}")
                bad += 1
        else:
            print(f"  ок     {n}")
    print(f"\nСнимков: {len(names)}, отличается: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "snap":
        snap(Path(sys.argv[2]))
    elif len(sys.argv) >= 4 and sys.argv[1] == "diff":
        sys.exit(diff(Path(sys.argv[2]), Path(sys.argv[3])))
    else:
        print(__doc__)
        sys.exit(2)
