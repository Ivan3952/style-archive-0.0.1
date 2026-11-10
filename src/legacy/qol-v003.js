(() => {
  "use strict";

  const searchInput =
    document.querySelector("#searchInput");

  const searchWrap =
    document.querySelector(".search-wrap");

  const clearVisual =
    document.querySelector("#clearButton");

  const clearSupported =
    document.querySelector("#supportedClearButton");


  /* =========================================================
     CSS
     ========================================================= */

  const style =
    document.createElement("style");

  style.textContent = `
    /* STYLE / ARCHIVE 0.0.3 QoL */

    .search-wrap {
      position: relative;
    }

    #searchInput {
      padding-right: 42px;
    }

    #searchInput::-webkit-search-cancel-button {
      -webkit-appearance: none;
      appearance: none;
    }

    .search-clear-qol {
      position: absolute;
      right: 54px;
      top: 50%;

      display: grid;
      place-items: center;

      width: 28px;
      height: 28px;

      padding: 0;

      border: 0;
      border-radius: 50%;

      background: transparent;
      color: var(--muted);

      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Consolas,
        monospace;

      font-size: 17px;
      line-height: 1;

      opacity: 0;

      pointer-events: none;

      transform:
        translateY(-50%)
        scale(.9);

      transition:
        opacity 140ms ease,
        color 140ms ease,
        background-color 140ms ease,
        transform 140ms ease;
    }

    .search-clear-qol.visible {
      opacity: 1;

      pointer-events: auto;

      transform:
        translateY(-50%)
        scale(1);
    }

    .search-clear-qol:hover {
      color: var(--text);

      background:
        rgba(127,127,127,.12);
    }


    #clearButton,
    #supportedClearButton {
      opacity: .35;

      transition:
        opacity 140ms ease,
        color 140ms ease,
        border-color 140ms ease,
        background-color 140ms ease;
    }

    #clearButton.qol-active,
    #supportedClearButton.qol-active {
      opacity: 1;

      color: var(--accent);
    }


    .back-to-top-qol {
      position: fixed;

      right: 20px;
      bottom: 20px;

      z-index: 80;

      display: grid;
      place-items: center;

      width: 44px;
      height: 44px;

      padding: 0;

      border:
        1px solid var(--line);

      border-radius: 50%;

      background:
        color-mix(
          in srgb,
          var(--bg) 86%,
          transparent
        );

      color: var(--text);

      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Consolas,
        monospace;

      font-size: 19px;

      opacity: 0;

      visibility: hidden;

      transform:
        translateY(8px);

      backdrop-filter:
        blur(12px);

      box-shadow:
        0 8px 28px
        rgba(0,0,0,.12);

      transition:
        opacity 160ms ease,
        transform 160ms ease,
        border-color 160ms ease,
        color 160ms ease;
    }

    .back-to-top-qol.visible {
      opacity: 1;

      visibility: visible;

      transform:
        translateY(0);
    }

    .back-to-top-qol:hover {
      border-color: var(--accent);

      color: var(--accent);
    }


    @media (max-width: 680px) {

      .back-to-top-qol {
        right: 12px;
        bottom: 12px;

        width: 40px;
        height: 40px;
      }

      .search-clear-qol {
        right: 46px;
      }

    }


    @media (prefers-reduced-motion: reduce) {

      .search-clear-qol,
      .back-to-top-qol,
      #clearButton,
      #supportedClearButton {
        transition: none;
      }

    }
  `;

  document.head.appendChild(style);


  /* =========================================================
     CLEAR SEARCH
     ========================================================= */

  let searchClear = null;

  if (
    searchInput &&
    searchWrap
  ) {

    searchClear =
      document.createElement("button");

    searchClear.type =
      "button";

    searchClear.className =
      "search-clear-qol";

    searchClear.textContent =
      "×";

    searchClear.setAttribute(
      "aria-label",
      "Clear search"
    );

    searchClear.title =
      "Clear search";

    searchWrap.appendChild(
      searchClear
    );


    const syncSearchClear = () => {

      searchClear.classList.toggle(
        "visible",
        Boolean(
          searchInput.value.trim()
        )
      );

    };


    searchClear.addEventListener(
      "click",
      () => {

        searchInput.value =
          "";

        /*
         * Используем уже существующую
         * поисковую логику app.js.
         */

        searchInput.dispatchEvent(
          new Event(
            "input",
            {
              bubbles: true
            }
          )
        );

        searchInput.focus();

        syncSearchClear();

      }
    );


    searchInput.addEventListener(
      "input",
      syncSearchClear
    );


    syncSearchClear();

  }


  /* =========================================================
     BACK TO TOP
     ========================================================= */

  const topButton =
    document.createElement("button");

  topButton.type =
    "button";

  topButton.className =
    "back-to-top-qol";

  topButton.textContent =
    "↑";

  topButton.setAttribute(
    "aria-label",
    "Back to top"
  );

  topButton.title =
    "Back to top";

  document.body.appendChild(
    topButton
  );


  const syncTopButton = () => {

    topButton.classList.toggle(
      "visible",
      window.scrollY > 900
    );

  };


  window.addEventListener(
    "scroll",
    syncTopButton,
    {
      passive: true
    }
  );


  topButton.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior:
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches
            ? "auto"
            : "smooth"
      });

    }
  );


  syncTopButton();


  /* =========================================================
     RESET ACTIVE STATE
     ========================================================= */

  function visualFiltersActive() {

    const state =
      window.STYLE_ARCHIVE_V003
        ?.state;

    if (!state) {

      return Boolean(
        searchInput?.value.trim()
      );

    }


    return Boolean(

      searchInput?.value.trim()

      ||

      state.activePreset !==
        "all"

      ||

      state.visualSort !==
        "archive"

      ||

      state.savedOnly

      ||

      state.discoveryStyles

      ||

      Number(
        state.danbooruMin ||
        0
      ) > 0

      ||

      (
        state.danbooruPresence ||
        "all"
      ) !== "all"

    );

  }


  function supportedFiltersActive() {

    const state =
      window.STYLE_ARCHIVE_V003
        ?.state;

    if (!state) {

      return Boolean(
        searchInput?.value.trim()
      );

    }


    return Boolean(

      searchInput?.value.trim()

      ||

      (
        state.supportedLetter ||
        "all"
      ) !== "all"

      ||

      (
        state.supportedFilter ||
        "all"
      ) !== "all"

      ||

      (
        state.supportedSort ||
        "az"
      ) !== "az"

      ||

      (
        state.supportedDanbooruPresence ||
        "all"
      ) !== "all"

    );

  }


  function syncResetButtons() {

    clearVisual?.classList.toggle(
      "qol-active",
      visualFiltersActive()
    );


    clearSupported?.classList.toggle(
      "qol-active",
      supportedFiltersActive()
    );

  }


  /*
   * Все основные изменения фильтров
   * происходят через click/input/change.
   * Обновляем состояние после app.js.
   */

  const requestSync = () => {

    window.setTimeout(
      syncResetButtons,
      0
    );

  };


  document.addEventListener(
    "click",
    requestSync
  );

  document.addEventListener(
    "input",
    requestSync
  );

  document.addEventListener(
    "change",
    requestSync
  );


  /*
   * Некоторые действия меняют DOM
   * программно, поэтому небольшой
   * observer делает QoL устойчивее.
   */

  const observer =
    new MutationObserver(
      () => {

        requestAnimationFrame(
          syncResetButtons
        );

      }
    );


  observer.observe(
    document.body,
    {
      subtree: true,
      childList: true
    }
  );


  syncResetButtons();


  console.info(
    "[STYLE / ARCHIVE 0.0.3] QoL loaded"
  );

})();