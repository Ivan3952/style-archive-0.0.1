(() => {
  "use strict";

  const MODES = new Set(["smart", "word", "contains"]);

  let mode = "smart";

  /* =========================
     NORMALIZATION
     ========================= */

  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replaceAll("ё", "е")
      .trim()
      .replace(/\s+/g, " ");

  const tokens = (value) =>
    normalize(value)
      .replace(/^@+/, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);

  const canonical = (value) => tokens(value).join(" ");

  const compact = (value) => tokens(value).join("");

  function prepare(value) {
    const list = tokens(value);

    return {
      tokens: list,
      canonical: list.join(" "),
      compact: list.join(""),
      active: list.length > 0,
    };
  }

  function prepareEntry(entry) {
    const list = Array.isArray(entry?.tokens) ? entry.tokens : tokens(entry?.name);

    return {
      name: String(entry?.name || ""),
      tokens: list,
      canonical: entry?.canonical || list.join(" "),
      compact: entry?.compact || list.join(""),
    };
  }

  /* =========================
     FUZZY
     ========================= */

  function threshold(length) {
    if (length <= 4) return 1;
    if (length <= 8) return 2;
    if (length <= 14) return 3;
    return 4;
  }

  function levenshtein(a, b, maxDistance) {
    if (a === b) return 0;

    if (Math.abs(a.length - b.length) > maxDistance) {
      return maxDistance + 1;
    }

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = i;

      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);

        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }

      if (rowMin > maxDistance) {
        return maxDistance + 1;
      }

      previous = current;
    }

    return previous[b.length];
  }

  function fuzzyWords(queryTokens, entryTokens) {
    if (!queryTokens.length || !entryTokens.length) {
      return null;
    }

    let total = 0;

    for (const query of queryTokens) {
      if (query.length < 3) {
        return null;
      }

      const max = threshold(query.length);

      let best = max + 1;

      for (const candidate of entryTokens) {
        if (Math.abs(candidate.length - query.length) > max) {
          continue;
        }

        const distance = levenshtein(query, candidate, max);

        best = Math.min(best, distance);

        if (best === 0) break;
      }

      if (best > max) {
        return null;
      }

      total += best;
    }

    return total;
  }

  /* =========================
     DANBOORU ALIASES
     ========================= */

  const aliasMap = new Map();
  const aliasPairSeen = new Set();

  let aliasPairs = 0;
  let aliasesReady = false;

  function aliasKeys(value) {
    const norm = normalize(value);

    const canon = canonical(value);

    const comp = compact(value);

    return [norm ? `n:${norm}` : "", canon ? `c:${canon}` : "", comp ? `x:${comp}` : ""].filter(
      Boolean
    );
  }

  function addAlias(localName, aliasName) {
    if (!localName || !aliasName) {
      return;
    }

    /*
     * ???? canonical ? local
     * ?????????? ?????????? ?
     * ??? ?? alias ??? ??????.
     */

    if (compact(localName) === compact(aliasName)) {
      return;
    }

    const pairKey = `${compact(localName)}::${compact(aliasName)}`;

    if (aliasPairSeen.has(pairKey)) {
      return;
    }

    aliasPairSeen.add(pairKey);

    for (const key of aliasKeys(localName)) {
      if (!aliasMap.has(key)) {
        aliasMap.set(key, new Set());
      }

      aliasMap.get(key).add(aliasName);
    }

    aliasPairs += 1;
  }

  function aliasesFor(name) {
    const found = new Set();

    for (const key of aliasKeys(name)) {
      const values = aliasMap.get(key);

      if (!values) {
        continue;
      }

      for (const alias of values) {
        found.add(alias);
      }
    }

    return [...found];
  }

  async function loadDanbooruAliases() {
    try {
      const response = await fetch("./data/danbooru.min.json");

      if (!response.ok) {
        throw new Error(`Danbooru aliases: HTTP ${response.status}`);
      }

      const data = await response.json();

      const rows = data?.styles && typeof data.styles === "object" ? data.styles : data;

      if (!rows || typeof rows !== "object") {
        throw new Error("Danbooru aliases: invalid data");
      }

      for (const [localName, record] of Object.entries(rows)) {
        if (!record || typeof record !== "object") {
          continue;
        }

        if (record.status !== "matched" || record.match !== "alias") {
          continue;
        }

        const danbooruTag = String(record.danbooru_tag || "").trim();

        if (!danbooruTag) {
          continue;
        }

        /*
         * ?????? localName ?
         * matched_candidate ?????????,
         * ?? ??????????? ??? ?
         * ??? ?????????? ??? ???????
         * ?????? ????.
         */

        addAlias(localName, danbooruTag);

        if (record.matched_candidate) {
          addAlias(record.matched_candidate, danbooruTag);
        }
      }

      aliasesReady = true;

      console.info(`[STYLE / ARCHIVE v0.0.4-dev2] Danbooru aliases loaded: ${aliasPairs}`);

      /*
       * ???? ???????????? ??? ???-??
       * ???? ?? ????? ???????? JSON ?
       * ????????? ??????????.
       */

      refresh();

      return aliasPairs;
    } catch (error) {
      console.warn("[STYLE / ARCHIVE v0.0.4-dev2] Alias index unavailable", error);

      aliasesReady = false;

      return 0;
    }
  }

  /* =========================
     MATCHING
     ========================= */

  function allExactWords(query, entry) {
    return query.tokens.every((token) => entry.tokens.includes(token));
  }

  function allWordPrefixes(query, entry) {
    return query.tokens.every((token) =>
      entry.tokens.some((candidate) => candidate.startsWith(token))
    );
  }

  function smart(entry, query, fuzzy = true) {
    if (!query.active) {
      return {
        match: true,
        rank: 0,
      };
    }

    /* EXACT NAME */

    if (entry.canonical === query.canonical || entry.compact === query.compact) {
      return {
        match: true,
        rank: 0,
        reason: "exact",
      };
    }

    /* EXACT WORD */

    if (allExactWords(query, entry)) {
      return {
        match: true,
        rank: 10,
        reason: "word",
      };
    }

    /* STARTS WITH */

    if (entry.canonical.startsWith(query.canonical) || entry.compact.startsWith(query.compact)) {
      return {
        match: true,
        rank: 20,
        reason: "starts",
      };
    }

    /* WORD STARTS WITH */

    if (allWordPrefixes(query, entry)) {
      return {
        match: true,
        rank: 30,
        reason: "word-starts",
      };
    }

    /* CONTAINS */

    if (entry.canonical.includes(query.canonical) || entry.compact.includes(query.compact)) {
      return {
        match: true,
        rank: 40,
        reason: "contains",
      };
    }

    if (!fuzzy) {
      return {
        match: false,
        rank: Infinity,
      };
    }

    /* FUZZY */

    const distance = fuzzyWords(query.tokens, entry.tokens);

    if (distance !== null) {
      return {
        match: true,
        rank: 60 + distance,
        reason: "fuzzy",
      };
    }

    return {
      match: false,
      rank: Infinity,
    };
  }

  function word(entry, query, fuzzy = true) {
    if (!query.active) {
      return {
        match: true,
        rank: 0,
      };
    }

    if (allExactWords(query, entry)) {
      return {
        match: true,
        rank: entry.canonical === query.canonical ? 0 : 10,
      };
    }

    if (allWordPrefixes(query, entry)) {
      return {
        match: true,
        rank: 20,
      };
    }

    if (!fuzzy) {
      return {
        match: false,
        rank: Infinity,
      };
    }

    const distance = fuzzyWords(query.tokens, entry.tokens);

    if (distance !== null) {
      return {
        match: true,
        rank: 40 + distance,
      };
    }

    return {
      match: false,
      rank: Infinity,
    };
  }

  function contains(entry, query) {
    if (!query.active) {
      return {
        match: true,
        rank: 0,
      };
    }

    const found =
      entry.canonical.includes(query.canonical) || entry.compact.includes(query.compact);

    return {
      match: found,
      rank: found ? 0 : Infinity,
    };
  }

  function matchEntry(rawEntry, rawQuery, allowFuzzy = true) {
    const entry = prepareEntry(rawEntry);

    const query = prepare(rawQuery);

    if (mode === "word") {
      return word(entry, query, allowFuzzy);
    }

    if (mode === "contains") {
      return contains(entry, query);
    }

    return smart(entry, query, allowFuzzy);
  }

  function matchEntryWithAliases(rawEntry, rawQuery, allowFuzzy = true) {
    const entry = prepareEntry(rawEntry);

    /*
     * ??????? ?????? ?????????
     * ??? ?????.
     */

    let best = matchEntry(entry, rawQuery, allowFuzzy);

    /*
     * Alias ???????? +5 rank:
     *
     * exact name   0
     * exact alias  5
     * word        10
     * alias word  15
     * starts      20
     * alias       25
     * contains    40
     * alias       45
     * fuzzy       60+
     * alias       65+
     */

    for (const alias of aliasesFor(entry.name)) {
      const result = matchEntry(
        {
          name: alias,
        },
        rawQuery,
        allowFuzzy
      );

      if (!result.match) {
        continue;
      }

      const aliasResult = {
        ...result,

        rank: result.rank + 5,

        reason: result.reason ? `alias-${result.reason}` : "alias",

        alias,
      };

      if (!best.match || aliasResult.rank < best.rank) {
        best = aliasResult;
      }
    }

    return best;
  }

  /* =========================
     VISUAL
     ========================= */

  function matchVisual(style, existingEntry, rawQuery) {
    const entries = [];

    if (existingEntry) {
      entries.push(existingEntry);
    }

    const copyValue = style?.copy_value;

    if (copyValue && normalize(copyValue) !== normalize(style?.name)) {
      entries.push({
        name: copyValue,
        tokens: tokens(copyValue),
        compact: compact(copyValue),
      });
    }

    let best = {
      match: false,
      rank: Infinity,
    };

    for (const entry of entries) {
      const result = matchEntryWithAliases(entry, rawQuery, true);

      if (result.match && result.rank < best.rank) {
        best = result;
      }
    }

    return best;
  }

  /* =========================
     SUPPORTED
     ========================= */

  function rankEntries(entries, rawQuery) {
    const query = prepare(rawQuery);

    if (!query.active) {
      return entries;
    }

    const direct = [];
    const fuzzy = [];

    for (const entry of entries) {
      const directResult = matchEntryWithAliases(entry, rawQuery, false);

      if (directResult.match) {
        direct.push({
          entry,
          rank: directResult.rank,
        });

        continue;
      }

      /*
       * Не ебём Levenshtein
       * по 60k строк, если уже
       * хватает нормальных результатов.
       */

      if (mode !== "contains" && direct.length < 80 && query.compact.length >= 3) {
        const result = matchEntryWithAliases(entry, rawQuery, true);

        if (result.match) {
          fuzzy.push({
            entry,
            rank: result.rank,
          });
        }
      }
    }

    const sorter = (a, b) =>
      a.rank - b.rank ||
      a.entry.name.localeCompare(b.entry.name, "en", {
        sensitivity: "base",
      });

    direct.sort(sorter);

    if (mode === "contains" || direct.length >= 80) {
      return direct.map((row) => row.entry);
    }

    fuzzy.sort(sorter);

    return [
      ...direct.map((row) => row.entry),

      ...fuzzy.slice(0, Math.max(0, 80 - direct.length)).map((row) => row.entry),
    ];
  }

  /* =========================
     SEARCH MODE UI
     ========================= */

  function refresh() {
    const input = document.querySelector("#searchInput");

    if (!input) return;

    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    );
  }

  function setMode(next) {
    if (!MODES.has(next)) {
      next = "smart";
    }

    mode = next;

    document.querySelectorAll("[data-search-mode-v004]").forEach((button) => {
      button.classList.toggle("active", button.dataset.searchModeV004 === mode);
    });

    refresh();
  }

  function mount() {
    const input = document.querySelector("#searchInput");

    const searchWrap = input?.closest(".search-wrap");

    if (!input || !searchWrap || document.querySelector(".search-mode-v004")) {
      return;
    }

    const controls = document.createElement("div");

    controls.className = "search-mode-v004";

    controls.innerHTML = `
      <span>MODE</span>

      <button
        type="button"
        data-search-mode-v004="smart"
      >
        SMART
      </button>

      <button
        type="button"
        data-search-mode-v004="word"
      >
        WORD
      </button>

      <button
        type="button"
        data-search-mode-v004="contains"
      >
        CONTAINS
      </button>
    `;

    searchWrap.insertAdjacentElement("afterend", controls);

    controls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-search-mode-v004]");

      if (!button) return;

      setMode(button.dataset.searchModeV004);

      input.focus();
    });

    const style = document.createElement("style");

    style.textContent = `

      .search-mode-v004 {
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:7px;
        margin-top:10px;
      }

      .search-mode-v004 > span {
        margin-right:2px;
        color:var(--muted-2);
        font-family: var(--font-mono);
        font-size:9px;
        letter-spacing:.045em;
      }

      .search-mode-v004 button {
        appearance:none;
        padding:5px 8px;
        border:
          1px solid
          var(--line);
        border-radius:999px;
        background:transparent;
        color:var(--muted);
        font-family: var(--font-mono);
        font-size:9px;
        cursor:pointer;
      }

      .search-mode-v004 button:hover {
        border-color:var(--text);
        color:var(--text);
      }

      .search-mode-v004 button.active {
        border-color:var(--accent);
        background:var(--accent);
        color:var(--bg);
      }

      @media(max-width:680px) {

        .search-mode-v004 > span {
          display:none;
        }

        .search-mode-v004 {
          gap:5px;
          margin-top:8px;
        }

        .search-mode-v004 button {
          padding:5px 7px;
          font-size:8px;
        }

      }

    `;

    document.head.appendChild(style);

    setMode("smart");
  }

  window.STYLE_ARCHIVE_SEARCH_V004 = {
    version: "0.0.4-dev2",

    matchVisual,
    rankEntries,
    setMode,
    aliasesFor,

    getAliasCount() {
      return aliasPairs;
    },

    aliasesReady() {
      return aliasesReady;
    },

    getMode() {
      return mode;
    },
  };

  mount();
  loadDanbooruAliases();

  console.info("[STYLE / ARCHIVE v0.0.4-dev2] Search Core loaded");
})();
