(() => {
  "use strict";

  const DISCOVER_LIMIT = 12;

  let app = null;
  let searchInput = null;
  let emptyState = null;

  let discoverButton = null;
  let discoverMenu = null;

  let zeroPanel = null;
  let copyLinkButton = null;


  /* ======================================================
     HELPERS
     ====================================================== */

  function clean(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }


  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }


  function currentArchive() {
    return (
      new URL(
        window.location.href
      ).searchParams.get("archive")
      ||
      "am"
    );
  }


  function replaceUrl(mutator) {
    const url =
      new URL(
        window.location.href
      );

    mutator(url.searchParams);

    history.replaceState(
      history.state,
      "",
      url
    );
  }


  function shuffle(rows) {
    const result = [
      ...rows,
    ];

    for (
      let i =
        result.length - 1;
      i > 0;
      i -= 1
    ) {
      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        result[i],
        result[j],
      ] =
      [
        result[j],
        result[i],
      ];
    }

    return result;
  }


  function copyText(value) {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      return navigator.clipboard
        .writeText(value);
    }

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      value;

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    try {
      document.execCommand(
        "copy"
      );
    }
    finally {
      textarea.remove();
    }

    return Promise.resolve();
  }


  /* ======================================================
     STYLE DEEP LINKS
     ====================================================== */

  function styleFromId(id) {
    if (
      !id ||
      !app?.state
    ) {
      return null;
    }


    const direct =
      app.state.styleById
        ?.get?.(id);

    if (direct) {
      return direct;
    }


    return (
      app.state.styles
        ?.find(
          (style) =>
            String(style.id) ===
            String(id)
        )
      ||
      null
    );
  }


  function setStyleInUrl(id) {
    replaceUrl(
      (params) => {
        if (id) {
          params.set(
            "style",
            String(id)
          );
        }
        else {
          params.delete(
            "style"
          );
        }
      }
    );
  }


  function openStyleFromUrl() {
    const url =
      new URL(
        window.location.href
      );

    const id =
      url.searchParams.get(
        "style"
      );

    if (!id) {
      return;
    }


    const style =
      styleFromId(id);

    if (!style) {
      return;
    }


    if (
      app.state.viewerStyle &&
      String(
        app.state.viewerStyle.id
      ) === String(id)
    ) {
      return;
    }


    app.openViewer(
      style
    );
  }


  function syncUrlFromCardClick(event) {
    const open =
      event.target.closest(
        "[data-open-id]"
      );

    if (!open) {
      return;
    }

    setStyleInUrl(
      open.dataset.openId
    );
  }


  function installDialogCloseSync() {
    document
      .querySelectorAll(
        "dialog"
      )
      .forEach(
        (dialog) => {
          dialog.addEventListener(
            "close",
            () => {
              window.setTimeout(
                () => {
                  if (
                    !app?.state
                      ?.viewerStyle
                  ) {
                    setStyleInUrl(
                      null
                    );
                  }
                },
                0
              );
            }
          );
        }
      );
  }


  function installStyleCopyButton() {
    if (
      document.querySelector(
        "#styleDeepLinkCopyV004"
      )
    ) {
      return;
    }


    copyLinkButton =
      document.createElement(
        "button"
      );

    copyLinkButton.id =
      "styleDeepLinkCopyV004";

    copyLinkButton.className =
      "style-link-copy-v004";

    copyLinkButton.type =
      "button";

    copyLinkButton.textContent =
      "COPY STYLE LINK";


    copyLinkButton.addEventListener(
      "click",
      async () => {
        const style =
          app?.state
            ?.viewerStyle;

        if (!style) {
          return;
        }


        setStyleInUrl(
          style.id
        );


        await copyText(
          window.location.href
        );


        const old =
          copyLinkButton
            .textContent;

        copyLinkButton
          .textContent =
          "LINK COPIED";


        window.setTimeout(
          () => {
            copyLinkButton
              .textContent =
              old;
          },
          1200
        );
      }
    );


    document.body.appendChild(
      copyLinkButton
    );
  }


  /* ======================================================
     ZERO RESULT UX
     ====================================================== */

  function setSearchQuery(value) {
    const discovery =
      window
        .STYLE_ARCHIVE_DISCOVERY_V004;

    if (
      discovery &&
      typeof discovery.setQuery ===
        "function"
    ) {
      discovery.setQuery(
        value
      );

      return;
    }


    if (!searchInput) {
      return;
    }


    searchInput.value =
      value;

    searchInput.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true,
        }
      )
    );
  }


  function switchArchive(
    archive
  ) {
    const url =
      new URL(
        window.location.href
      );

    url.searchParams.set(
      "archive",
      archive
    );

    url.searchParams.delete(
      "style"
    );

    if (
      searchInput?.value
        ?.trim()
    ) {
      url.searchParams.set(
        "q",
        searchInput.value.trim()
      );
    }

    window.location.href =
      url.href;
  }


  function buildZeroPanel() {
    if (
      !emptyState ||
      zeroPanel
    ) {
      return;
    }


    zeroPanel =
      document.createElement(
        "div"
      );

    zeroPanel.className =
      "zero-result-polish-v004";

    zeroPanel.hidden =
      true;

    emptyState.appendChild(
      zeroPanel
    );
  }


  function similarStyles(query) {
    const api =
      window
        .STYLE_ARCHIVE_SEARCH_LITE_V004;

    if (
      !api ||
      typeof api.didYouMean !==
        "function"
    ) {
      return [];
    }

    try {
      return (
        api.didYouMean(query)
        ||
        []
      ).slice(0, 3);
    }
    catch {
      return [];
    }
  }


  function syncZeroResult() {
    if (
      !zeroPanel ||
      !searchInput ||
      !app?.state
    ) {
      return;
    }


    const query =
      clean(
        searchInput.value
      );


    const isZero =
      Boolean(query) &&
      app.state.mode ===
        "visual" &&
      Array.isArray(
        app.state.filtered
      ) &&
      app.state.filtered
        .length === 0;


    if (!isZero) {
      zeroPanel.hidden =
        true;

      zeroPanel.innerHTML =
        "";

      return;
    }


    const suggestions =
      similarStyles(
        query
      );


    const archives =
      [
        ["am", "AM PREVIEW"],
        ["opus", "OPUS"],
        ["sky", "SKY"],
      ]
      .filter(
        ([key]) =>
          key !==
          currentArchive()
      );


    let html = `
      <div
        class="zero-result-title-v004"
      >
        NO EXACT RESULTS
      </div>

      <div
        class="zero-result-query-v004"
      >
        "${escapeHtml(query)}"
      </div>
    `;


    if (
      suggestions.length
    ) {
      html += `
        <div
          class="zero-result-label-v004"
        >
          MAYBE YOU MEANT
        </div>

        <div
          class="zero-result-actions-v004"
        >
          ${suggestions.map(
            (name) => `
              <button
                type="button"
                data-zero-query="${escapeHtml(name)}"
              >
                ${escapeHtml(name)}
              </button>
            `
          ).join("")}
        </div>
      `;
    }


    html += `
      <div
        class="zero-result-label-v004"
      >
        TRY ANOTHER ARCHIVE
      </div>

      <div
        class="zero-result-actions-v004"
      >
        ${archives.map(
          ([key, label]) => `
            <button
              type="button"
              data-zero-archive="${key}"
            >
              ${label}
            </button>
          `
        ).join("")}

        <button
          type="button"
          data-zero-clear
        >
          CLEAR SEARCH
        </button>
      </div>
    `;


    zeroPanel.innerHTML =
      html;

    zeroPanel.hidden =
      false;
  }


  function installZeroResult() {
    buildZeroPanel();


    zeroPanel?.addEventListener(
      "click",
      (event) => {
        const queryButton =
          event.target.closest(
            "[data-zero-query]"
          );

        if (queryButton) {
          setSearchQuery(
            queryButton.dataset
              .zeroQuery
          );

          return;
        }


        const archiveButton =
          event.target.closest(
            "[data-zero-archive]"
          );

        if (archiveButton) {
          switchArchive(
            archiveButton.dataset
              .zeroArchive
          );

          return;
        }


        if (
          event.target.closest(
            "[data-zero-clear]"
          )
        ) {
          setSearchQuery(
            ""
          );
        }
      }
    );


    searchInput?.addEventListener(
      "input",
      () => {
        window.setTimeout(
          syncZeroResult,
          0
        );
      }
    );
  }


  /* ======================================================
     DISCOVER POLISH
     ====================================================== */

  function selectDiscoverPool(
    mode
  ) {
    const styles =
      [
        ...(app.state.styles || []),
      ];


    if (
      mode ===
      "newest"
    ) {
      return styles
        .sort(
          (a, b) =>
            (
              Date.parse(
                b.published_at || ""
              )
              ||
              0
            )
            -
            (
              Date.parse(
                a.published_at || ""
              )
              ||
              0
            )
        )
        .slice(
          0,
          DISCOVER_LIMIT
        );
    }


    if (
      mode ===
      "unseen"
    ) {
      const recent =
        new Set(
          app.state.recent
          ||
          []
        );

      const saved =
        app.state.saved
        ||
        new Set();


      let pool =
        styles.filter(
          (style) =>
            !recent.has(
              style.id
            )
            &&
            !saved.has(
              style.id
            )
        );


      if (
        pool.length <
        DISCOVER_LIMIT
      ) {
        pool =
          styles;
      }


      return shuffle(
        pool
      ).slice(
        0,
        DISCOVER_LIMIT
      );
    }


    if (
      mode ===
      "multi"
    ) {
      let pool =
        styles.filter(
          (style) =>
            Array.isArray(
              style.media
            )
            &&
            style.media
              .length >= 2
        );


      if (
        pool.length <
        DISCOVER_LIMIT
      ) {
        pool =
          styles;
      }


      return shuffle(
        pool
      ).slice(
        0,
        DISCOVER_LIMIT
      );
    }


    return shuffle(
      styles
    ).slice(
      0,
      DISCOVER_LIMIT
    );
  }


  function runDiscover(
    mode
  ) {
    const selected =
      selectDiscoverPool(
        mode
      );


    app.state
      .discoveryStyles =
      selected;

    app.state.savedOnly =
      false;

    app.state.activePreset =
      "all";

    app.state.visualSort =
      "archive";


    if (searchInput) {
      searchInput.value =
        "";
    }


    replaceUrl(
      (params) => {
        params.delete("q");
        params.delete("style");
      }
    );


    app.syncVisualControls?.();

    app.applyVisualFilters(
      true
    );


    const shell =
      document.querySelector(
        "#visualShell"
      );


    if (shell) {
      window.scrollTo({
        top:
          Math.max(
            0,
            shell.offsetTop - 145
          ),

        behavior:
          "smooth",
      });
    }


    closeDiscoverMenu();
  }


  function closeDiscoverMenu() {
    if (discoverMenu) {
      discoverMenu.hidden =
        true;
    }
  }


  function toggleDiscoverMenu() {
    if (!discoverMenu) {
      return;
    }

    discoverMenu.hidden =
      !discoverMenu.hidden;
  }


  function installDiscover() {
    const original =
      document.querySelector(
        "#discoverButton"
      );

    if (
      !original ||
      document.querySelector(
        "#discoverPolishButton"
      )
    ) {
      return;
    }


    original.hidden =
      true;


    const wrap =
      document.createElement(
        "div"
      );

    wrap.className =
      "discover-polish-wrap-v004";


    discoverButton =
      document.createElement(
        "button"
      );

    discoverButton.id =
      "discoverPolishButton";

    discoverButton.type =
      "button";

    discoverButton.className =
      original.className;

    discoverButton.textContent =
      "DISCOVER";


    discoverMenu =
      document.createElement(
        "div"
      );

    discoverMenu.className =
      "discover-polish-menu-v004";

    discoverMenu.hidden =
      true;


    discoverMenu.innerHTML = `
      <button
        type="button"
        data-discover-v004="random"
      >
        <span>RANDOM 12</span>
        <small>anything from this archive</small>
      </button>

      <button
        type="button"
        data-discover-v004="newest"
      >
        <span>NEWEST 12</span>
        <small>latest visual additions</small>
      </button>

      <button
        type="button"
        data-discover-v004="unseen"
      >
        <span>UNSEEN 12</span>
        <small>skip saved + recent</small>
      </button>

      <button
        type="button"
        data-discover-v004="multi"
      >
        <span>MULTI-IMAGE 12</span>
        <small>styles with 2+ previews</small>
      </button>
    `;


    wrap.appendChild(
      discoverButton
    );

    wrap.appendChild(
      discoverMenu
    );


    original.insertAdjacentElement(
      "afterend",
      wrap
    );


    discoverButton.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        toggleDiscoverMenu();
      }
    );


    discoverMenu.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-discover-v004]"
          );

        if (!button) {
          return;
        }

        runDiscover(
          button.dataset
            .discoverV004
        );
      }
    );


    document.addEventListener(
      "click",
      (event) => {
        if (
          !event.target.closest(
            ".discover-polish-wrap-v004"
          )
        ) {
          closeDiscoverMenu();
        }
      }
    );


    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeDiscoverMenu();
        }
      }
    );
  }


  /* ======================================================
     POPSTATE / BACK BUTTON
     ====================================================== */

  function installHistorySync() {
    window.addEventListener(
      "popstate",
      () => {
        const id =
          new URL(
            window.location.href
          ).searchParams.get(
            "style"
          );


        if (id) {
          openStyleFromUrl();
        }
        else if (
          app?.state
            ?.viewerStyle
        ) {
          app.closeViewer?.();
        }
      }
    );
  }


  /* ======================================================
     INIT
     ====================================================== */

  function init() {
    app =
      window
        .STYLE_ARCHIVE_V003;

    searchInput =
      document.querySelector(
        "#searchInput"
      );

    emptyState =
      document.querySelector(
        "#visualEmptyState"
      );


    document.addEventListener(
      "click",
      syncUrlFromCardClick,
      true
    );


    installDialogCloseSync();

    installStyleCopyButton();

    installZeroResult();

    installDiscover();

    installHistorySync();

    openStyleFromUrl();

    syncZeroResult();


    window
      .STYLE_ARCHIVE_FINAL_POLISH_V004 =
      {
        openStyleFromUrl,

        runDiscover,

        syncZeroResult,
      };
  }


  function waitForApp() {
    let tries =
      0;


    const timer =
      window.setInterval(
        () => {
          tries += 1;


          const candidate =
            window
              .STYLE_ARCHIVE_V003;


          const ready =
            candidate &&
            Array.isArray(
              candidate.state
                ?.styles
            ) &&
            candidate.state
              .styles.length &&
            typeof candidate
              .openViewer ===
              "function";


          if (ready) {
            window.clearInterval(
              timer
            );

            init();

            return;
          }


          if (
            tries >=
            150
          ) {
            window.clearInterval(
              timer
            );

            console.warn(
              "[v0.0.4] final polish: app not ready"
            );
          }
        },
        100
      );
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      waitForApp,
      {
        once: true,
      }
    );
  }
  else {
    waitForApp();
  }
})();