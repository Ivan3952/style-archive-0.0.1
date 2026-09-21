(() => {
  "use strict";

  const DATA_URL = "./data/danbooru.json";
  const internal = window.STYLE_ARCHIVE_V003;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const normalize = (value) => String(value || "").trim().toLowerCase();

  const formatCount = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return "";
    if (n >= 1_000_000) {
      const v = n / 1_000_000;
      return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}M`;
    }
    if (n >= 1000) {
      const v = n / 1000;
      return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)}K`;
    }
    return String(n);
  };

const state = {
  records: new Map(),
  rawRecords: [],
  meta: null,
  ready: false,
};

  function isRussian() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("ru");
  }

  function t(en, ru) {
    return isRussian() ? ru : en;
  }

  function recordForName(name) {
    return state.records.get(normalize(name)) || null;
  }

  function countForName(name) {
    const record = recordForName(name);
    if (!record || record.status !== "matched") return 0;
    return Number(record.post_count || 0);
  }

  window.STYLE_ARCHIVE_DANBOORU = {
    countForName,
    recordForName,
    formatCount,
    get ready() { return state.ready; },
    get meta() { return state.meta; }
  };

  function attachCountsToAppState() {
    if (!internal?.state) return 0;

    const seen = new Set();
    let attached = 0;

    const visit = (style) => {
      if (!style || typeof style !== "object") return;
      if (!("name" in style) && !("copy_value" in style)) return;
      if (seen.has(style)) return;
      seen.add(style);

      const name = style.copy_value || style.name;
      const count = countForName(name);

      style.danbooru_post_count = count || 0;
      style.danbooru_record = recordForName(name);

      if (count) attached++;
    };

    for (const value of Object.values(internal.state)) {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value instanceof Map) {
        value.forEach((item) => {
          if (Array.isArray(item)) item.forEach(visit);
          else visit(item);
        });
      }
    }

    return attached;
  }

  function makeBadge(count) {
    const span = document.createElement("span");
    span.className = "danbooru-posts";
    span.dataset.danbooruPosts = String(count);
    span.title = t(`${count.toLocaleString("en-US")} DANBOORU POSTS`, `${count.toLocaleString("ru-RU")} ПОСТОВ DANBOORU`);
    span.textContent = formatCount(count);
    return span;
  }

  function decorateCard(card) {
    if (!card || card.dataset.danbooruDecorated === "1") return;
    const nameEl = $(".card-name", card);
    const metaEl = $(".card-meta", card);
    if (!nameEl || !metaEl) return;

    const count = countForName(nameEl.textContent);
    card.dataset.danbooruDecorated = "1";
    if (!count) return;

    metaEl.append(makeBadge(count));
  }

  function decorateSupportedRow(row) {
    if (!row || row.dataset.danbooruDecorated === "1") return;
    const nameEl = $(".supported-name", row);
    const actions = $(".supported-actions", row);
    if (!nameEl || !actions) return;

    const count = countForName(nameEl.textContent);
    row.dataset.danbooruDecorated = "1";
    if (!count) return;

    actions.prepend(makeBadge(count));
  }

  function decorateDrawerRow(row) {
    if (!row || row.dataset.danbooruDecorated === "1") return;
    const nameEl = $(".drawer-name", row);
    const meta = $(".drawer-meta", row);
    if (!nameEl || !meta) return;

    const count = countForName(nameEl.textContent);
    row.dataset.danbooruDecorated = "1";
    if (!count) return;

    meta.append(" · ");
    meta.append(makeBadge(count));
  }

  function decorateViewer() {
    const viewerName = $("#viewerName");
    const subline = $(".viewer-subline");
    if (!viewerName || !subline) return;

    $("#viewerDanbooruPosts")?.remove();

    const count = countForName(viewerName.textContent);
    if (!count) return;

    const badge = makeBadge(count);
    badge.id = "viewerDanbooruPosts";
    subline.append(badge);
  }

  function decorateAll(root = document) {
    $$(".card", root).forEach(decorateCard);
    $$(".supported-row", root).forEach(decorateSupportedRow);
    $$(".drawer-row", root).forEach(decorateDrawerRow);
    decorateViewer();
  }

  function resetDecorations(root = document) {
    $$("[data-danbooru-decorated='1']", root).forEach((el) => {
      el.dataset.danbooruDecorated = "0";
      $(".danbooru-posts", el)?.remove();
    });
    $("#viewerDanbooruPosts")?.remove();
  }

  function updateLocalization() {
    const label = $("#danbooruFilterLabel");
    if (label) label.textContent = t("DANBOORU POSTS", "ПОСТЫ DANBOORU");

    const all = $('[data-danbooru-min="0"]');
    if (all) all.textContent = t("ALL", "ВСЕ");

    const presenceLabel = $("#danbooruPresenceLabel");
    if (presenceLabel) {
      presenceLabel.textContent =
        t("DANBOORU DATA", "ДАННЫЕ DANBOORU");
    }

    const supportedPresenceLabel =
      $("#supportedDanbooruPresenceLabel");

    if (supportedPresenceLabel) {
      supportedPresenceLabel.textContent =
        t("DANBOORU DATA", "ДАННЫЕ DANBOORU");
    }

    $$(
  '[data-danbooru-presence="all"], ' +
  '[data-supported-danbooru-presence="all"]'
    ).forEach((button) => {
      button.textContent = t("ALL", "ВСЕ");
    });

    $$(
      '[data-danbooru-presence="on"], ' +
      '[data-supported-danbooru-presence="on"]'
    ).forEach((button) => {
      button.textContent = t("ON", "ЕСТЬ");
    });

    $$(
      '[data-danbooru-presence="no-data"], ' +
      '[data-supported-danbooru-presence="no-data"]'
    ).forEach((button) => {
      button.textContent = t("NO DATA", "НЕТ ДАННЫХ");
    });

    syncFilterButtons();
    updateSyncNote();
    updateInfo();
  }

  function generatedDate() {
    const raw = state.meta?.generated_at;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function updateSyncNote() {
    const note = $("#danbooruSyncNote");
    if (!note) return;

    if (!state.ready) {
      note.textContent = t("LOADING DANBOORU DATA", "ЗАГРУЗКА ДАННЫХ DANBOORU");
      return;
    }

    const date = generatedDate();
    const dateText = date
      ? date.toLocaleDateString(isRussian() ? "ru-RU" : "en-GB")
      : "—";

    note.textContent = t(`UPDATED ${dateText}`, `ОБНОВЛЕНО ${dateText}`);
  }

  function updateInfo() {
    const infoBody = $(".info-body");
    if (!infoBody || !state.ready) return;

    let block = $("#danbooruInfoBlock");

    if (!block) {
      block = document.createElement("section");
      block.className = "danbooru-info-block";
      block.id = "danbooruInfoBlock";

      const version = $(".info-version", infoBody);
      if (version) version.before(block);
      else infoBody.append(block);
    }

    const all = state.rawRecords;
    const matchedRows =
      all.filter((record) => record?.status === "matched");

    const visualRows =
      all.filter(
        (record) =>
          Array.isArray(record?.source) &&
          record.source.includes("visual")
      );

    const visualMatched =
      visualRows.filter(
        (record) => record?.status === "matched"
      ).length;

    const exact =
      matchedRows.filter(
        (record) => record?.match === "exact"
      ).length;

    const alias =
      matchedRows.filter(
        (record) => record?.match === "alias"
      ).length;

    const manual =
      matchedRows.filter(
        (record) => record?.match === "manual"
      ).length;

    const other = Math.max(
      0,
      matchedRows.length - exact - alias - manual
    );

    const noData =
      all.filter(
        (record) => record?.status !== "matched"
      ).length;

    const fmt = (value) =>
      Number(value || 0).toLocaleString("en-US");

    const pct = (part, total) =>
      total
        ? `${((part / total) * 100).toFixed(1)}%`
        : "—";

    block.innerHTML = `
      <div class="danbooru-info-title">
        DANBOORU DATA
      </div>

      <p class="danbooru-info-copy">
        ${t(
          "Post counts come from matched Danbooru artist tags. They count Danbooru posts, not unique artworks. The data is used only for archive statistics, sorting and filtering.",
          "Количество постов берётся из сопоставленных artist tags Danbooru. Это число постов на Danbooru, а не уникальных работ художника. Данные используются только для статистики, сортировки и фильтров."
        )}
      </p>

      <div class="danbooru-coverage-grid">
        <div class="danbooru-coverage-item">
          <b>${fmt(visualMatched)} / ${fmt(visualRows.length)}</b>
          <span>
            ${t("VISUAL COVERAGE", "ПОКРЫТИЕ VISUAL")}
            · ${pct(visualMatched, visualRows.length)}
          </span>
        </div>

        <div class="danbooru-coverage-item">
          <b>${fmt(matchedRows.length)} / ${fmt(all.length)}</b>
          <span>
            ${t("ALL LOCAL STYLES", "ВСЕ ЛОКАЛЬНЫЕ СТИЛИ")}
            · ${pct(matchedRows.length, all.length)}
          </span>
        </div>
      </div>

      <div class="danbooru-info-stats">
        <span>EXACT ${fmt(exact)}</span>
        <span>ALIAS ${fmt(alias)}</span>
        ${manual ? `<span>MANUAL ${fmt(manual)}</span>` : ""}
        <span>OTHER ${fmt(other)}</span>
        <span>${t("NO DATA", "НЕТ ДАННЫХ")} ${fmt(noData)}</span>
        <span>${t("SOURCE", "ИСТОЧНИК")} DANBOORU</span>
      </div>
    `;
  }

  function enableControls() {
    $$(".danbooru-control").forEach((button) => {
      button.disabled = false;
    });
  }

  function syncFilterButtons() {
    if (!internal?.state) return;

    const visualMin =
      Number(internal.state.danbooruMin || 0);

    const visualPresence =
      internal.state.danbooruPresence || "all";


    const supportedPresence =
      internal.state.supportedDanbooruPresence || "all";

    $$(".danbooru-filter-chip").forEach((button) => {
      if (button.dataset.danbooruMin !== undefined) {
        button.classList.toggle(
          "active",
          Number(button.dataset.danbooruMin || 0) ===
            visualMin
        );
      }

      if (button.dataset.danbooruPresence !== undefined) {
        button.classList.toggle(
          "active",
          button.dataset.danbooruPresence ===
            visualPresence
        );
      }

      if (
        button.dataset.supportedDanbooruPresence !==
        undefined
      ) {
        button.classList.toggle(
          "active",
          button.dataset.supportedDanbooruPresence ===
            supportedPresence
        );
      }

    });
  }

  function bindControls() {
    if (
      document.documentElement.dataset
        .danbooruDev4Bound === "1"
    ) return;

    document.documentElement.dataset
      .danbooruDev4Bound = "1";

    document.addEventListener("click", (event) => {
      if (!internal?.state) return;

      const min =
        event.target.closest("[data-danbooru-min]");

      if (min && !min.disabled) {
        const value =
          Number(min.dataset.danbooruMin || 0);

        internal.state.danbooruMin = value;

        if (value > 0) {
          internal.state.danbooruPresence = "on";
        }

        syncFilterButtons();
        internal.applyVisualFilters?.(true);
        return;
      }

      const presence =
        event.target.closest(
          "[data-danbooru-presence]"
        );

      if (presence && !presence.disabled) {
        const value =
          presence.dataset.danbooruPresence || "all";

        internal.state.danbooruPresence = value;

        if (value === "no-data") {
          internal.state.danbooruMin = 0;
        }

        syncFilterButtons();
        internal.applyVisualFilters?.(true);
        return;
      }

      const supportedPresence =
        event.target.closest(
          "[data-supported-danbooru-presence]"
        );

      if (
        supportedPresence &&
        !supportedPresence.disabled
      ) {
        const value =
          supportedPresence.dataset
            .supportedDanbooruPresence || "all";

        internal.state.supportedDanbooruPresence =
          value;

        if (value === "no-data") {
        }

        syncFilterButtons();
        internal.applySupportedFilters?.(true);
        return;
      }

      if (
        event.target.closest("#clearButton") ||
        event.target.closest("#supportedClearButton")
      ) {
        requestAnimationFrame(syncFilterButtons);
      }
    });
  }

  function watchDOM() {
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => decorateAll());
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const languageObserver = new MutationObserver(() => {
      updateLocalization();
      resetDecorations();
      requestAnimationFrame(() => decorateAll());
    });

    languageObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
  }

  async function waitForAppStyles(timeoutMs = 15000) {
    const start = performance.now();

    while (performance.now() - start < timeoutMs) {
      if (internal?.state) {
        const arrays = Object.values(internal.state).filter(Array.isArray);
        if (
          arrays.some((arr) =>
            arr.some((x) => x && typeof x === "object" && (x.name || x.copy_value))
          )
        ) {
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    return false;
  }

  async function init() {
    bindControls();
    watchDOM();
    updateLocalization();

    try {
      const response = await fetch(DATA_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      state.meta = data?.meta || {};
      const records = data?.styles || {};

      state.rawRecords = Object.values(records);

      for (const [name, record] of Object.entries(records)) {
        state.records.set(normalize(name), record);
      }

      state.ready = true;
      enableControls();
      updateLocalization();

      await waitForAppStyles();
      const attached = attachCountsToAppState();

      internal?.applyVisualFilters?.(true);
      internal?.applySupportedFilters?.(true);

      decorateAll();
      updateInfo();

      console.info(
        `[STYLE / ARCHIVE v0.0.3] Danbooru loaded: ` +
        `${state.records.size.toLocaleString()} records, ` +
        `${attached.toLocaleString()} visual objects decorated`
      );
    } catch (error) {
      console.error("[STYLE / ARCHIVE] Danbooru data failed:", error);

      const note = $("#danbooruSyncNote");
      if (note) {
        note.textContent = t(
          "DANBOORU DATA UNAVAILABLE",
          "ДАННЫЕ DANBOORU НЕДОСТУПНЫ"
        );
      }
    }
  }

  init();
})();
