/*
 * Быстрый просмотр 0.1.2.
 * ПК: задержать курсор на превью — рядом появляется крупная картинка и остальные превью стиля.
 *     Пока окно видно: S — сохранить, A — в микс, Enter — открыть полностью.
 * Телефон: долгое нажатие на превью открывает то же окно поверх страницы, касание вне — закрывает.
 * Отключается в панели «Фильтры» (настройка хранится в style-archive:peek-v007).
 */
(() => {
  "use strict";

  const STORE_KEY = "style-archive:peek-v007";
  const HOVER_DELAY = 450;
  const HIDE_DELAY = 140;
  const LONG_PRESS = 450;
  const MOVE_TOLERANCE = 10;
  const MAX_THUMBS = 8;
  const WAIT_ATTEMPTS = 120;

  const tr = (ru, en) => (document.documentElement.lang === "en" ? en : ru);
  const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let app = null;
  let enabled = readEnabled();

  function readEnabled() {
    try {
      return localStorage.getItem(STORE_KEY) !== "off";
    } catch {
      return true;
    }
  }

  function writeEnabled(value) {
    try {
      localStorage.setItem(STORE_KEY, value ? "on" : "off");
    } catch {}
  }

  /* ---------- окно ---------- */

  const peek = document.createElement("div");
  peek.className = "quick-peek-v007";
  peek.hidden = true;
  peek.setAttribute("role", "dialog");
  peek.setAttribute("aria-modal", "false");

  const backdrop = document.createElement("div");
  backdrop.className = "quick-peek-backdrop-v007";
  backdrop.hidden = true;

  let current = null; /* { style, index, anchor, touch } */
  let showTimer = null;
  let hideTimer = null;

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );

  const mediaOf = (style) =>
    (style.media || [])
      .map((id) => app.state.media[id])
      .filter((media) => media && (media.src || media.thumb));

  function render() {
    if (!current) return;

    const { style, index, touch } = current;
    const list = mediaOf(style);
    const media = list[index] || list[0] || {};
    const thumb = app.toLocalPath(media.thumb || media.src || "");
    const full = app.toLocalPath(media.src || media.thumb || "");
    const ratio =
      Number(media.width) > 0 && Number(media.height) > 0
        ? `${media.width}/${media.height}`
        : "2/3";
    const name = style.copy_value || style.name || "";
    const inTray = app.isInTray(name);
    const saved = app.state.saved.has(style.id);

    peek.classList.toggle("touch", Boolean(touch));

    peek.innerHTML = `
      <div class="quick-peek-media-v007" style="aspect-ratio:${ratio}">
        ${thumb ? `<img class="quick-peek-low-v007" src="${esc(thumb)}" alt="">` : ""}
        ${full && full !== thumb ? `<img class="quick-peek-full-v007" src="${esc(full)}" alt="${esc(name)}" decoding="async">` : ""}
      </div>
      ${
        list.length > 1
          ? `<div class="quick-peek-strip-v007">${list
              .slice(0, MAX_THUMBS)
              .map(
                (item, position) =>
                  `<button type="button" class="${position === index ? "active" : ""}" data-peek-index="${position}"><img src="${esc(
                    app.toLocalPath(item.thumb || item.src || "")
                  )}" alt="" loading="lazy"></button>`
              )
              .join(
                ""
              )}${list.length > MAX_THUMBS ? `<span>+${list.length - MAX_THUMBS}</span>` : ""}</div>`
          : ""
      }
      <div class="quick-peek-info-v007">
        <span class="quick-peek-name-v007">${esc(name)}</span>
        <span class="quick-peek-count-v007">${list.length > 1 ? `${index + 1} / ${list.length}` : ""}</span>
      </div>
      <div class="quick-peek-actions-v007">
        <button type="button" data-peek-act="tray" class="${inTray ? "on" : ""}">${
          inTray ? tr("В МИКСЕ ✓", "IN MIX ✓") : tr("В МИКС", "TO MIX")
        }${touch ? "" : " <kbd>A</kbd>"}</button>
        <button type="button" data-peek-act="save" class="${saved ? "on" : ""}">${
          saved ? tr("СОХРАНЕНО ✓", "SAVED ✓") : tr("СОХРАНИТЬ", "SAVE")
        }${touch ? "" : " <kbd>S</kbd>"}</button>
        <button type="button" data-peek-act="open">${tr("ОТКРЫТЬ", "OPEN")}${touch ? "" : " <kbd>↵</kbd>"}</button>
      </div>
    `;

    const full$ = peek.querySelector(".quick-peek-full-v007");
    if (full$) {
      const ready = () => full$.classList.add("loaded");
      if (full$.complete && full$.naturalWidth) ready();
      else full$.addEventListener("load", ready, { once: true });
      full$.addEventListener("error", () => full$.remove(), { once: true });
    }
    peek.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => (img.style.visibility = "hidden"), { once: true });
    });

    position();
  }

  function position() {
    if (!current) return;

    if (current.touch) {
      peek.style.left = "";
      peek.style.top = "";
      return;
    }

    const rect = current.anchor.getBoundingClientRect();
    const gap = 14;
    const margin = 12;
    const width = peek.offsetWidth;
    const height = peek.offsetHeight;
    const roomRight = window.innerWidth - rect.right - gap - margin;
    const roomLeft = rect.left - gap - margin;

    let left;
    if (roomRight >= width) left = rect.right + gap;
    else if (roomLeft >= width) left = rect.left - gap - width;
    else left = Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left));

    const top = Math.max(
      margin,
      Math.min(window.innerHeight - height - margin, rect.top + rect.height / 2 - height / 2)
    );

    peek.style.left = `${Math.round(left)}px`;
    peek.style.top = `${Math.round(top)}px`;
  }

  function show(style, anchor, touch = false) {
    window.clearTimeout(hideTimer);
    current = { style, index: 0, anchor, touch };
    peek.hidden = false;
    backdrop.hidden = !touch;
    document.documentElement.classList.toggle("quick-peek-touch-v007", touch);
    render();
    /* окно сначала рисуется, потом ставится по размеру (картинка задаёт высоту через aspect-ratio) */
    requestAnimationFrame(position);
  }

  function hide() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    current = null;
    peek.hidden = true;
    backdrop.hidden = true;
    peek.innerHTML = "";
    document.documentElement.classList.remove("quick-peek-touch-v007");
  }

  const scheduleHide = () => {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, HIDE_DELAY);
  };

  /* ---------- действия ---------- */

  function act(action) {
    if (!current) return;
    const { style } = current;
    const name = style.copy_value || style.name || "";

    if (action === "tray") app.toggleTray(name);
    else if (action === "save") app.toggleSaved(style.id);
    else if (action === "open") {
      hide();
      app.openViewer(style);
      return;
    }
    render();
  }

  peek.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const thumb = target.closest("[data-peek-index]");
    if (thumb && current) {
      current.index = Number(thumb.dataset.peekIndex) || 0;
      render();
      return;
    }

    const button = target.closest("[data-peek-act]");
    if (button) act(button.dataset.peekAct);
    else if (target.closest(".quick-peek-media-v007")) act("open");
  });

  /* на ПК наведение на миниатюру сразу меняет большую картинку */
  peek.addEventListener("mouseover", (event) => {
    const thumb =
      event.target instanceof Element ? event.target.closest("[data-peek-index]") : null;
    if (!thumb || !current) return;
    const index = Number(thumb.dataset.peekIndex) || 0;
    if (index === current.index) return;
    current.index = index;
    render();
  });

  peek.addEventListener("mouseenter", () => window.clearTimeout(hideTimer));
  peek.addEventListener("mouseleave", () => {
    if (current && !current.touch) scheduleHide();
  });

  backdrop.addEventListener("click", hide);

  document.addEventListener("keydown", (event) => {
    if (!current) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();
    const code = event.code;
    if (key === "escape") {
      hide();
      return;
    }
    /* учитываем русскую раскладку: S = Ы, A = Ф */
    if (code === "KeyS" || key === "s" || key === "ы") {
      event.preventDefault();
      act("save");
    } else if (code === "KeyA" || key === "a" || key === "ф") {
      event.preventDefault();
      act("tray");
    } else if (key === "enter") {
      event.preventDefault();
      act("open");
    } else if ((key === "arrowright" || key === "arrowleft") && current.style.media?.length > 1) {
      event.preventDefault();
      const total = mediaOf(current.style).length;
      current.index = (current.index + (key === "arrowright" ? 1 : -1) + total) % total;
      render();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (current && !current.touch) hide();
    },
    { passive: true }
  );
  window.addEventListener("resize", () => {
    if (current) position();
  });
  window.addEventListener("style-archive:state", () => {
    if (current) render();
  });

  /* ---------- привязка к карточкам ---------- */

  const blocked = () =>
    !enabled ||
    document.querySelector("dialog[open]") ||
    document.documentElement.classList.contains("mix-dock-open-v006");

  function styleFromMedia(node) {
    const id = node?.dataset?.openId;
    return id ? app.state.styleById.get(id) : null;
  }

  function bindHover(gallery) {
    gallery.addEventListener("mouseover", (event) => {
      if (!canHover() || blocked()) return;
      const media = event.target instanceof Element ? event.target.closest(".card-media") : null;
      if (!media) return;

      window.clearTimeout(hideTimer);
      if (current?.anchor === media) return;

      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(
        () => {
          const style = styleFromMedia(media);
          if (style && media.matches(":hover")) show(style, media);
        },
        current ? 120 : HOVER_DELAY
      );
    });

    gallery.addEventListener("mouseout", (event) => {
      const media = event.target instanceof Element ? event.target.closest(".card-media") : null;
      if (!media) return;
      const to = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (to && (media.contains(to) || peek.contains(to))) return;
      window.clearTimeout(showTimer);
      if (current && !current.touch) scheduleHide();
    });
  }

  function bindTouch(gallery) {
    let pressTimer = null;
    let start = null;
    let swallowClick = false;
    let shownAt = 0;

    const cancel = () => {
      window.clearTimeout(pressTimer);
      pressTimer = null;
      start = null;
    };

    gallery.addEventListener(
      "touchstart",
      (event) => {
        if (blocked() || event.touches.length !== 1) return;
        const media = event.target instanceof Element ? event.target.closest(".card-media") : null;
        if (!media) return;

        const touch = event.touches[0];
        start = { x: touch.clientX, y: touch.clientY };
        pressTimer = window.setTimeout(() => {
          const style = styleFromMedia(media);
          if (!style) return;
          swallowClick = true;
          shownAt = Date.now();
          navigator.vibrate?.(10);
          show(style, media, true);
        }, LONG_PRESS);
      },
      { passive: true }
    );

    gallery.addEventListener(
      "touchmove",
      (event) => {
        if (!start) return;
        const touch = event.touches[0];
        if (
          Math.abs(touch.clientX - start.x) > MOVE_TOLERANCE ||
          Math.abs(touch.clientY - start.y) > MOVE_TOLERANCE
        ) {
          cancel();
        }
      },
      { passive: true }
    );

    gallery.addEventListener("touchend", cancel, { passive: true });
    gallery.addEventListener("touchcancel", cancel, { passive: true });

    /*
     * Палец отпускают уже над открытым окном, и браузер присылает «клик» туда.
     * Этот клик не должен ни открыть просмотрщик, ни закрыть окно, поэтому гасим его на уровне документа.
     */
    document.addEventListener(
      "click",
      (event) => {
        if (!swallowClick) return;
        swallowClick = false;
        if (Date.now() - shownAt > 1500) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );

    gallery.addEventListener("contextmenu", (event) => {
      if (current?.touch || pressTimer) event.preventDefault();
    });
  }

  /* ---------- настройка в панели «Фильтры» ---------- */

  let setting = null;

  function placeSetting() {
    const panel = document.querySelector("#filtersPanel");
    if (!panel) return false;
    if (setting?.isConnected) return true;

    setting = document.createElement("div");
    setting.className = "filters-section-v005 visual-only-v005 quick-peek-setting-v007";
    setting.innerHTML = `
      <div class="grid-density-v004 quick-peek-toggle-v007">
        <span class="grid-density-label-v004"></span>
        <button type="button" data-peek-setting="on"></button>
        <button type="button" data-peek-setting="off"></button>
      </div>
    `;
    setting.addEventListener("click", (event) => {
      const button =
        event.target instanceof Element ? event.target.closest("[data-peek-setting]") : null;
      if (!button) return;
      enabled = button.dataset.peekSetting === "on";
      writeEnabled(enabled);
      if (!enabled) hide();
      syncSetting();
    });

    panel.appendChild(setting);
    syncSetting();
    return true;
  }

  function syncSetting() {
    if (!setting) return;
    const label = setting.querySelector(".grid-density-label-v004");
    const text = canHover()
      ? tr("ПРЕВЬЮ ПРИ НАВЕДЕНИИ", "PREVIEW ON HOVER")
      : tr("ПРЕВЬЮ ПО ДОЛГОМУ НАЖАТИЮ", "PREVIEW ON LONG PRESS");
    if (label.textContent !== text) label.textContent = text;

    setting.querySelectorAll("[data-peek-setting]").forEach((button) => {
      const on = button.dataset.peekSetting === "on";
      const value = on ? tr("ВКЛ", "ON") : tr("ВЫКЛ", "OFF");
      if (button.textContent !== value) button.textContent = value;
      button.classList.toggle("active", on === enabled);
    });
  }

  /* ---------- запуск ---------- */

  function start(candidate) {
    app = candidate;
    document.body.append(backdrop, peek);

    const gallery = document.querySelector("#gallery");
    if (gallery) {
      bindHover(gallery);
      bindTouch(gallery);
    }

    let tries = 0;
    const place = () => {
      if (placeSetting() || tries++ > 60) return;
      window.setTimeout(place, 150);
    };
    place();

    new MutationObserver(() => {
      syncSetting();
      if (current) render();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    /* окно не должно висеть, когда открывается просмотрщик или другое окно */
    document.addEventListener("click", (event) => {
      if (!current || current.touch) return;
      if (event.target instanceof Element && peek.contains(event.target)) return;
      hide();
    });
  }

  let attempts = 0;

  function waitForApp() {
    const candidate = window.STYLE_ARCHIVE_V003;
    const ready = candidate?.state && candidate.state.styles?.length > 0 && candidate.toggleSaved;

    if (ready) {
      start(candidate);
      return;
    }

    attempts += 1;
    if (attempts < WAIT_ATTEMPTS) window.setTimeout(waitForApp, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForApp, { once: true });
  } else {
    waitForApp();
  }
})();
