/*
 * Возврат на то же место 0.1.2.
 * Галерея дорисовывается по мере прокрутки, поэтому после перезагрузки или возврата назад
 * браузер сам не может вернуть прокрутку: нужной высоты ещё нет.
 * Запоминаем, сколько карточек было нарисовано и где стояла страница,
 * и восстанавливаем это, если фильтры и сортировка те же.
 */
(() => {
  "use strict";

  const STORE_KEY = "style-archive:scroll-v006";
  const MAX_AGE = 12 * 60 * 60 * 1000;
  const MIN_SCROLL = 300;
  const WAIT_ATTEMPTS = 120;
  const CHECKS = 16;
  const CHECK_EVERY = 250;

  let app = null;

  try {
    history.scrollRestoration = "manual";
  } catch {}

  function signature() {
    const state = app.state;
    return [
      location.pathname + location.search,
      state.mode,
      state.visualSort,
      state.activePreset,
      state.savedOnly ? 1 : 0,
      state.discoveryStyles ? 1 : 0,
      state.danbooruMin || 0,
      state.danbooruPresence || "all",
      document.querySelector("#searchInput")?.value || "",
    ].join("|");
  }

  function save() {
    if (!app || app.state.mode !== "visual") return;

    try {
      sessionStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          sig: signature(),
          y: Math.round(window.scrollY),
          rendered: app.state.rendered,
          at: Date.now(),
        })
      );
    } catch {}
  }

  function read() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (!parsed || typeof parsed.sig !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function navigationType() {
    try {
      return performance.getEntriesByType("navigation")[0]?.type || "navigate";
    } catch {
      return "navigate";
    }
  }

  function restore() {
    const type = navigationType();
    if (type !== "reload" && type !== "back_forward") return;

    const data = read();
    if (!data || Date.now() - data.at > MAX_AGE || data.y < MIN_SCROLL) return;
    if (data.sig !== signature()) return;

    const state = app.state;
    let userActed = false;
    const stop = () => {
      userActed = true;
    };
    ["wheel", "touchstart", "keydown", "mousedown"].forEach((type) =>
      window.addEventListener(type, stop, { once: true, passive: true })
    );

    /*
     * Соседние модули (данные Danbooru, плотность сетки) в первые секунды могут перерисовать галерею
     * с начала. Поэтому несколько секунд проверяем и при необходимости возвращаем место снова,
     * пока пользователь сам не начал прокручивать.
     */
    const apply = () => {
      if (userActed || data.sig !== signature()) return;

      const target = Math.min(Number(data.rendered) || 0, state.filtered.length);

      /* дорисовываем столько карточек, сколько было; у превью заданы пропорции, высота не «прыгает» */
      let guard = 0;
      while (state.rendered < target && guard < 400) {
        const before = state.rendered;
        app.renderVisualMore();
        if (state.rendered === before) break;
        guard += 1;
      }

      if (Math.abs(window.scrollY - data.y) > 4) window.scrollTo(0, data.y);
    };

    let checks = 0;
    const tick = () => {
      apply();
      checks += 1;
      if (!userActed && checks < CHECKS) window.setTimeout(tick, CHECK_EVERY);
    };

    requestAnimationFrame(tick);
  }

  let attempts = 0;

  function waitForApp() {
    const candidate = window.STYLE_ARCHIVE_V003;
    const ready =
      candidate?.state &&
      candidate.state.styles?.length > 0 &&
      candidate.state.rendered > 0 &&
      typeof candidate.renderVisualMore === "function";

    if (ready) {
      app = candidate;
      restore();

      window.addEventListener("pagehide", save);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") save();
      });
      return;
    }

    attempts += 1;
    if (attempts < WAIT_ATTEMPTS) window.setTimeout(waitForApp, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForApp, { once: true });
  } else {
    waitForApp();
  }
})();
