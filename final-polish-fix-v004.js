(() => {
  "use strict";

  const LIMIT = 12;

  let app = null;

  let discoverWrap = null;
  let discoverMenu = null;


  /* ======================================================
     HELPERS
     ====================================================== */

  function shuffle(rows) {
    const result = [...rows];

    for (
      let i = result.length - 1;
      i > 0;
      i -= 1
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
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


  function currentSearchInput() {
    return document.querySelector(
      "#searchInput"
    );
  }


  function cleanUrl() {
    const url =
      new URL(
        window.location.href
      );

    url.searchParams.delete(
      "q"
    );

    url.searchParams.delete(
      "style"
    );

    history.replaceState(
      history.state,
      "",
      url
    );
  }


  /* ======================================================
     COPY STYLE LINK
     ====================================================== */

  function viewerDialog() {
    const dialogs =
      [
        ...document.querySelectorAll(
          "dialog[open]"
        ),
      ];


    /*
      Prefer an open dialog containing
      an image. That should be our viewer.
    */
    const withImage =
      dialogs.find(
        (dialog) =>
          dialog.querySelector(
            "img"
          )
          &&
          dialog.id !==
            "infoDialog"
      );


    if (withImage) {
      return withImage;
    }


    return (
      dialogs.find(
        (dialog) =>
          dialog.id !==
          "infoDialog"
      )
      ||
      null
    );
  }


  function copyFallback(value) {
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

    document.execCommand(
      "copy"
    );

    textarea.remove();
  }


  async function copyStyleLink() {
    const style =
      app?.state
        ?.viewerStyle;


    if (!style) {
      return;
    }


    const url =
      new URL(
        window.location.href
      );


    url.searchParams.set(
      "style",
      String(style.id)
    );


    history.replaceState(
      history.state,
      "",
      url
    );


    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator
          .clipboard
          .writeText(
            url.href
          );
      }
      else {
        copyFallback(
          url.href
        );
      }
    }
    catch {
      copyFallback(
        url.href
      );
    }


    const button =
      document.querySelector(
        "#styleDeepLinkCopyV004"
      );


    if (button) {
      const old =
        button.textContent;

      button.textContent =
        "LINK COPIED";

      window.setTimeout(
        () => {
          button.textContent =
            old;
        },
        1100
      );
    }
  }


  function ensureCopyButton() {
    const style =
      app?.state
        ?.viewerStyle;


    if (!style) {
      return;
    }


    const dialog =
      viewerDialog();


    if (!dialog) {
      return;
    }


    dialog.classList.add(
      "viewer-deeplink-host-v004"
    );


    const actionsHost =
      dialog.querySelector(
        ".viewer-actions"
      );


    if (!actionsHost) {
      return;
    }


    /* V004_COPY_LINK_IN_ACTIONS */


    let button =
      document.querySelector(
        "#styleDeepLinkCopyV004"
      );


    /*
      If original final-polish created it,
      just move it into the modal dialog.
    */
    if (button) {

      if (
        button.parentElement !==
        actionsHost
      ) {
        actionsHost.appendChild(
          button
        );
      }

      return;
    }


    button =
      document.createElement(
        "button"
      );


    button.id =
      "styleDeepLinkCopyV004";

    button.type =
      "button";

    button.className =
      "style-link-copy-v004";

    button.textContent =
      "COPY STYLE LINK";


    button.addEventListener(
      "click",
      copyStyleLink
    );


    actionsHost.appendChild(
          button
        );
  }


  function watchViewer() {
    /*
      Capture card/viewer opens.
      app.js opens the viewer during
      the same click event.
    */
    document.addEventListener(
      "click",
      (event) => {
        if (
          event.target.closest(
            "[data-open-id]"
          )
          ||
          event.target.closest(
            "[data-related-id]"
          )
          ||
          event.target.closest(
            "[data-preview-id]"
          )
        ) {
          window.setTimeout(
            ensureCopyButton,
            20
          );
        }
      },
      true
    );


    /*
      Deep-link opening on page load.
    */
    window.setTimeout(
      ensureCopyButton,
      250
    );

    window.setTimeout(
      ensureCopyButton,
      700
    );
  }


  /* ======================================================
     DISCOVER
     ====================================================== */

  function discoverPool(mode) {
    const styles =
      [
        ...(app?.state
          ?.styles || []),
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
          LIMIT
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
        LIMIT
      ) {
        pool =
          styles;
      }


      return shuffle(
        pool
      ).slice(
        0,
        LIMIT
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
            style.media.length >= 2
        );


      if (
        pool.length <
        LIMIT
      ) {
        pool =
          styles;
      }


      return shuffle(
        pool
      ).slice(
        0,
        LIMIT
      );
    }


    return shuffle(
      styles
    ).slice(
      0,
      LIMIT
    );
  }


  function closeDiscover() {
    if (discoverMenu) {
      discoverMenu.hidden =
        true;
    }
  }


  function runDiscover(mode) {
    const styles =
      discoverPool(
        mode
      );


    app.state.discoveryStyles =
      styles;

    app.state.savedOnly =
      false;

    app.state.activePreset =
      "all";

    app.state.visualSort =
      "archive";


    const searchInput =
      currentSearchInput();


    if (searchInput) {
      searchInput.value =
        "";
    }


    cleanUrl();


    app.syncVisualControls?.();

    app.applyVisualFilters(
      true
    );


    closeDiscover();


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
  }


  function installDiscover() {
    /*
      Kill failed previous replacement,
      but leave original app button alone.
    */
    document
      .querySelectorAll(
        ".discover-polish-wrap-v004"
      )
      .forEach(
        (node) =>
          node.remove()
      );


    const oldButton =
      document.querySelector(
        "#discoverPolishButton"
      );


    if (oldButton) {
      oldButton.remove();
    }


    discoverWrap =
      document.createElement(
        "div"
      );


    discoverWrap.className =
      "discover-polish-wrap-v004 discover-polish-fix-v004";


    const button =
      document.createElement(
        "button"
      );


    button.id =
      "discoverPolishButton";

    button.type =
      "button";

    button.className =
      "text-button discover-polish-button-v004";

    button.textContent =
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
        data-discover-fix="random"
      >
        <span>RANDOM 12</span>
        <small>anything from this archive</small>
      </button>

      <button
        type="button"
        data-discover-fix="newest"
      >
        <span>NEWEST 12</span>
        <small>latest visual additions</small>
      </button>

      <button
        type="button"
        data-discover-fix="unseen"
      >
        <span>UNSEEN 12</span>
        <small>skip saved + recent</small>
      </button>

      <button
        type="button"
        data-discover-fix="multi"
      >
        <span>MULTI-IMAGE 12</span>
        <small>styles with 2+ previews</small>
      </button>
    `;


    discoverWrap.appendChild(
      button
    );

    discoverWrap.appendChild(
      discoverMenu
    );


    /*
      Put it in the real visible header,
      independent of old #discoverButton.
    */
    const actions =
      document.querySelector(
        ".top-actions"
      );


    const menuButton =
      document.querySelector(
        "#commandSearchButton"
      );


    if (actions) {

      if (
        menuButton &&
        menuButton.parentElement ===
          actions
      ) {
        actions.insertBefore(
          discoverWrap,
          menuButton
        );
      }
      else {
        actions.appendChild(
          discoverWrap
        );
      }

    }
    else {

      const random =
        document.querySelector(
          "#randomButton"
        );


      if (
        random?.parentElement
      ) {
        random.parentElement
          .insertAdjacentElement(
            "afterend",
            discoverWrap
          );
      }
      else {
        document.body.appendChild(
          discoverWrap
        );
      }
    }


    button.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        discoverMenu.hidden =
          !discoverMenu.hidden;
      }
    );


    discoverMenu.addEventListener(
      "click",
      (event) => {
        const item =
          event.target.closest(
            "[data-discover-fix]"
          );


        if (!item) {
          return;
        }


        runDiscover(
          item.dataset
            .discoverFix
        );
      }
    );


    document.addEventListener(
      "click",
      (event) => {
        if (
          !event.target.closest(
            ".discover-polish-fix-v004"
          )
        ) {
          closeDiscover();
        }
      }
    );


    /*
      ESC remains the only shortcut.
    */
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeDiscover();
        }
      }
    );
  }


  /* ======================================================
     START
     ====================================================== */

  function start() {
    app =
      window
        .STYLE_ARCHIVE_V003;


    installDiscover();

    watchViewer();


    window
      .STYLE_ARCHIVE_FINAL_FIX_V004 =
      {
        ensureCopyButton,
        runDiscover,
      };


    console.info(
      "[v0.0.4] final polish fix loaded"
    );
  }


  let tries = 0;


  const timer =
    window.setInterval(
      () => {
        tries += 1;


        const candidate =
          window
            .STYLE_ARCHIVE_V003;


        if (
          candidate &&
          Array.isArray(
            candidate.state
              ?.styles
          ) &&
          candidate.state
            .styles.length &&
          typeof candidate
            .applyVisualFilters ===
            "function"
        ) {
          window.clearInterval(
            timer
          );

          start();

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
            "[v0.0.4] final polish fix: app not ready"
          );
        }
      },
      100
    );
})();