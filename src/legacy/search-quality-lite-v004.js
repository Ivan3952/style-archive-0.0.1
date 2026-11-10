(() => {
  "use strict";

  const DEBOUNCE_MS = 300;
  const MAX_HINTS = 3;

  let input = null;
  let panel = null;
  let timer = null;

  let ready = false;

  let entries = [];
  let aliasMap = new Map();


  /* ======================================================
     NORMALIZATION
     ====================================================== */

  function clean(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }


  function norm(value) {
    return clean(value)
      .toLocaleLowerCase()
      .replace(/^@+/, "")
      .replace(/_/g, " ")
      .replace(/[‐-‒–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }


  function compact(value) {
    return norm(value)
      .replace(/[\s\-_.()[\]{}'"`~:/\\]+/g, "");
  }


  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  /* ======================================================
     ALIASES
     ====================================================== */

  function extractAliases(name) {
    const found = new Set();

    const matches =
      String(name || "")
        .matchAll(/\(([^()]+)\)/g);

    for (const match of matches) {
      const alias = clean(match[1]);

      if (alias.length >= 2) {
        found.add(alias);
      }
    }

    return [...found];
  }


  function addAlias(alias, canonical) {
    const key = norm(alias);

    if (
      !key ||
      key === norm(canonical)
    ) {
      return;
    }

    if (!aliasMap.has(key)) {
      aliasMap.set(key, []);
    }

    const rows = aliasMap.get(key);

    if (!rows.includes(canonical)) {
      rows.push(canonical);
    }
  }


  /* ======================================================
     BUILD INDEX ONCE
     ====================================================== */

  function buildIndex(styles) {
    entries = [];
    aliasMap = new Map();

    const seen = new Set();

    styles.forEach((style) => {
      const name = clean(style?.name);

      if (!name) {
        return;
      }

      const key = norm(name);

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      const aliases =
        extractAliases(name);

      const forms = [
        name,
        ...aliases,
      ];

      const compactForms =
        forms
          .map(compact)
          .filter(Boolean);

      entries.push({
        name,
        norm: key,
        compact: compact(name),
        compactForms,
        aliases,
      });

      aliases.forEach((alias) => {
        addAlias(alias, name);
      });
    });


    /*
      Length buckets make typo search cheaper.
      We only compare against strings with a
      plausible length.
    */

    entries.sort((a, b) => {
      return (
        a.compact.length -
        b.compact.length
      );
    });


    ready = true;

    console.info(
      `[v0.0.4] Search Lite index: ${entries.length} visual styles / ${aliasMap.size} aliases`
    );
  }


  function waitForArchive() {
    let attempts = 0;

    const waiter =
      window.setInterval(() => {
        attempts += 1;

        const styles =
          window
            .STYLE_ARCHIVE_V003
            ?.state
            ?.styles;

        if (
          Array.isArray(styles) &&
          styles.length
        ) {
          window.clearInterval(waiter);

          buildIndex(styles);

          schedule();
          return;
        }

        if (attempts >= 120) {
          window.clearInterval(waiter);

          console.warn(
            "[v0.0.4] Search Lite: visual archive not ready"
          );
        }
      }, 100);
  }


  /* ======================================================
     BOUNDED LEVENSHTEIN
     ====================================================== */

  function maxDistance(query) {
    const length =
      compact(query).length;

    if (length <= 4) {
      return 1;
    }

    if (length <= 8) {
      return 2;
    }

    return 3;
  }


  function distanceBounded(aRaw, bRaw, limit) {
    const a = compact(aRaw);
    const b = compact(bRaw);

    if (
      !a ||
      !b ||
      Math.abs(a.length - b.length) > limit
    ) {
      return null;
    }


    let previous =
      new Array(b.length + 1);

    for (
      let j = 0;
      j <= b.length;
      j += 1
    ) {
      previous[j] = j;
    }


    for (
      let i = 1;
      i <= a.length;
      i += 1
    ) {
      const current =
        new Array(b.length + 1);

      current[0] = i;

      let rowMin =
        current[0];


      for (
        let j = 1;
        j <= b.length;
        j += 1
      ) {
        const cost =
          a[i - 1] === b[j - 1]
            ? 0
            : 1;

        const value =
          Math.min(
            previous[j] + 1,
            current[j - 1] + 1,
            previous[j - 1] + cost
          );

        current[j] =
          value;

        if (value < rowMin) {
          rowMin = value;
        }
      }


      /*
        Important optimization:
        if every value in this row already
        exceeds the allowed distance, stop.
      */
      if (rowMin > limit) {
        return null;
      }

      previous = current;
    }


    const distance =
      previous[b.length];

    return distance <= limit
      ? distance
      : null;
  }


  /* ======================================================
     DIRECT MATCH
     ====================================================== */

  function hasDirectMatch(query) {
    const qn = norm(query);
    const qc = compact(query);

    if (!qn) {
      return false;
    }


    for (const entry of entries) {
      if (
        entry.norm.includes(qn) ||
        (
          qc &&
          entry.compact.includes(qc)
        )
      ) {
        return true;
      }


      for (
        const form
        of entry.compactForms
      ) {
        if (
          qc &&
          form.includes(qc)
        ) {
          return true;
        }
      }
    }

    return false;
  }


  /* ======================================================
     ALIAS LOOKUP — O(1)
     ====================================================== */

  function exactAliases(query) {
    const rows =
      aliasMap.get(
        norm(query)
      );

    if (!rows) {
      return [];
    }

    return rows.slice(
      0,
      MAX_HINTS
    );
  }


  /* ======================================================
     TYPO SEARCH
     ====================================================== */

  function didYouMean(query) {
    const qc =
      compact(query);

    if (
      qc.length < 3
    ) {
      return [];
    }


    if (
      hasDirectMatch(query)
    ) {
      return [];
    }


    const limit =
      maxDistance(query);

    const qLength =
      qc.length;

    const candidates = [];


    for (const entry of entries) {
      /*
        Cheap filter before Levenshtein.
      */
      if (
        Math.abs(
          entry.compact.length -
          qLength
        ) > limit
      ) {
        continue;
      }


      let best =
        distanceBounded(
          qc,
          entry.compact,
          limit
        );


      for (
        const aliasCompact
        of entry.compactForms
      ) {
        if (
          Math.abs(
            aliasCompact.length -
            qLength
          ) > limit
        ) {
          continue;
        }


        const aliasDistance =
          distanceBounded(
            qc,
            aliasCompact,
            limit
          );


        if (
          aliasDistance !== null &&
          (
            best === null ||
            aliasDistance < best
          )
        ) {
          best =
            aliasDistance;
        }
      }


      if (best === null) {
        continue;
      }


      candidates.push({
        name:
          entry.name,

        distance:
          best,
      });
    }


    candidates.sort((a, b) => {
      return (
        a.distance -
        b.distance
      )
      ||
      a.name.localeCompare(
        b.name,
        "en",
        {
          sensitivity:
            "base",
        }
      );
    });


    return candidates.slice(
      0,
      MAX_HINTS
    );
  }


  /* ======================================================
     QUERY SETTER
     ====================================================== */

  function setQuery(value) {
    const discovery =
      window
        .STYLE_ARCHIVE_DISCOVERY_V004;

    if (
      discovery &&
      typeof discovery.setQuery ===
        "function"
    ) {
      discovery.setQuery(value);
      return;
    }


    input.value =
      value;

    input.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true,
        }
      )
    );

    input.focus();
  }


  /* ======================================================
     RENDER
     ====================================================== */

  function hide() {
    if (!panel) {
      return;
    }

    panel.hidden = true;
    panel.innerHTML = "";
  }


  function render() {
    if (
      !ready ||
      !input ||
      !panel
    ) {
      hide();
      return;
    }


    const query =
      clean(input.value);

    if (
      query.length < 2
    ) {
      hide();
      return;
    }


    const aliases =
      exactAliases(query);


    if (aliases.length) {
      panel.innerHTML =
        aliases
          .map((name) => {
            return `
              <button
                type="button"
                class="search-lite-hint-v004"
                data-search-lite-query="${escapeHtml(name)}"
              >
                <span>ALIAS</span>
                ${escapeHtml(query)}
                <b>→</b>
                ${escapeHtml(name)}
              </button>
            `;
          })
          .join("");

      panel.hidden = false;
      return;
    }


    const suggestions =
      didYouMean(query);


    if (!suggestions.length) {
      hide();
      return;
    }


    panel.innerHTML =
      suggestions
        .map((row) => {
          return `
            <button
              type="button"
              class="search-lite-hint-v004"
              data-search-lite-query="${escapeHtml(row.name)}"
            >
              <span>DID YOU MEAN?</span>
              ${escapeHtml(row.name)}
            </button>
          `;
        })
        .join("");


    panel.hidden = false;
  }


  /* ======================================================
     DEBOUNCE
     ====================================================== */

  function schedule() {
    window.clearTimeout(timer);

    timer =
      window.setTimeout(
        render,
        DEBOUNCE_MS
      );
  }


  /* ======================================================
     MOUNT
     ====================================================== */

  function mount() {
    input =
      document.querySelector(
        "#searchInput"
      );

    const searchWrap =
      input?.closest(
        ".search-wrap"
      );


    if (
      !input ||
      !searchWrap
    ) {
      return;
    }


    panel =
      document.createElement(
        "div"
      );

    panel.className =
      "search-lite-panel-v004";

    panel.hidden =
      true;


    searchWrap.appendChild(
      panel
    );


    input.addEventListener(
      "input",
      schedule
    );


    panel.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-search-lite-query]"
          );

        if (!button) {
          return;
        }

        event.preventDefault();

        setQuery(
          button.dataset
            .searchLiteQuery
        );
      }
    );


    waitForArchive();
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      {
        once: true,
      }
    );
  }
  else {
    mount();
  }


  window.STYLE_ARCHIVE_SEARCH_LITE_V004 = {
    getStats() {
      return {
        ready,
        styles:
          entries.length,
        aliases:
          aliasMap.size,
      };
    },

    didYouMean,

    exactAliases,
  };
})();