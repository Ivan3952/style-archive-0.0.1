/*
 * «Новое с прошлого визита» 0.1.2.
 * Браузер помнит, какие стили уже были в архиве. Когда данные обновляются,
 * незнакомые стили получают метку «НОВОЕ» и собираются под кнопкой в строке фильтров.
 * Сравниваем состав, а не даты публикации: стиль может попасть на сайт позже, чем вышел.
 * Подключается до app.js (он вызывает compute после загрузки данных).
 */
(() => {
  "use strict";

  const archive = document.documentElement.dataset.archiveV004 || "am";
  const STORE_KEY = `style-archive:known-v006:${archive}`;
  const TTL = 7 * 24 * 60 * 60 * 1000;
  const WAIT_ATTEMPTS = 100;

  const tr = (ru, en) => (document.documentElement.lang === "en" ? en : ru);

  let freshIds = new Set();
  let freshStyles = [];
  let app = null;
  let chip = null;
  let computed = false;

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!parsed || typeof parsed.known !== "string") return null;
      return {
        known: parsed.known,
        fresh: Array.isArray(parsed.fresh) ? parsed.fresh.map(String) : [],
        at: Number(parsed.at) || 0,
      };
    } catch {
      return null;
    }
  }

  function writeStore(value) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(value));
    } catch {}
  }

  function compute(styles) {
    const ids = styles.map((style) => String(style.id));
    const now = Date.now();
    const store = readStore();

    freshIds = new Set();
    freshStyles = [];
    computed = true;

    /* первый визит: запоминаем состав и ничего не подсвечиваем */
    if (!store) {
      writeStore({ known: ids.join(","), fresh: [], at: 0 });
      return;
    }

    const known = new Set(store.known.split(","));
    const unknown = ids.filter((id) => !known.has(id));

    /* если «новых» больше половины архива, это смена данных, а не обновление */
    if (unknown.length > ids.length / 2) {
      writeStore({ known: ids.join(","), fresh: [], at: 0 });
      return;
    }

    const stillFresh = now - store.at <= TTL ? store.fresh : [];
    const fresh = [...new Set([...stillFresh, ...unknown])];
    const at = unknown.length ? now : store.at;

    writeStore({ known: ids.join(","), fresh, at });

    const present = new Set(ids);
    freshIds = new Set(fresh.filter((id) => present.has(id)));
    freshStyles = styles.filter((style) => freshIds.has(String(style.id)));
  }

  function dismiss() {
    const store = readStore();
    if (store) writeStore({ known: store.known, fresh: [], at: 0 });

    const wasActive = app && app.state.discoveryStyles === freshStyles;
    freshIds = new Set();
    freshStyles = [];

    document.querySelectorAll(".card-fresh-v006").forEach((node) => node.remove());
    chip?.remove();
    chip = null;

    if (wasActive) {
      app.state.discoveryStyles = null;
      app.applyVisualFilters(true);
    }
  }

  window.STYLE_ARCHIVE_FRESH_V006 = {
    compute,
    has: (id) => freshIds.has(String(id)),
    labelFor: (list) => (list && list === freshStyles ? tr("НОВОЕ", "NEW") : null),
    get count() {
      return freshStyles.length;
    },
  };

  /* ---------- кнопка в строке фильтров ---------- */

  function syncChip() {
    if (!chip) return;
    const active = app.state.discoveryStyles === freshStyles;
    chip.classList.toggle("active", active);
    chip.querySelector(".fresh-chip-main-v006").setAttribute("aria-pressed", String(active));
    chip.querySelector(".fresh-chip-label-v006").textContent = tr("НОВОЕ", "NEW");
    chip.querySelector(".fresh-chip-close-v006").title = tr(
      "Скрыть метки «Новое»",
      "Hide the “New” marks"
    );
  }

  function buildChip() {
    const groups = document.querySelector(".visual-filter-groups");
    if (!groups || !freshStyles.length) return false;

    chip = document.createElement("span");
    chip.className = "fresh-chip-v006";
    chip.innerHTML = `
      <button class="fresh-chip-main-v006" type="button" aria-pressed="false">
        <span class="fresh-chip-label-v006"></span>
        <span class="fresh-chip-count-v006">${freshStyles.length}</span>
      </button>
      <button class="fresh-chip-close-v006" type="button" aria-label="×">×</button>
    `;

    chip.querySelector(".fresh-chip-main-v006").addEventListener("click", () => {
      const state = app.state;
      const active = state.discoveryStyles === freshStyles;

      state.discoveryStyles = active ? null : freshStyles;
      if (!active) state.savedOnly = false;

      app.syncVisualControls();
      app.applyVisualFilters(true);
    });

    chip.querySelector(".fresh-chip-close-v006").addEventListener("click", dismiss);

    groups.prepend(chip);
    syncChip();
    return true;
  }

  let attempts = 0;

  function waitForApp() {
    const candidate = window.STYLE_ARCHIVE_V003;
    /* compute вызывается чуть позже появления стилей, поэтому ждём именно его */
    const ready = computed && candidate?.state && candidate.state.styles?.length > 0;

    if (ready) {
      app = candidate;
      if (!freshStyles.length) return;
      if (!buildChip()) return;

      window.addEventListener("style-archive:filters", syncChip);
      new MutationObserver(syncChip).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang"],
      });
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
