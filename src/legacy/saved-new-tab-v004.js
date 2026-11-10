(() => {
  "use strict";

  const PARAM =
    "saved";


  let app =
    null;

  let savedButton =
    null;


  /* ======================================================
     URL
     ====================================================== */

  function isSavedPage() {
    const url =
      new URL(
        window.location.href
      );

    return (
      url.searchParams.get(
        PARAM
      ) === "1"
    );
  }


  function buildSavedUrl() {
    const url =
      new URL(
        window.location.href
      );


    /*
      Keep current archive,
      but don't carry a search/viewer
      into the Saved workspace.
    */

    url.searchParams.delete(
      "q"
    );

    url.searchParams.delete(
      "style"
    );

    url.searchParams.set(
      PARAM,
      "1"
    );


    return url.href;
  }


  function removeSavedParam() {
    const url =
      new URL(
        window.location.href
      );


    url.searchParams.delete(
      PARAM
    );


    history.replaceState(
      history.state,
      "",
      url
    );
  }


  /* ======================================================
     OPEN NEW TAB
     ====================================================== */

  function openSavedTab() {
    const link =
      document.createElement(
        "a"
      );


    link.href =
      buildSavedUrl();

    link.target =
      "_blank";

    link.rel =
      "noopener";

    link.style.display =
      "none";


    document.body.appendChild(
      link
    );


    link.click();

    link.remove();
  }


  /* ======================================================
     BUTTON BEHAVIOUR
     ====================================================== */

  function installButton() {
    savedButton =
      document.querySelector(
        "#savedButton"
      );


    if (!savedButton) {
      return false;
    }


    /*
      Capture phase:
      on a normal archive page,
      stop the original same-tab
      Saved handler before it fires.
    */

    savedButton.addEventListener(
      "click",
      (event) => {
        /*
          Inside the dedicated Saved tab,
          keep the site's normal toggle.
        */
        if (
          isSavedPage()
        ) {
          return;
        }


        event.preventDefault();

        event.stopImmediatePropagation();


        openSavedTab();
      },
      true
    );


    /*
      If the user is already inside
      ?saved=1 and clicks SAVED again,
      app.js can toggle Saved off normally.
      Then clean the URL.
    */

    savedButton.addEventListener(
      "click",
      () => {
        if (
          !isSavedPage()
        ) {
          return;
        }


        window.setTimeout(
          () => {
            if (
              app?.state &&
              app.state.savedOnly ===
                false
            ) {
              removeSavedParam();
            }
          },
          0
        );
      }
    );


    return true;
  }


  function waitForButton() {
    if (
      installButton()
    ) {
      return;
    }


    let tries =
      0;


    const timer =
      window.setInterval(
        () => {
          tries += 1;


          if (
            installButton()
          ) {
            window.clearInterval(
              timer
            );

            return;
          }


          if (
            tries >= 100
          ) {
            window.clearInterval(
              timer
            );

            console.warn(
              "[v0.0.4] SAVED button not found"
            );
          }
        },
        100
      );
  }


  /* ======================================================
     APPLY SAVED VIEW IN NEW TAB
     ====================================================== */

  function applySavedView() {
    if (
      !isSavedPage() ||
      !app?.state
    ) {
      return;
    }


    const state =
      app.state;


    state.discoveryStyles =
      null;

    state.savedOnly =
      true;

    state.activePreset =
      "all";

    state.visualSort =
      "saved-newest";


    const searchInput =
      document.querySelector(
        "#searchInput"
      );


    if (searchInput) {
      searchInput.value =
        "";
    }


    app.syncVisualControls?.();

    app.applyVisualFilters?.(
      true
    );


    document
      .documentElement
      .setAttribute(
        "data-saved-view-v004",
        "true"
      );


    console.info(
      "[v0.0.4] dedicated Saved view active"
    );
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
            candidate.state &&
            Array.isArray(
              candidate.state.styles
            ) &&
            typeof candidate
              .applyVisualFilters ===
              "function";


          if (ready) {
            window.clearInterval(
              timer
            );


            app =
              candidate;


            applySavedView();

            return;
          }


          if (
            tries >= 150
          ) {
            window.clearInterval(
              timer
            );

            console.warn(
              "[v0.0.4] Saved view: app not ready"
            );
          }
        },
        100
      );
  }


  /* ======================================================
     START
     ====================================================== */

  function start() {
    waitForButton();

    waitForApp();


    window
      .STYLE_ARCHIVE_SAVED_TAB_V004 =
      {
        open:
          openSavedTab,

        isSavedPage,
      };
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true,
      }
    );
  }
  else {
    start();
  }
})();