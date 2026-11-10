(() => {
  "use strict";


  /* ======================================================
     CONFIG
     ====================================================== */

  const STORAGE_KEY =
    "style-archive:archive-v004";


  const ARCHIVES = {
    am: {
      key:
        "am",

      label:
        "AM PREVIEW",

      styles:
        "./data/styles.json",

      media:
        "./data/media.json",

      supported:
        "./data/supported.json",

      supportedCount:
        59676,
    },


    opus: {
      key:
        "opus",

      label:
        "OPUS",

      styles:
        "./data/opus-styles.json",

      media:
        "./data/opus-media.json",

      supported:
        "./data/opus-supported.json",

      supportedCount:
        51264,
    },


    sky: {
      key:
        "sky",

      label:
        "SKY",

      styles:
        "./data/sky-styles.json",

      media:
        "./data/sky-media.json",

      supported:
        null,

      supportedCount:
        null,
    },
  };


  /* ======================================================
     SELECT CURRENT ARCHIVE
     ====================================================== */

  function validArchive(
    value
  ) {
    return Boolean(
      value &&
      ARCHIVES[value]
    );
  }


  const url =
    new URL(
      window.location.href
    );


  const urlArchive =
    url.searchParams.get(
      "archive"
    );


  let storedArchive =
    null;


  try {
    storedArchive =
      localStorage.getItem(
        STORAGE_KEY
      );
  }
  catch {}


  const currentKey =
    validArchive(
      urlArchive
    )
      ? urlArchive
      : validArchive(
          storedArchive
        )
        ? storedArchive
        : "am";


  const current =
    ARCHIVES[
      currentKey
    ];


  try {
    localStorage.setItem(
      STORAGE_KEY,
      currentKey
    );
  }
  catch {}


  document
    .documentElement
    .dataset
    .archiveV004 =
      currentKey;


  /* ======================================================
     FETCH ROUTER
     ====================================================== */

  const nativeFetch =
    window.fetch.bind(
      window
    );


  function requestUrl(
    input
  ) {
    if (
      typeof input ===
      "string"
    ) {
      return input;
    }

    if (
      input instanceof URL
    ) {
      return input.href;
    }

    if (
      input &&
      typeof input.url ===
      "string"
    ) {
      return input.url;
    }

    return "";
  }


  function pathnameFor(
    value
  ) {
    try {
      return new URL(
        value,
        window.location.href
      ).pathname;
    }
    catch {
      return "";
    }
  }


  function route(
    input
  ) {
    const raw =
      requestUrl(
        input
      );

    const pathname =
      pathnameFor(
        raw
      );


    if (
      pathname.endsWith(
        "/data/styles.json"
      )
    ) {
      return {
        url:
          current.styles,
      };
    }


    if (
      pathname.endsWith(
        "/data/media.json"
      )
    ) {
      return {
        url:
          current.media,
      };
    }


    if (
      pathname.endsWith(
        "/data/supported.json"
      )
    ) {
      if (
        !current.supported
      ) {
        return {
          emptySupported:
            true,
        };
      }

      return {
        url:
          current.supported,
      };
    }


    return null;
  }


  window.fetch =
    function archiveFetch(
      input,
      init
    ) {
      const mapped =
        route(
          input
        );


      if (!mapped) {
        return nativeFetch(
          input,
          init
        );
      }


      /*
        Sky currently has no
        supported-list.

        Return a valid empty JSON
        response so old app logic
        never crashes if some search
        path requests supported.json.
      */
      if (
        mapped.emptySupported
      ) {
        return Promise.resolve(
          new Response(
            "[]",
            {
              status:
                200,

              headers: {
                "Content-Type":
                  "application/json; charset=utf-8",
              },
            }
          )
        );
      }


      return nativeFetch(
        mapped.url,
        init
      );
    };


  /* ======================================================
     UI
     ====================================================== */

  function switchArchive(
    nextKey
  ) {
    if (
      !validArchive(
        nextKey
      ) ||
      nextKey ===
        currentKey
    ) {
      return;
    }


    try {
      localStorage.setItem(
        STORAGE_KEY,
        nextKey
      );
    }
    catch {}


    const nextUrl =
      new URL(
        window.location.href
      );


    nextUrl.searchParams.set(
      "archive",
      nextKey
    );


    /*
      Deliberate full reload.

      Every archive receives a clean
      app state: search indexes,
      viewer media, supported index,
      random pool, filters, etc.
    */
    window.location.assign(
      nextUrl.href
    );
  }


  function archiveButton(
    key,
    label
  ) {
    const active =
      key === currentKey
        ? " active"
        : "";


    return `
      <button
        class="archive-v004-button${active}"
        data-archive-v004="${key}"
        type="button"
        aria-pressed="${key === currentKey ? "true" : "false"}"
      >
        <span>${label}</span>
      </button>
    `;
  }


  function mountSelector() {
    if (
      document.querySelector(
        ".archive-selector-v004"
      )
    ) {
      return;
    }


    const modeSwitch =
      document.querySelector(
        ".mode-switch"
      );


    if (!modeSwitch) {
      return;
    }


    const section =
      document.createElement(
        "section"
      );


    section.className =
      "archive-selector-v004";


    section.setAttribute(
      "aria-label",
      "Archive model"
    );


    section.innerHTML = `
      <div
        class="archive-v004-label"
      >
        ARCHIVE
      </div>

      <div
        class="archive-v004-buttons"
      >
        ${archiveButton(
          "am",
          "AM PREVIEW"
        )}

        ${archiveButton(
          "opus",
          "OPUS"
        )}

        ${archiveButton(
          "sky",
          "SKY"
        )}
      </div>
    `;


    modeSwitch.before(
      section
    );


    section.addEventListener(
      "click",
      (
        event
      ) => {
        const button =
          event.target.closest(
            "[data-archive-v004]"
          );


        if (!button) {
          return;
        }


        switchArchive(
          button
            .dataset
            .archiveV004
        );
      }
    );
  }


  /* ======================================================
     SUPPORTED MODE
     ====================================================== */

  function syncSupportedAvailability() {
    const supportedTab =
      document.querySelector(
        '.mode-tab[data-mode="supported"]'
      );


    const modeSwitch =
      document.querySelector(
        ".mode-switch"
      );


    if (!supportedTab) {
      return;
    }


    const available =
      Boolean(
        current.supported
      );


    supportedTab.hidden =
      !available;


    supportedTab.disabled =
      !available;


    if (modeSwitch) {
      modeSwitch.classList.toggle(
        "archive-v004-no-supported",
        !available
      );
    }
  }


  /* ======================================================
     ARCHIVE TITLE
     ====================================================== */

  function syncArchiveHeading() {
    const eyebrow =
      document.querySelector(
        ".eyebrow"
      );


    if (!eyebrow) {
      return;
    }


    const isRussian =
      String(
        document
          .documentElement
          .lang ||
        ""
      )
        .toLowerCase()
        .startsWith(
          "ru"
        );


    eyebrow.textContent =
      isRussian
        ? `${current.label} / ИНДЕКС СТИЛЕЙ`
        : `${current.label} / STYLE INDEX`;
  }


  /* ======================================================
     SUPPORTED COUNTERS
     ====================================================== */

  function desiredSupportedText() {
    if (
      current.supportedCount ===
      null
    ) {
      return {
        brand:
          "------",

        stat:
          "—",
      };
    }


    return {
      brand:
        String(
          current.supportedCount
        ).padStart(
          6,
          "0"
        ),

      stat:
        Number(
          current.supportedCount
        ).toLocaleString(
          "en-US"
        ),
    };
  }


  function syncSupportedCounters() {
    /*
      AM already gets its own
      canonical count from app.js.

      Only override for Opus/Sky.
    */
    if (
      currentKey ===
      "am"
    ) {
      return;
    }


    const desired =
      desiredSupportedText();


    const brand =
      document.querySelector(
        "#brandSupportedCount"
      );


    const stat =
      document.querySelector(
        "#supportedStat"
      );


    const info =
      document.querySelector(
        "#infoSupportedCount"
      );


    if (
      brand &&
      brand.textContent !==
        desired.brand
    ) {
      brand.textContent =
        desired.brand;
    }


    if (
      stat &&
      stat.textContent !==
        desired.stat
    ) {
      stat.textContent =
        desired.stat;
    }


    if (
      info &&
      info.textContent !==
        desired.stat
    ) {
      info.textContent =
        desired.stat;
    }
  }


  function watchSupportedCounters() {
    if (
      currentKey ===
      "am"
    ) {
      return;
    }


    const targets = [
      document.querySelector(
        "#brandSupportedCount"
      ),

      document.querySelector(
        "#supportedStat"
      ),

      document.querySelector(
        "#infoSupportedCount"
      ),
    ].filter(
      Boolean
    );


    if (!targets.length) {
      return;
    }


    const observer =
      new MutationObserver(
        () => {
          syncSupportedCounters();
        }
      );


    targets.forEach(
      (
        target
      ) => {
        observer.observe(
          target,
          {
            childList:
              true,

            subtree:
              true,

            characterData:
              true,
          }
        );
      }
    );


    syncSupportedCounters();
  }


  /* ======================================================
     MOUNT
     ====================================================== */

  function mount() {
    if (
      document.body
    ) {
      document
        .body
        .dataset
        .archiveV004 =
          currentKey;
    }


    mountSelector();

    syncSupportedAvailability();

    syncArchiveHeading();

    syncSupportedCounters();

    watchSupportedCounters();


    /*
      Language switch in app.js may
      rewrite the eyebrow.
    */
    const langObserver =
      new MutationObserver(
        () => {
          syncArchiveHeading();
        }
      );


    langObserver.observe(
      document.documentElement,
      {
        attributes:
          true,

        attributeFilter: [
          "lang",
        ],
      }
    );
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
     PUBLIC DEBUG API
     ====================================================== */

  window
    .STYLE_ARCHIVE_ARCHIVES_V004 =
    {
      currentKey,
      current,
      archives:
        ARCHIVES,

      switchArchive,
    };
})();