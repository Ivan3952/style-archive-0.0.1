(() => {
  const VISUAL_PAGE_SIZE = window.innerWidth <= 680 ? 24 : 48;
  const SUPPORTED_PAGE_SIZE = window.innerWidth <= 680 ? 120 : 240;
  const SUPPORTED_TOTAL_FALLBACK = 59676;
  const VISUAL_SUPPORTED_PREVIEW_LIMIT = window.innerWidth <= 680 ? 10 : 18;
  const RECENT_LIMIT = 24;

  const readStoredArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const state = {
    mode: "visual",
    styles: [],
    archiveOrder: new Map(),
    styleById: new Map(),
    visualNameMap: new Map(),
    visualNameMeta: new Map(),
    visualSearchIndex: new Map(),
    relatedCache: new Map(),
    media: {},
    filtered: [],
    rendered: 0,
    activePreset: "all",
    visualSort: "archive",
    randomSortSeed: Date.now(),
    savedOnly: false,
    discoveryStyles: null,
    saved: new Set(readStoredArray("style-archive:saved")),
    tray: readStoredArray("style-archive:tray").filter((value) => typeof value === "string" && value.trim()),
    recent: readStoredArray("style-archive:recent").filter((value) => typeof value === "string"),
    drawerTab: "tray",
    viewerStyle: null,
    viewerMediaIndex: 0,
    toastTimer: null,
    columns: [],
    columnCount: 0,
    supported: null,
    supportedIndex: null,
    supportedPromise: null,
    supportedFiltered: [],
    supportedRendered: 0,
    supportedLastLetter: "",
    supportedLetter: "all",
    supportedFilter: "all",
  };

  const el = {
    brandVisualCount: document.querySelector("#brandVisualCount"),
    brandSupportedCount: document.querySelector("#brandSupportedCount"),
    visualStat: document.querySelector("#visualStat"),
    supportedStat: document.querySelector("#supportedStat"),
    savedCount: document.querySelector("#savedCount"),
    trayCount: document.querySelector("#trayCount"),
    recentCount: document.querySelector("#recentCount"),
    searchInput: document.querySelector("#searchInput"),
    resultCount: document.querySelector("#resultCount"),
    filterList: document.querySelector("#filterList"),
    sortList: document.querySelector("#sortList"),
    visualFilters: document.querySelector("#visualFilters"),
    supportedTools: document.querySelector("#supportedTools"),
    supportedFilterList: document.querySelector("#supportedFilterList"),
    alphabet: document.querySelector("#alphabet"),
    clearButton: document.querySelector("#clearButton"),
    supportedClearButton: document.querySelector("#supportedClearButton"),
    randomButton: document.querySelector("#randomButton"),
    randomMenu: document.querySelector("#randomMenu"),
    discoverButton: document.querySelector("#discoverButton"),
    recentButton: document.querySelector("#recentButton"),
    trayButton: document.querySelector("#trayButton"),
    savedButton: document.querySelector("#savedButton"),
    gallery: document.querySelector("#gallery"),
    statusLine: document.querySelector("#statusLine"),
    visualShell: document.querySelector("#visualShell"),
    supportedShell: document.querySelector("#supportedShell"),
    sentinel: document.querySelector("#loadSentinel"),
    supportedSentinel: document.querySelector("#supportedSentinel"),
    supportedList: document.querySelector("#supportedList"),
    supportedStatusLine: document.querySelector("#supportedStatusLine"),
    searchSupported: document.querySelector("#searchSupported"),
    searchSupportedTitle: document.querySelector("#searchSupportedTitle"),
    searchSupportedList: document.querySelector("#searchSupportedList"),
    showAllSupportedResults: document.querySelector("#showAllSupportedResults"),
    drawerBackdrop: document.querySelector("#drawerBackdrop"),
    utilityDrawer: document.querySelector("#utilityDrawer"),
    drawerTabs: [...document.querySelectorAll("[data-drawer-tab]")],
    closeDrawer: document.querySelector("#closeDrawer"),
    trayPanel: document.querySelector("#trayPanel"),
    recentPanel: document.querySelector("#recentPanel"),
    trayList: document.querySelector("#trayList"),
    recentList: document.querySelector("#recentList"),
    drawerTrayCount: document.querySelector("#drawerTrayCount"),
    drawerRecentCount: document.querySelector("#drawerRecentCount"),
    copyTrayButton: document.querySelector("#copyTrayButton"),
    clearTrayButton: document.querySelector("#clearTrayButton"),
    clearRecentButton: document.querySelector("#clearRecentButton"),
    toast: document.querySelector("#toast"),
    viewer: document.querySelector("#viewer"),
    viewerIndex: document.querySelector("#viewerIndex"),
    viewerImage: document.querySelector("#viewerImage"),
    viewerName: document.querySelector("#viewerName"),
    viewerPreset: document.querySelector("#viewerPreset"),
    viewerDate: document.querySelector("#viewerDate"),
    viewerImageCount: document.querySelector("#viewerImageCount"),
    viewerSave: document.querySelector("#viewerSave"),
    viewerTray: document.querySelector("#viewerTray"),
    viewerRelated: document.querySelector("#viewerRelated"),
    viewerRelatedList: document.querySelector("#viewerRelatedList"),
    closeViewer: document.querySelector("#closeViewer"),
    prevMedia: document.querySelector("#prevMedia"),
    nextMedia: document.querySelector("#nextMedia"),
    modeTabs: [...document.querySelectorAll("[data-mode]")],
  };

  const toLocalPath = (path) => {
    if (!path) return "";
    return path.startsWith("/") ? `.${path}` : path;
  };

  const pad = (value, width = 6) => String(value).padStart(width, "0");
  const prettyNumber = (value) => Number(value || 0).toLocaleString("en-US");

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replaceAll("ё", "е")
      .trim();

  const normalizeStyleName = (value) => normalize(value).replace(/\s+/g, " ");

  const compactSearch = (value) =>
    normalizeStyleName(value)
      .replace(/^@+/, "")
      .replace(/[^\p{L}\p{N}]+/gu, "");

  const searchTokens = (value) =>
    normalizeStyleName(value)
      .replace(/^@+/, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);

  const compactDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(d);
  };

  const getLetter = (name) => {
    const raw = normalizeStyleName(name).replace(/^@+/, "").trim();
    const first = raw.charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : "#";
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function boundedLevenshtein(a, b, maxDistance) {
    if (a === b) return 0;
    if (!a || !b) return Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = current[0];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost,
        );
        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }
      if (rowMin > maxDistance) return maxDistance + 1;
      previous = current;
    }

    return previous[b.length];
  }

  function fuzzyThreshold(length) {
    if (length <= 4) return 1;
    if (length <= 8) return 2;
    if (length <= 14) return 3;
    return 4;
  }

  function fuzzyDistance(queryCompact, entry) {
    if (!queryCompact || queryCompact.length < 3) return null;
    const maxDistance = fuzzyThreshold(queryCompact.length);
    const candidates = [...entry.tokens, entry.compact];
    let best = maxDistance + 1;

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (Math.abs(candidate.length - queryCompact.length) > maxDistance) continue;
      if (candidate[0] !== queryCompact[0] && !candidate.includes(queryCompact.slice(0, 2))) continue;
      const distance = boundedLevenshtein(queryCompact, candidate, maxDistance);
      if (distance < best) best = distance;
      if (best === 0) break;
    }

    return best <= maxDistance ? best : null;
  }

  function makeNameIndex(name) {
    return {
      name,
      norm: normalizeStyleName(name),
      compact: compactSearch(name),
      tokens: searchTokens(name),
      letter: getLetter(name),
    };
  }

  function savePersistentState() {
    localStorage.setItem("style-archive:saved", JSON.stringify([...state.saved]));
    localStorage.setItem("style-archive:tray", JSON.stringify(state.tray));
    localStorage.setItem("style-archive:recent", JSON.stringify(state.recent));
    updateUtilityCounts();
  }

  function updateUtilityCounts() {
    el.savedCount.textContent = state.saved.size;
    el.trayCount.textContent = state.tray.length;
    el.recentCount.textContent = state.recent.length;
    el.drawerTrayCount.textContent = state.tray.length;
    el.drawerRecentCount.textContent = state.recent.length;
  }

  function showToast(text) {
    window.clearTimeout(state.toastTimer);
    el.toast.textContent = text;
    el.toast.classList.add("show");
    state.toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), 950);
  }

  async function copyValue(value, toast = "COPIED") {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(toast);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showToast(toast);
    }
  }

  function copyStyle(style) {
    if (!style) return;
    return copyValue(style.copy_value || style.name || "");
  }

  function findStyle(id) {
    return state.styleById.get(id);
  }

  function previewStyleForName(name) {
    return state.visualNameMap.get(normalizeStyleName(name)) || null;
  }

  function previewMetaForName(name) {
    return state.visualNameMeta.get(normalizeStyleName(name)) || null;
  }

  function buildVisualLookup() {
    state.styleById = new Map();
    state.visualNameMap = new Map();
    state.visualNameMeta = new Map();
    state.visualSearchIndex = new Map();
    state.archiveOrder = new Map();

    state.styles.forEach((style, index) => {
      state.styleById.set(style.id, style);
      state.archiveOrder.set(style.id, index);
      state.visualSearchIndex.set(style.id, makeNameIndex(style.name || style.copy_value || ""));

      const aliases = [...new Set([style.name, style.copy_value].filter(Boolean).map(normalizeStyleName))];
      aliases.forEach((key) => {
        if (!key) return;

        if (!state.visualNameMap.has(key)) state.visualNameMap.set(key, style);

        if (!state.visualNameMeta.has(key)) {
          state.visualNameMeta.set(key, {
            style,
            records: new Set(),
            mediaIds: new Set(),
            presets: new Map(),
            presetMedia: new Map(),
          });
        }

        const meta = state.visualNameMeta.get(key);
        meta.records.add(style.id);
        (style.media || []).forEach((mediaId) => meta.mediaIds.add(mediaId));

        (style.presets || []).forEach((preset) => {
          const presetKey = normalize(preset);
          if (!presetKey) return;
          if (!meta.presets.has(presetKey)) meta.presets.set(presetKey, preset);
          if (!meta.presetMedia.has(presetKey)) meta.presetMedia.set(presetKey, new Set());
          (style.media || []).forEach((mediaId) => meta.presetMedia.get(presetKey).add(mediaId));
        });
      });
    });
  }

  function toggleSaved(styleId) {
    if (state.saved.has(styleId)) state.saved.delete(styleId);
    else state.saved.add(styleId);

    savePersistentState();

    document.querySelectorAll("[data-save-id]").forEach((button) => {
      if (button.dataset.saveId !== styleId) return;
      const active = state.saved.has(styleId);
      button.classList.toggle("saved", active);
      button.textContent = active ? "SAVED" : "SAVE";
    });

    if (state.viewerStyle?.id === styleId) updateViewerActions();
    if (state.savedOnly) applyVisualFilters(true);
    if (state.drawerTab === "recent" && !el.utilityDrawer.hidden) renderRecent();
  }

  function trayKey(name) {
    return normalizeStyleName(name);
  }

  function isInTray(name) {
    const key = trayKey(name);
    return state.tray.some((item) => trayKey(item) === key);
  }

  function toggleTray(name) {
    if (!name) return;
    const key = trayKey(name);
    const index = state.tray.findIndex((item) => trayKey(item) === key);

    if (index >= 0) {
      state.tray.splice(index, 1);
      showToast("REMOVED");
    } else {
      state.tray.push(name);
      showToast("ADDED");
    }

    savePersistentState();
    updateVisibleTrayButtons();
    if (!el.utilityDrawer.hidden && state.drawerTab === "tray") renderTray();
    updateViewerActions();
  }

  function removeFromTray(name) {
    const key = trayKey(name);
    state.tray = state.tray.filter((item) => trayKey(item) !== key);
    savePersistentState();
    updateVisibleTrayButtons();
    renderTray();
    updateViewerActions();
  }

  function updateVisibleTrayButtons() {
    document.querySelectorAll("[data-tray-name]").forEach((button) => {
      const active = isInTray(button.dataset.trayName);
      button.classList.toggle("added", active);
      if (button.classList.contains("card-tray")) button.textContent = active ? "ADDED" : "ADD";
      else if (button.classList.contains("supported-action")) button.textContent = active ? "ADDED" : "ADD";
    });
  }

  function addRecent(styleId) {
    if (!styleId) return;
    state.recent = [styleId, ...state.recent.filter((id) => id !== styleId)]
      .filter((id) => state.styleById.has(id))
      .slice(0, RECENT_LIMIT);
    savePersistentState();
    if (!el.utilityDrawer.hidden && state.drawerTab === "recent") renderRecent();
  }

  function buildFilters() {
    const presets = new Map();

    state.styles.forEach((style) => {
      (style.presets || []).forEach((preset) => {
        const key = normalize(preset);
        if (key && !presets.has(key)) presets.set(key, preset);
      });
    });

    const items = [["all", "ALL"], ...[...presets.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => [key, String(label).toUpperCase()])];

    el.filterList.innerHTML = items
      .map(([key, label]) => `<button class="filter-chip${key === "all" ? " active" : ""}" data-preset="${escapeHtml(key)}" type="button">${escapeHtml(label)}</button>`)
      .join("");
  }

  function buildAlphabet() {
    const letters = ["ALL", "#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
    el.alphabet.innerHTML = letters
      .map((label) => {
        const key = label === "ALL" ? "all" : label;
        return `<button class="alphabet-button${key === state.supportedLetter ? " active" : ""}" data-letter="${key}" type="button">${label}</button>`;
      })
      .join("");
  }

  function hasMetaPreset(meta, preset) {
    return Boolean(meta?.presets?.has(normalize(preset)));
  }

  function supportedFilterMatch(entry, filter = state.supportedFilter) {
    const meta = previewMetaForName(entry.name);
    if (filter === "all") return true;
    if (filter === "preview") return Boolean(meta);
    if (filter === "no-preview") return !meta;
    if (filter === "main") return hasMetaPreset(meta, "main");
    if (filter === "alt") return hasMetaPreset(meta, "alt");
    if (filter === "both") return hasMetaPreset(meta, "main") && hasMetaPreset(meta, "alt");
    return true;
  }

  function buildSupportedFilters() {
    if (!state.supportedIndex) return;

    const counts = {
      all: state.supportedIndex.length,
      preview: 0,
      "no-preview": 0,
      main: 0,
      alt: 0,
      both: 0,
    };

    state.supportedIndex.forEach((entry) => {
      const meta = previewMetaForName(entry.name);
      if (meta) counts.preview += 1;
      else counts["no-preview"] += 1;
      if (hasMetaPreset(meta, "main")) counts.main += 1;
      if (hasMetaPreset(meta, "alt")) counts.alt += 1;
      if (hasMetaPreset(meta, "main") && hasMetaPreset(meta, "alt")) counts.both += 1;
    });

    const items = [
      ["all", "ALL"],
      ["preview", "PREVIEW"],
      ["no-preview", "NO PREVIEW"],
      ["main", "MAIN"],
      ["alt", "ALT"],
      ["both", "MAIN + ALT"],
    ];

    el.supportedFilterList.innerHTML = items.map(([key, label]) => `
      <button class="supported-filter-chip${key === state.supportedFilter ? " active" : ""}" data-supported-filter="${key}" type="button">
        <span>${label}</span><small>${prettyNumber(counts[key])}</small>
      </button>
    `).join("");
  }

  async function loadSupported() {
    if (state.supported) return state.supported;
    if (state.supportedPromise) return state.supportedPromise;

    state.supportedPromise = fetch("./data/supported.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load supported styles");
        return response.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.styles || []);
        state.supported = rows
          .filter((name) => typeof name === "string" && name.trim())
          .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
        state.supportedIndex = state.supported.map(makeNameIndex);

        const count = state.supported.length;
        el.brandSupportedCount.textContent = pad(count);
        el.supportedStat.textContent = prettyNumber(count);
        buildSupportedFilters();
        return state.supported;
      })
      .catch((error) => {
        state.supportedPromise = null;
        console.error(error);
        showToast("SUPPORTED DATA ERROR");
        throw error;
      });

    return state.supportedPromise;
  }

  function visualSearchMatch(style, queryNorm, queryCompact) {
    if (!queryNorm) return { match: true, rank: 0 };

    const haystack = normalize([
      style.name,
      style.copy_value,
      ...(style.presets || []),
      ...(style.tags || []),
    ].join(" "));

    if (haystack.includes(queryNorm)) return { match: true, rank: 0 };

    const entry = state.visualSearchIndex.get(style.id);
    if (queryCompact && entry?.compact.includes(queryCompact)) return { match: true, rank: 1 };

    const distance = entry ? fuzzyDistance(queryCompact, entry) : null;
    if (distance !== null) return { match: true, rank: 10 + distance };

    return { match: false, rank: Infinity };
  }

  function sortVisualResults(rows, queryActive = false) {
    const result = [...rows];

    if (queryActive) {
      result.sort((a, b) => (a.rank - b.rank) || ((state.archiveOrder.get(a.style.id) || 0) - (state.archiveOrder.get(b.style.id) || 0)));
      return result.map((row) => row.style);
    }

    const styles = result.map((row) => row.style);
    if (state.visualSort === "newest") {
      return styles.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    }
    if (state.visualSort === "oldest") {
      return styles.sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0));
    }
    if (state.visualSort === "az") {
      return styles.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
    }
    if (state.visualSort === "random") {
      return styles.sort((a, b) => hashString(`${state.randomSortSeed}:${a.id}`) - hashString(`${state.randomSortSeed}:${b.id}`));
    }
    return styles.sort((a, b) => (state.archiveOrder.get(a.id) || 0) - (state.archiveOrder.get(b.id) || 0));
  }

  function applyVisualFilters(reset = false) {
    const queryNorm = normalize(el.searchInput.value);
    const queryCompact = compactSearch(el.searchInput.value);
    const source = state.discoveryStyles || state.styles;
    const scored = [];

    source.forEach((style) => {
      if (state.savedOnly && !state.saved.has(style.id)) return;

      if (state.activePreset !== "all") {
        const presets = (style.presets || []).map(normalize);
        if (!presets.includes(state.activePreset)) return;
      }

      const search = visualSearchMatch(style, queryNorm, queryCompact);
      if (!search.match) return;
      scored.push({ style, rank: search.rank });
    });

    state.filtered = sortVisualResults(scored, Boolean(queryNorm));

    if (queryNorm) el.resultCount.textContent = `${state.filtered.length} PREVIEWS`;
    else el.resultCount.textContent = `${state.filtered.length} / ${state.styles.length}`;

    el.statusLine.textContent = state.discoveryStyles
      ? `DISCOVER / ${state.filtered.length}`
      : state.savedOnly
        ? `SAVED / ${state.filtered.length}`
        : `VISUAL INDEX / ${state.filtered.length}`;

    if (reset) {
      state.rendered = 0;
      setupGalleryColumns(true);
    }

    renderVisualMore();

    if (queryNorm && !state.savedOnly) updateVisualSupportedMatches(queryNorm, queryCompact);
    else {
      el.searchSupported.hidden = true;
      el.searchSupportedList.innerHTML = "";
    }
  }

  function rankSupportedEntries(entries, queryNorm, queryCompact) {
    if (!queryNorm) return entries;

    const exact = [];
    const exactNames = new Set();

    entries.forEach((entry) => {
      if (entry.norm.includes(queryNorm) || (queryCompact && entry.compact.includes(queryCompact))) {
        exact.push(entry);
        exactNames.add(entry.name);
      }
    });

    if (!queryCompact || queryCompact.length < 3 || exact.length >= 80) return exact;

    const fuzzy = [];
    entries.forEach((entry) => {
      if (exactNames.has(entry.name)) return;
      const distance = fuzzyDistance(queryCompact, entry);
      if (distance === null) return;
      fuzzy.push({ entry, distance });
    });

    fuzzy.sort((a, b) => (a.distance - b.distance) || a.entry.name.localeCompare(b.entry.name, "en", { sensitivity: "base" }));
    return [...exact, ...fuzzy.slice(0, Math.max(0, 80 - exact.length)).map((row) => row.entry)];
  }

  async function updateVisualSupportedMatches(queryNorm, queryCompact) {
    try {
      await loadSupported();
      if (state.mode !== "visual" || normalize(el.searchInput.value) !== queryNorm) return;

      const ranked = rankSupportedEntries(state.supportedIndex, queryNorm, queryCompact);
      const additional = ranked.filter((entry) => !previewStyleForName(entry.name));

      if (!additional.length) {
        el.searchSupported.hidden = true;
        return;
      }

      el.searchSupported.hidden = false;
      el.searchSupportedTitle.textContent = `${prettyNumber(additional.length)} more supported matches`;
      el.searchSupportedList.innerHTML = additional
        .slice(0, VISUAL_SUPPORTED_PREVIEW_LIMIT)
        .map((entry, index) => supportedRowHtml(entry.name, index + 1, false))
        .join("");
      updateVisibleTrayButtons();
    } catch {
      el.searchSupported.hidden = true;
    }
  }

  function getColumnCount() {
    const width = window.innerWidth;
    if (width <= 390) return 1;
    if (width <= 680) return 2;
    if (width <= 980) return 3;
    if (width <= 1320) return 4;
    return 5;
  }

  function setupGalleryColumns(force = false) {
    const count = getColumnCount();
    if (!force && count === state.columnCount && state.columns.length) return;

    state.columnCount = count;
    el.gallery.style.setProperty("--gallery-cols", count);
    el.gallery.innerHTML = "";
    state.columns = [];

    for (let i = 0; i < count; i += 1) {
      const column = document.createElement("div");
      column.className = "gallery-column";
      el.gallery.appendChild(column);
      state.columns.push(column);
    }
  }

  function shortestColumn() {
    if (!state.columns.length) setupGalleryColumns(true);
    return state.columns.reduce((best, column) =>
      column.offsetHeight < best.offsetHeight ? column : best
    , state.columns[0]);
  }

  function renderVisualMore() {
    if (state.mode !== "visual" || state.rendered >= state.filtered.length) return;
    setupGalleryColumns();

    const slice = state.filtered.slice(state.rendered, state.rendered + VISUAL_PAGE_SIZE);

    slice.forEach((style) => {
      const archiveIndex = (state.archiveOrder.get(style.id) || 0) + 1;
      shortestColumn().appendChild(createCard(style, archiveIndex));
    });

    state.rendered += slice.length;
    updateVisibleTrayButtons();
  }

  function createCard(style, archiveIndex) {
    const card = document.createElement("article");
    card.className = "card";

    const firstMediaId = (style.media || [])[0];
    const media = state.media[firstMediaId] || {};
    const thumb = toLocalPath(media.thumb || media.src || "");
    const imageCount = (style.media || []).length;
    const saved = state.saved.has(style.id);
    const trayName = style.copy_value || style.name || "";

    const mediaWidth = Number(media.width) || 0;
    const mediaHeight = Number(media.height) || 0;
    const ratioStyle = mediaWidth > 0 && mediaHeight > 0
      ? ` style="aspect-ratio:${mediaWidth}/${mediaHeight}"`
      : "";
    const sizeAttrs = mediaWidth > 0 && mediaHeight > 0
      ? ` width="${mediaWidth}" height="${mediaHeight}"`
      : "";

    card.innerHTML = `
      <div class="card-media" data-open-id="${escapeHtml(style.id)}"${ratioStyle}>
        ${thumb ? `<img src="${escapeAttr(thumb)}"${sizeAttrs} loading="lazy" decoding="async" alt="${escapeAttr(style.name || "Style")}">` : ""}
        ${imageCount > 1 ? `<span class="card-image-count">×${imageCount}</span>` : ""}
      </div>
      <div class="card-bottom">
        <div class="card-index">
          <span>#${pad(archiveIndex)}</span>
          <span class="card-inline-actions">
            <button class="card-tray" data-tray-name="${escapeAttr(trayName)}" type="button">ADD</button>
            <button class="card-save${saved ? " saved" : ""}" data-save-id="${escapeHtml(style.id)}" type="button">${saved ? "SAVED" : "SAVE"}</button>
          </span>
        </div>
        <button class="card-name" data-copy-id="${escapeHtml(style.id)}" type="button">${escapeHtml(style.name || "Untitled")}</button>
        <div class="card-meta">
          ${(style.presets || []).map((p) => `<span>${escapeHtml(p)}</span>`).join("")}
          ${imageCount ? `<span>${imageCount} PREVIEW${imageCount === 1 ? "" : "S"}</span>` : ""}
          ${style.published_at ? `<span>${escapeHtml(compactDate(style.published_at))}</span>` : ""}
        </div>
      </div>
    `;

    const img = card.querySelector("img");
    if (img) {
      if (img.complete) img.classList.add("loaded");
      else img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    }

    return card;
  }

  function presetSummaryHtml(meta) {
    if (!meta) return "";
    const priority = ["main", "alt"];
    const keys = [...meta.presets.keys()].sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return a.localeCompare(b);
    });

    return keys.map((key) => {
      const label = String(meta.presets.get(key) || key).toUpperCase();
      const count = meta.presetMedia.get(key)?.size || 0;
      return `<span class="supported-preset">${escapeHtml(label)}${count ? ` ×${count}` : ""}</span>`;
    }).join("");
  }

  function supportedRowHtml(name, index, showNumber = true) {
    const previewMeta = previewMetaForName(name);
    const preview = previewMeta?.style || null;
    const trayAdded = isInTray(name);

    return `
      <div class="supported-row${preview ? " has-preview" : ""}">
        <button class="supported-name" data-supported-copy="${escapeAttr(name)}" type="button">${escapeHtml(name)}</button>
        <div class="supported-actions">
          ${showNumber ? `<span class="supported-number">${pad(index)}</span>` : ""}
          ${preview ? `<span class="supported-presets" aria-label="Available preview presets">${presetSummaryHtml(previewMeta)}</span>` : ""}
          ${preview ? `<button class="supported-action preview" data-preview-id="${escapeAttr(preview.id)}" type="button">PREVIEW ×${previewMeta.mediaIds.size}</button>` : ""}
          <button class="supported-action${trayAdded ? " added" : ""}" data-tray-name="${escapeAttr(name)}" type="button">${trayAdded ? "ADDED" : "ADD"}</button>
          <button class="supported-action" data-supported-copy="${escapeAttr(name)}" type="button">COPY</button>
        </div>
      </div>
    `;
  }

  function applySupportedFilters(reset = false) {
    if (!state.supportedIndex) return;

    const queryNorm = normalizeStyleName(el.searchInput.value);
    const queryCompact = compactSearch(el.searchInput.value);

    let base = state.supportedIndex.filter((entry) => {
      if (state.supportedLetter !== "all" && entry.letter !== state.supportedLetter) return false;
      if (!supportedFilterMatch(entry)) return false;
      return true;
    });

    state.supportedFiltered = rankSupportedEntries(base, queryNorm, queryCompact);

    el.resultCount.textContent = `${prettyNumber(state.supportedFiltered.length)} MATCHES`;
    const filterLabel = state.supportedFilter === "all" ? "" : ` / ${state.supportedFilter.toUpperCase()}`;
    el.supportedStatusLine.textContent = queryNorm
      ? `SUPPORTED SEARCH${filterLabel} / ${prettyNumber(state.supportedFiltered.length)}`
      : state.supportedLetter === "all"
        ? `SUPPORTED INDEX${filterLabel} / ${prettyNumber(state.supportedFiltered.length)}`
        : `${state.supportedLetter}${filterLabel} / ${prettyNumber(state.supportedFiltered.length)}`;

    if (reset) {
      state.supportedRendered = 0;
      state.supportedLastLetter = "";
      el.supportedList.innerHTML = "";
    }

    renderSupportedMore();
  }

  function renderSupportedMore() {
    if (state.mode !== "supported" || state.supportedRendered >= state.supportedFiltered.length) return;

    const start = state.supportedRendered;
    const slice = state.supportedFiltered.slice(start, start + SUPPORTED_PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    slice.forEach((entry, localIndex) => {
      const letter = entry.letter;
      if (letter !== state.supportedLastLetter) {
        const heading = document.createElement("div");
        heading.className = "supported-letter";
        heading.textContent = letter;
        fragment.appendChild(heading);
        state.supportedLastLetter = letter;
      }

      const wrap = document.createElement("div");
      wrap.innerHTML = supportedRowHtml(entry.name, start + localIndex + 1, true).trim();
      fragment.appendChild(wrap.firstElementChild);
    });

    if (!slice.length && start === 0) {
      const empty = document.createElement("div");
      empty.className = "supported-empty";
      empty.textContent = "No matching styles.";
      fragment.appendChild(empty);
    }

    el.supportedList.appendChild(fragment);
    state.supportedRendered += slice.length;
    updateVisibleTrayButtons();
  }

  async function setMode(mode) {
    if (mode !== "visual" && mode !== "supported") return;
    state.mode = mode;

    el.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
    el.visualShell.hidden = mode !== "visual";
    el.supportedShell.hidden = mode !== "supported";
    el.visualFilters.hidden = mode !== "visual";
    el.supportedTools.hidden = mode !== "supported";

    if (mode === "visual") {
      applyVisualFilters(true);
      return;
    }

    el.supportedStatusLine.textContent = "LOADING SUPPORTED INDEX";
    await loadSupported();
    buildAlphabet();
    buildSupportedFilters();
    applySupportedFilters(true);
  }

  function openViewer(style) {
    if (!style) return;
    state.viewerStyle = style;
    state.viewerMediaIndex = 0;
    addRecent(style.id);
    document.body.classList.add("viewer-open");
    if (!el.viewer.open) el.viewer.showModal();
    renderViewer();
  }

  function closeViewer() {
    if (el.viewer.open) el.viewer.close();
    state.viewerStyle = null;
    el.viewerImage.removeAttribute("src");
    el.viewerImage.alt = "";
    document.body.classList.remove("viewer-open");
  }

  function relatedStyles(style) {
    if (state.relatedCache.has(style.id)) return state.relatedCache.get(style.id);
    const presets = new Set((style.presets || []).map(normalize));
    const candidates = state.styles.filter((other) => {
      if (other.id === style.id || normalizeStyleName(other.name) === normalizeStyleName(style.name)) return false;
      return (other.presets || []).some((preset) => presets.has(normalize(preset)));
    });
    candidates.sort((a, b) => hashString(`${style.id}:${a.id}`) - hashString(`${style.id}:${b.id}`));
    const result = candidates.slice(0, 4);
    state.relatedCache.set(style.id, result);
    return result;
  }

  function renderViewerRelated(style) {
    const related = relatedStyles(style);
    if (!related.length) {
      el.viewerRelated.hidden = true;
      el.viewerRelatedList.innerHTML = "";
      return;
    }
    el.viewerRelated.hidden = false;
    el.viewerRelatedList.innerHTML = related
      .map((item) => `<button class="viewer-related-item" data-related-id="${escapeAttr(item.id)}" type="button">${escapeHtml(item.name)}</button>`)
      .join("");
  }

  function renderViewer() {
    const style = state.viewerStyle;
    if (!style) return;

    const mediaIds = style.media || [];
    const index = Math.min(state.viewerMediaIndex, Math.max(0, mediaIds.length - 1));
    state.viewerMediaIndex = index;

    const media = state.media[mediaIds[index]] || {};
    const src = toLocalPath(media.src || media.thumb || "");
    const archiveIndex = (state.archiveOrder.get(style.id) || 0) + 1;

    el.viewerIndex.textContent = `#${pad(archiveIndex)} / ${pad(state.styles.length)}`;
    el.viewerImage.src = src;
    el.viewerImage.alt = style.name || "Style";
    el.viewerName.textContent = style.name || "Untitled";
    el.viewerPreset.textContent = (style.presets || []).join(" / ").toUpperCase();
    el.viewerDate.textContent = compactDate(style.published_at);
    el.viewerImageCount.textContent = mediaIds.length ? `${mediaIds.length} PREVIEW${mediaIds.length === 1 ? "" : "S"}${mediaIds.length > 1 ? ` · ${index + 1}/${mediaIds.length}` : ""}` : "";

    const multiple = mediaIds.length > 1;
    el.prevMedia.hidden = !multiple;
    el.nextMedia.hidden = !multiple;
    updateViewerActions();
    renderViewerRelated(style);
  }

  function updateViewerActions() {
    const style = state.viewerStyle;
    if (!style) return;

    const saved = state.saved.has(style.id);
    el.viewerSave.classList.toggle("saved", saved);
    el.viewerSave.textContent = saved ? "SAVED" : "SAVE";

    const name = style.copy_value || style.name || "";
    const added = isInTray(name);
    el.viewerTray.classList.toggle("added", added);
    el.viewerTray.textContent = added ? "ADDED" : "ADD";
  }

  function shiftViewerMedia(delta) {
    const style = state.viewerStyle;
    if (!style) return;
    const count = (style.media || []).length;
    if (count < 2) return;
    state.viewerMediaIndex = (state.viewerMediaIndex + delta + count) % count;
    renderViewer();
  }

  function randomPool(mode) {
    if (mode === "main") return state.styles.filter((style) => (style.presets || []).map(normalize).includes("main"));
    if (mode === "alt") return state.styles.filter((style) => (style.presets || []).map(normalize).includes("alt"));
    if (mode === "saved") return state.styles.filter((style) => state.saved.has(style.id));
    return state.styles;
  }

  function randomStyle(mode = "any") {
    const pool = randomPool(mode);
    if (!pool.length) {
      showToast("EMPTY");
      return;
    }
    openViewer(pool[Math.floor(Math.random() * pool.length)]);
  }

  async function discoverStyles() {
    if (state.mode !== "visual") await setMode("visual");
    const pool = [...state.styles];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    state.discoveryStyles = pool.slice(0, 12);
    state.savedOnly = false;
    state.activePreset = "all";
    state.visualSort = "archive";
    el.searchInput.value = "";
    syncVisualControls();
    applyVisualFilters(true);
    window.scrollTo({ top: el.visualShell.offsetTop - 150, behavior: "smooth" });
  }

  function syncVisualControls() {
    el.filterList.querySelectorAll("[data-preset]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.preset === state.activePreset);
    });
    el.sortList.querySelectorAll("[data-sort]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.sort === state.visualSort);
    });
  }

  function clearVisualFilters() {
    el.searchInput.value = "";
    state.activePreset = "all";
    state.visualSort = "archive";
    state.savedOnly = false;
    state.discoveryStyles = null;
    syncVisualControls();
    applyVisualFilters(true);
  }

  function clearSupportedFilters() {
    el.searchInput.value = "";
    state.supportedLetter = "all";
    state.supportedFilter = "all";
    buildAlphabet();
    buildSupportedFilters();
    applySupportedFilters(true);
  }

  function openDrawer(tab = "tray") {
    state.drawerTab = tab;
    el.utilityDrawer.hidden = false;
    el.drawerBackdrop.hidden = false;
    document.body.classList.add("drawer-open");
    renderDrawer();
  }

  function closeDrawer() {
    el.utilityDrawer.hidden = true;
    el.drawerBackdrop.hidden = true;
    document.body.classList.remove("drawer-open");
  }

  function renderDrawer() {
    el.drawerTabs.forEach((button) => button.classList.toggle("active", button.dataset.drawerTab === state.drawerTab));
    el.trayPanel.hidden = state.drawerTab !== "tray";
    el.recentPanel.hidden = state.drawerTab !== "recent";
    if (state.drawerTab === "tray") renderTray();
    else renderRecent();
  }

  function drawerPresetText(meta) {
    if (!meta) return "SUPPORTED";
    const labels = [...meta.presets.values()].map((value) => String(value).toUpperCase());
    return labels.length ? labels.join(" / ") : "PREVIEW";
  }

  function renderTray() {
    if (!state.tray.length) {
      el.trayList.innerHTML = `<div class="drawer-empty">Add styles here, then copy the whole mix in one click.</div>`;
      return;
    }

    el.trayList.innerHTML = state.tray.map((name, index) => {
      const meta = previewMetaForName(name);
      const preview = meta?.style;
      return `
        <div class="drawer-row${preview ? " has-preview" : ""}">
          <span class="drawer-index">${pad(index + 1, 2)}</span>
          <div class="drawer-row-main">
            <button class="drawer-name" data-drawer-copy="${escapeAttr(name)}" type="button">${escapeHtml(name)}</button>
            <span class="drawer-meta">${escapeHtml(drawerPresetText(meta))}${meta ? ` · ${meta.mediaIds.size} PREVIEW${meta.mediaIds.size === 1 ? "" : "S"}` : ""}</span>
          </div>
          <div class="drawer-row-actions">
            ${preview ? `<button data-drawer-preview="${escapeAttr(preview.id)}" type="button">PREVIEW</button>` : ""}
            <button data-tray-remove="${escapeAttr(name)}" type="button">×</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderRecent() {
    const rows = state.recent.map(findStyle).filter(Boolean);
    if (!rows.length) {
      el.recentList.innerHTML = `<div class="drawer-empty">Viewed styles will appear here.</div>`;
      return;
    }

    el.recentList.innerHTML = rows.map((style, index) => {
      const firstMedia = state.media[(style.media || [])[0]] || {};
      const thumb = toLocalPath(firstMedia.thumb || firstMedia.src || "");
      const name = style.copy_value || style.name || "";
      return `
        <div class="recent-row">
          <button class="recent-thumb" data-drawer-preview="${escapeAttr(style.id)}" type="button">
            ${thumb ? `<img src="${escapeAttr(thumb)}" loading="lazy" decoding="async" alt="">` : ""}
          </button>
          <div class="drawer-row-main">
            <button class="drawer-name" data-drawer-copy="${escapeAttr(name)}" type="button">${escapeHtml(style.name || name)}</button>
            <span class="drawer-meta">${escapeHtml((style.presets || []).join(" / ").toUpperCase())}</span>
          </div>
          <div class="drawer-row-actions">
            <button class="${isInTray(name) ? "added" : ""}" data-tray-name="${escapeAttr(name)}" type="button">${isInTray(name) ? "ADDED" : "ADD"}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function bindSupportedListEvents(node) {
    node.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-preview-id]");
      if (preview) {
        openViewer(findStyle(preview.dataset.previewId));
        return;
      }

      const tray = event.target.closest("[data-tray-name]");
      if (tray) {
        toggleTray(tray.dataset.trayName);
        return;
      }

      const copy = event.target.closest("[data-supported-copy]");
      if (copy) copyValue(copy.dataset.supportedCopy);
    });
  }

  function bindEvents() {
    let searchTimer;

    el.searchInput.addEventListener("input", () => {
      state.discoveryStyles = null;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        if (state.mode === "visual") applyVisualFilters(true);
        else {
          state.supportedLetter = "all";
          buildAlphabet();
          applySupportedFilters(true);
        }
      }, 110);
    });

    el.filterList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-preset]");
      if (!button) return;
      state.discoveryStyles = null;
      state.activePreset = button.dataset.preset;
      state.savedOnly = false;
      syncVisualControls();
      applyVisualFilters(true);
    });

    el.sortList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sort]");
      if (!button) return;
      state.visualSort = button.dataset.sort;
      if (state.visualSort === "random") state.randomSortSeed = Date.now() + Math.random();
      syncVisualControls();
      applyVisualFilters(true);
    });

    el.supportedFilterList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-supported-filter]");
      if (!button || !state.supportedIndex) return;
      state.supportedFilter = button.dataset.supportedFilter;
      buildSupportedFilters();
      applySupportedFilters(true);
    });

    el.alphabet.addEventListener("click", (event) => {
      const button = event.target.closest("[data-letter]");
      if (!button || !state.supportedIndex) return;
      state.supportedLetter = button.dataset.letter;
      el.alphabet.querySelectorAll(".alphabet-button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      applySupportedFilters(true);
      window.scrollTo({ top: el.supportedShell.offsetTop - 150, behavior: "smooth" });
    });

    el.modeTabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

    el.gallery.addEventListener("click", (event) => {
      const copy = event.target.closest("[data-copy-id]");
      if (copy) {
        copyStyle(findStyle(copy.dataset.copyId));
        return;
      }

      const tray = event.target.closest("[data-tray-name]");
      if (tray) {
        toggleTray(tray.dataset.trayName);
        return;
      }

      const save = event.target.closest("[data-save-id]");
      if (save) {
        toggleSaved(save.dataset.saveId);
        return;
      }

      const open = event.target.closest("[data-open-id]");
      if (open) openViewer(findStyle(open.dataset.openId));
    });

    bindSupportedListEvents(el.supportedList);
    bindSupportedListEvents(el.searchSupportedList);

    el.clearButton.addEventListener("click", clearVisualFilters);
    el.supportedClearButton.addEventListener("click", clearSupportedFilters);

    el.randomButton.addEventListener("click", (event) => {
      event.stopPropagation();
      el.randomMenu.hidden = !el.randomMenu.hidden;
    });
    el.randomMenu.addEventListener("click", (event) => {
      const button = event.target.closest("[data-random-mode]");
      if (!button) return;
      el.randomMenu.hidden = true;
      randomStyle(button.dataset.randomMode);
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".random-wrap")) el.randomMenu.hidden = true;
    });

    el.discoverButton.addEventListener("click", discoverStyles);
    el.trayButton.addEventListener("click", () => openDrawer("tray"));
    el.recentButton.addEventListener("click", () => openDrawer("recent"));

    el.savedButton.addEventListener("click", async () => {
      if (state.mode !== "visual") await setMode("visual");
      state.discoveryStyles = null;
      state.savedOnly = !state.savedOnly;
      state.activePreset = "all";
      syncVisualControls();
      applyVisualFilters(true);
    });

    el.showAllSupportedResults.addEventListener("click", async () => {
      await setMode("supported");
      window.scrollTo({ top: el.supportedShell.offsetTop - 150, behavior: "smooth" });
    });

    el.drawerTabs.forEach((button) => button.addEventListener("click", () => {
      state.drawerTab = button.dataset.drawerTab;
      renderDrawer();
    }));
    el.closeDrawer.addEventListener("click", closeDrawer);
    el.drawerBackdrop.addEventListener("click", closeDrawer);
    el.copyTrayButton.addEventListener("click", () => {
      if (!state.tray.length) {
        showToast("TRAY EMPTY");
        return;
      }
      copyValue(state.tray.join(", "), "ALL COPIED");
    });
    el.clearTrayButton.addEventListener("click", () => {
      state.tray = [];
      savePersistentState();
      updateVisibleTrayButtons();
      renderTray();
      updateViewerActions();
    });
    el.clearRecentButton.addEventListener("click", () => {
      state.recent = [];
      savePersistentState();
      renderRecent();
    });

    el.utilityDrawer.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-drawer-preview]");
      if (preview) {
        openViewer(findStyle(preview.dataset.drawerPreview));
        return;
      }
      const copy = event.target.closest("[data-drawer-copy]");
      if (copy) {
        copyValue(copy.dataset.drawerCopy);
        return;
      }
      const remove = event.target.closest("[data-tray-remove]");
      if (remove) {
        removeFromTray(remove.dataset.trayRemove);
        return;
      }
      const tray = event.target.closest("[data-tray-name]");
      if (tray) toggleTray(tray.dataset.trayName);
    });

    el.closeViewer.addEventListener("click", closeViewer);
    el.viewer.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeViewer();
    });
    el.viewer.addEventListener("click", (event) => {
      if (event.target === el.viewer) closeViewer();
    });
    el.viewerName.addEventListener("click", () => copyStyle(state.viewerStyle));
    el.viewerSave.addEventListener("click", () => {
      if (state.viewerStyle) toggleSaved(state.viewerStyle.id);
    });
    el.viewerTray.addEventListener("click", () => {
      const style = state.viewerStyle;
      if (style) toggleTray(style.copy_value || style.name || "");
    });
    el.prevMedia.addEventListener("click", () => shiftViewerMedia(-1));
    el.nextMedia.addEventListener("click", () => shiftViewerMedia(1));
    el.viewerRelatedList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-related-id]");
      if (button) openViewer(findStyle(button.dataset.relatedId));
    });

    document.addEventListener("keydown", (event) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");

      if (event.key === "/" && !typing) {
        event.preventDefault();
        el.searchInput.focus();
        return;
      }

      if ((event.key === "r" || event.key === "R") && !typing && !el.viewer.open) {
        randomStyle("any");
        return;
      }

      if (event.key === "Escape" && !el.utilityDrawer.hidden) {
        closeDrawer();
        return;
      }

      if (el.viewer.open) {
        if (event.key === "ArrowLeft") shiftViewerMedia(-1);
        if (event.key === "ArrowRight") shiftViewerMedia(1);
        if ((event.key === "c" || event.key === "C") && !typing) copyStyle(state.viewerStyle);
      }
    });

    const visualObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) renderVisualMore();
    }, { rootMargin: "700px 0px" });
    visualObserver.observe(el.sentinel);

    const supportedObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) renderSupportedMore();
    }, { rootMargin: "900px 0px" });
    supportedObserver.observe(el.supportedSentinel);

    let resizeTimer;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const nextCount = getColumnCount();
        if (nextCount === state.columnCount || state.mode !== "visual") return;

        const keepRendered = state.rendered;
        state.rendered = 0;
        setupGalleryColumns(true);
        while (state.rendered < keepRendered && state.rendered < state.filtered.length) renderVisualMore();
      }, 160);
    });
  }

  async function init() {
    try {
      const [stylesResponse, mediaResponse] = await Promise.all([
        fetch("./data/styles.json"),
        fetch("./data/media.json"),
      ]);

      if (!stylesResponse.ok || !mediaResponse.ok) throw new Error("Could not load archive data");

      state.styles = await stylesResponse.json();
      state.media = await mediaResponse.json();
      buildVisualLookup();
      state.recent = state.recent.filter((id) => state.styleById.has(id)).slice(0, RECENT_LIMIT);

      const visualCount = state.styles.length;
      el.brandVisualCount.textContent = pad(visualCount);
      el.visualStat.textContent = prettyNumber(visualCount);
      el.brandSupportedCount.textContent = pad(SUPPORTED_TOTAL_FALLBACK);
      el.supportedStat.textContent = prettyNumber(SUPPORTED_TOTAL_FALLBACK);

      buildFilters();
      buildAlphabet();
      bindEvents();
      updateUtilityCounts();
      savePersistentState();
      syncVisualControls();
      applyVisualFilters(true);
    } catch (error) {
      console.error(error);
      el.statusLine.textContent = "ERROR / ARCHIVE DATA NOT FOUND";
      el.gallery.innerHTML = `
        <p style="color:#8b8984;max-width:720px;line-height:1.6">
          Не удалось загрузить <code>./data/styles.json</code> и <code>./data/media.json</code>.
          Запускай сайт через локальный HTTP-сервер, а не двойным кликом по index.html.
        </p>
      `;
    }
  }

  init();
})();
