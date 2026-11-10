(() => {
  "use strict";


  /* ======================================================
     CONFIG
     ====================================================== */

  const HISTORY_KEY =
    "style-archive:search-history-v004";

  const MAX_HISTORY =
    8;

  const SAVE_DELAY =
    900;

  const HIGHLIGHT_SELECTOR = [
    ".card-name",
    ".supported-name",
    ".viewer-name",
  ].join(",");


  /* ======================================================
     HELPERS
     ====================================================== */

  function cleanQuery(
    value
  ) {
    return String(
      value || ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }


  function readHistory() {
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(
            HISTORY_KEY
          )
          ||
          "[]"
        );


      if (
        !Array.isArray(
          parsed
        )
      ) {
        return [];
      }


      const seen =
        new Set();


      return parsed
        .map(
          cleanQuery
        )
        .filter(
          (
            value
          ) => {
            if (!value) {
              return false;
            }


            const key =
              value.toLocaleLowerCase();


            if (
              seen.has(
                key
              )
            ) {
              return false;
            }


            seen.add(
              key
            );


            return true;
          }
        )
        .slice(
          0,
          MAX_HISTORY
        );
    }
    catch {
      return [];
    }
  }


  function writeHistory(
    rows
  ) {
    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(
          rows.slice(
            0,
            MAX_HISTORY
          )
        )
      );
    }
    catch {}
  }


  function escapeHtml(
    value
  ) {
    return String(
      value || ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      );
  }


  function escapeRegex(
    value
  ) {
    return String(
      value || ""
    ).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }


  /* ======================================================
     STATE
     ====================================================== */

  let historyRows =
    readHistory();

  let saveTimer =
    null;

  let bar =
    null;

  let input =
    null;


  /* ======================================================
     URL / DEEP LINK
     ====================================================== */

  function syncUrl() {
    if (!input) {
      return;
    }


    const query =
      cleanQuery(
        input.value
      );


    const url =
      new URL(
        window.location.href
      );


    if (query) {
      url.searchParams.set(
        "q",
        query
      );
    }
    else {
      url.searchParams.delete(
        "q"
      );
    }


    window.history.replaceState(
      window.history.state,
      "",
      url.href
    );
  }


  function initialQuery() {
    try {
      return cleanQuery(
        new URL(
          window.location.href
        )
        .searchParams
        .get(
          "q"
        )
      );
    }
    catch {
      return "";
    }
  }


  /* ======================================================
     HISTORY
     ====================================================== */

  function saveQuery(
    raw
  ) {
    const query =
      cleanQuery(
        raw
      );


    if (
      query.length < 2
    ) {
      return;
    }


    const lower =
      query.toLocaleLowerCase();


    historyRows = [
      query,

      ...historyRows.filter(
        (
          item
        ) =>
          item
            .toLocaleLowerCase()
          !==
          lower
      ),
    ].slice(
      0,
      MAX_HISTORY
    );


    writeHistory(
      historyRows
    );


    renderBar();
  }


  function scheduleSave() {
    window.clearTimeout(
      saveTimer
    );


    const query =
      cleanQuery(
        input?.value
      );


    if (
      query.length < 2
    ) {
      return;
    }


    saveTimer =
      window.setTimeout(
        () => {
          saveQuery(
            query
          );
        },
        SAVE_DELAY
      );
  }


  function clearHistory() {
    historyRows = [];


    writeHistory(
      []
    );


    renderBar();
  }


  /* ======================================================
     SET QUERY
     ====================================================== */

  function refreshSearch() {
    if (!input) {
      return;
    }


    input.dispatchEvent(
      new Event(
        "input",
        {
          bubbles:
            true,
        }
      )
    );
  }


  function setQuery(
    value,
    options = {}
  ) {
    if (!input) {
      return;
    }


    const query =
      cleanQuery(
        value
      );


    input.value =
      query;


    if (
      options.save !==
      false
    ) {
      saveQuery(
        query
      );
    }


    syncUrl();

    refreshSearch();

    refreshHighlights();

    renderBar();


    if (
      options.focus !==
      false
    ) {
      input.focus();


      try {
        input.setSelectionRange(
          input.value.length,
          input.value.length
        );
      }
      catch {}
    }
  }


  /* ======================================================
     COPY LINK
     ====================================================== */

  async function copyText(
    value
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          value
        );

      return true;
    }
    catch {}


    try {
      const temp =
        document.createElement(
          "textarea"
        );


      temp.value =
        value;


      temp.style.position =
        "fixed";

      temp.style.opacity =
        "0";

      temp.style.pointerEvents =
        "none";


      document.body.appendChild(
        temp
      );


      temp.select();


      const ok =
        document.execCommand(
          "copy"
        );


      temp.remove();


      return ok;
    }
    catch {
      return false;
    }
  }


  async function copySearchLink() {
    syncUrl();


    const button =
      bar?.querySelector(
        "[data-search-copy-link]"
      );


    const ok =
      await copyText(
        window.location.href
      );


    if (!button) {
      return;
    }


    const previous =
      button.textContent;


    button.textContent =
      ok
        ? "COPIED"
        : "ERROR";


    window.setTimeout(
      () => {
        button.textContent =
          previous;
      },
      900
    );
  }


  /* ======================================================
     BAR
     ====================================================== */

  function renderBar() {
    if (!bar) {
      return;
    }


    const query =
      cleanQuery(
        input?.value
      );


    const chips =
      historyRows
        .map(
          (
            item
          ) => `
            <button
              class="search-history-chip-v004"
              type="button"
              data-search-history-v004="${escapeHtml(item)}"
              title="${escapeHtml(item)}"
            >
              ${escapeHtml(item)}
            </button>
          `
        )
        .join(
          ""
        );


    bar.innerHTML = `
      <span
        class="search-discovery-label-v004"
      >
        RECENT
      </span>

      <div
        class="search-history-list-v004"
      >
        ${chips}
      </div>

      <div
        class="search-discovery-actions-v004"
      >
        <button
          class="search-discovery-action-v004"
          type="button"
          data-search-copy-link
          ${query ? "" : "hidden"}
        >
          COPY LINK
        </button>

        <button
          class="search-discovery-action-v004"
          type="button"
          data-search-clear-history
          ${historyRows.length ? "" : "hidden"}
        >
          CLEAR
        </button>
      </div>
    `;


    bar.hidden =
      !query &&
      historyRows.length === 0;
  }


  function mountBar(
    searchWrap
  ) {
    if (
      document.querySelector(
        ".search-discovery-v004"
      )
    ) {
      bar =
        document.querySelector(
          ".search-discovery-v004"
        );

      return;
    }


    bar =
      document.createElement(
        "div"
      );


    bar.className =
      "search-discovery-v004";


    searchWrap.appendChild(
      bar
    );


    bar.addEventListener(
      "click",
      (
        event
      ) => {
        const historyButton =
          event.target.closest(
            "[data-search-history-v004]"
          );


        if (historyButton) {
          setQuery(
            historyButton
              .dataset
              .searchHistoryV004
          );

          return;
        }


        if (
          event.target.closest(
            "[data-search-clear-history]"
          )
        ) {
          clearHistory();

          return;
        }


        if (
          event.target.closest(
            "[data-search-copy-link]"
          )
        ) {
          copySearchLink();
        }
      }
    );


    renderBar();
  }


  /* ======================================================
     HIGHLIGHTING
     ====================================================== */

  function highlightTerms() {
    const query =
      cleanQuery(
        input?.value
      );


    if (!query) {
      return [];
    }


    const found =
      new Map();


    const candidates = [
      query,
      ...query.split(
        /\s+/
      ),
    ];


    candidates.forEach(
      (
        raw
      ) => {
        let value =
          cleanQuery(
            raw
          );


        if (
          value.length < 2
        ) {
          return;
        }


        const bare =
          value.replace(
            /^@+/,
            ""
          );


        [
          value,
          bare,
        ].forEach(
          (
            term
          ) => {
            if (
              term.length < 2
            ) {
              return;
            }


            const key =
              term.toLocaleLowerCase();


            if (
              !found.has(
                key
              )
            ) {
              found.set(
                key,
                term
              );
            }
          }
        );
      }
    );


    return [
      ...found.values(),
    ].sort(
      (
        a,
        b
      ) =>
        b.length -
        a.length
    );
  }


  function highlightNode(
    node
  ) {
    if (
      !node ||
      node.nodeType !==
        Node.ELEMENT_NODE
    ) {
      return;
    }


    const query =
      cleanQuery(
        input?.value
      );


    const currentPlain =
      node.textContent ||
      "";


    let base =
      node.dataset
        .searchHighlightBaseV004;


    if (
      base === undefined ||
      currentPlain !== base
    ) {
      base =
        currentPlain;


      node.dataset
        .searchHighlightBaseV004 =
          base;
    }


    if (
      node.dataset
        .searchHighlightQueryV004 ===
        query &&
      currentPlain ===
        base
    ) {
      return;
    }


    node.dataset
      .searchHighlightQueryV004 =
        query;


    node.textContent =
      base;


    const terms =
      highlightTerms();


    if (
      !terms.length
    ) {
      return;
    }


    const pattern =
      terms
        .map(
          escapeRegex
        )
        .join(
          "|"
        );


    if (!pattern) {
      return;
    }


    const regex =
      new RegExp(
        `(${pattern})`,
        "gi"
      );


    const parts =
      base.split(
        regex
      );


    if (
      parts.length <= 1
    ) {
      return;
    }


    const fragment =
      document.createDocumentFragment();


    parts.forEach(
      (
        part
      ) => {
        if (!part) {
          return;
        }


        const isMatch =
          terms.some(
            (
              term
            ) =>
              part.localeCompare(
                term,
                undefined,
                {
                  sensitivity:
                    "accent",
                }
              )
              ===
              0
          );


        if (isMatch) {
          const mark =
            document.createElement(
              "mark"
            );


          mark.className =
            "search-highlight-v004";


          mark.textContent =
            part;


          fragment.appendChild(
            mark
          );
        }
        else {
          fragment.appendChild(
            document.createTextNode(
              part
            )
          );
        }
      }
    );


    node.replaceChildren(
      fragment
    );
  }


  function processRoot(
    root
  ) {
    if (
      !root ||
      root.nodeType !==
        Node.ELEMENT_NODE
    ) {
      return;
    }


    if (
      root.matches?.(
        HIGHLIGHT_SELECTOR
      )
    ) {
      highlightNode(
        root
      );
    }


    root
      .querySelectorAll?.(
        HIGHLIGHT_SELECTOR
      )
      .forEach(
        highlightNode
      );
  }


  function refreshHighlights() {
    document
      .querySelectorAll(
        HIGHLIGHT_SELECTOR
      )
      .forEach(
        highlightNode
      );
  }


  function mountHighlightObserver() {
    const observer =
      new MutationObserver(
        (
          mutations
        ) => {
          mutations.forEach(
            (
              mutation
            ) => {
              if (
                mutation.target
                  ?.nodeType ===
                Node.ELEMENT_NODE &&
                mutation.target
                  .matches?.(
                    HIGHLIGHT_SELECTOR
                  )
              ) {
                highlightNode(
                  mutation.target
                );
              }


              mutation
                .addedNodes
                .forEach(
                  (
                    node
                  ) => {
                    processRoot(
                      node
                    );
                  }
                );
            }
          );
        }
      );


    observer.observe(
      document.body,
      {
        childList:
          true,

        subtree:
          true,
      }
    );
  }


  /* ======================================================
     INPUT EVENTS
     ====================================================== */

  function bindInput() {
    input.addEventListener(
      "input",
      () => {
        syncUrl();

        scheduleSave();

        refreshHighlights();

        renderBar();
      }
    );


    input.addEventListener(
      "keydown",
      (
        event
      ) => {
        if (
          event.key ===
          "Enter"
        ) {
          saveQuery(
            input.value
          );

          syncUrl();

          renderBar();

          return;
        }


        if (
          event.key ===
          "Escape" &&
          input.value
        ) {
          event.preventDefault();

          setQuery(
            "",
            {
              save:
                false,
            }
          );
        }
      }
    );


    input.addEventListener(
      "blur",
      () => {
        saveQuery(
          input.value
        );
      }
    );
  }


  /* ======================================================
     INITIAL DEEP LINK
     ====================================================== */

  function applyInitialQuery() {
    const query =
      initialQuery();


    if (!query) {
      return;
    }


    input.value =
      query;


    /*
      app.js may still be loading its
      dataset. It reads the current
      input value when it performs the
      initial filter, so setting it now
      is enough.

      Dispatch once more when the
      public app state becomes ready.
    */
    let attempts =
      0;


    const timer =
      window.setInterval(
        () => {
          attempts += 1;


          const app =
            window
              .STYLE_ARCHIVE_V003;


          if (
            app?.state?.styles
              ?.length
          ) {
            window.clearInterval(
              timer
            );

            refreshSearch();

            refreshHighlights();

            return;
          }


          if (
            attempts >= 80
          ) {
            window.clearInterval(
              timer
            );
          }
        },
        100
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


    mountBar(
      searchWrap
    );

    bindInput();

    applyInitialQuery();

    mountHighlightObserver();

    refreshHighlights();

    renderBar();
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      {
        once:
          true,
      }
    );
  }
  else {
    mount();
  }


  /* ======================================================
     DEBUG API
     ====================================================== */

  window
    .STYLE_ARCHIVE_DISCOVERY_V004 =
    {
      setQuery,

      saveQuery,

      clearHistory,

      refreshHighlights,

      getHistory:
        () => [
          ...historyRows,
        ],
    };
})();