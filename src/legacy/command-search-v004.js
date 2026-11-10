import { escapeHtml } from "../utils.js";

(() => {
  "use strict";

  const MAX_STYLE_RESULTS = 8;
  const DEBOUNCE_MS = 60;

  let overlay = null;
  let input = null;
  let results = null;
  let trigger = null;

  let previousFocus = null;
  let timer = null;

  let styleIndex = [];
  let indexReady = false;

  /* ======================================================
     HELPERS
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
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(value) {
    return norm(value).replace(/[\s\-_.()[\]{}'"`~:/\\]+/g, "");
  }

  /* ======================================================
     STYLE INDEX
     ====================================================== */

  function buildStyleIndex(styles) {
    const seen = new Set();

    styleIndex = [];

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

      styleIndex.push({
        name,
        norm: key,
        compact: compact(name),
      });
    });

    indexReady = true;

    console.info(`[v0.0.4] command search index: ${styleIndex.length} visual styles`);
  }

  function waitForArchive() {
    let attempts = 0;

    const waiter = window.setInterval(() => {
      attempts += 1;

      const styles = window.STYLE_ARCHIVE_V003?.state?.styles;

      if (Array.isArray(styles) && styles.length) {
        window.clearInterval(waiter);

        buildStyleIndex(styles);

        if (overlay && !overlay.hidden) {
          render();
        }

        return;
      }

      if (attempts >= 120) {
        window.clearInterval(waiter);
      }
    }, 100);
  }

  /* ======================================================
     ARCHIVE
     ====================================================== */

  function currentArchive() {
    return (
      window.STYLE_ARCHIVE_ARCHIVES_V004?.currentKey ||
      new URL(window.location.href).searchParams.get("archive") ||
      "am"
    );
  }

  function switchArchive(key) {
    closePalette();

    const api = window.STYLE_ARCHIVE_ARCHIVES_V004;

    if (api && typeof api.switchArchive === "function") {
      api.switchArchive(key);
      return;
    }

    const url = new URL(window.location.href);

    url.searchParams.set("archive", key);

    window.location.href = url.href;
  }

  /* ======================================================
     MAIN SEARCH
     ====================================================== */

  function searchStyle(name) {
    closePalette();

    const discovery = window.STYLE_ARCHIVE_DISCOVERY_V004;

    if (discovery && typeof discovery.setQuery === "function") {
      discovery.setQuery(name);
    } else {
      const search = document.querySelector("#searchInput");

      if (search) {
        search.value = name;

        search.dispatchEvent(
          new Event("input", {
            bubbles: true,
          })
        );
      }
    }

    window.setTimeout(() => {
      const shell = document.querySelector("#visualShell");

      if (shell) {
        window.scrollTo({
          top: Math.max(0, shell.offsetTop - 145),

          behavior: "smooth",
        });
      }
    }, 80);
  }

  /* ======================================================
     EXISTING SITE ACTIONS
     ====================================================== */

  function clickExisting(selector) {
    closePalette();

    const element = document.querySelector(selector);

    element?.click();
  }

  function randomAny() {
    closePalette();

    const button = document.querySelector('[data-random-mode="any"]');

    button?.click();
  }

  /* ======================================================
     COMMANDS
     ====================================================== */

  // Команды переключения архивов строятся из data/archives.json
  function archiveCommands(current) {
    const archives = Object.values(window.STYLE_ARCHIVE_ARCHIVES_V004?.archives || {});

    return archives.map(({ key, label, aliases }) => ({
      id: `archive-${key}`,
      title: label,
      meta: key === current ? "CURRENT ARCHIVE" : "SWITCH ARCHIVE",
      keywords: [label.toLowerCase(), key, "archive model", ...aliases].join(" "),
      action: () => switchArchive(key),
    }));
  }

  function commands() {
    const archive = currentArchive();

    return [
      ...archiveCommands(archive),

      {
        id: "random",
        title: "RANDOM STYLE",
        meta: "OPEN RANDOM VISUAL",
        keywords: "random surprise any",

        action: randomAny,
      },

      {
        id: "discover",
        title: "DISCOVER 12",
        meta: "CURATED RANDOM SET",
        keywords: "discover explore twelve 12",

        action: () => clickExisting("#discoverPolishButton"),
      },

      {
        id: "saved",
        title: "SAVED",
        meta: "SHOW SAVED STYLES",
        keywords: "saved favorites favourite bookmark",

        action: () => clickExisting("#savedButton"),
      },

      {
        id: "recent",
        title: "RECENT",
        meta: "OPEN RECENT STYLES",
        keywords: "recent history viewed",

        action: () => clickExisting("#recentButton"),
      },
    ];
  }

  /* ======================================================
     STYLE SEARCH
     ====================================================== */

  function findStyles(query) {
    if (!indexReady || !query) {
      return [];
    }

    const qn = norm(query);
    const qc = compact(query);

    if (!qn) {
      return [];
    }

    const exact = [];
    const prefix = [];
    const contains = [];

    for (const entry of styleIndex) {
      if (entry.norm === qn || entry.compact === qc) {
        exact.push(entry);
        continue;
      }

      if (entry.norm.startsWith(qn) || (qc && entry.compact.startsWith(qc))) {
        prefix.push(entry);
        continue;
      }

      if (entry.norm.includes(qn) || (qc && entry.compact.includes(qc))) {
        contains.push(entry);
      }
    }

    return [...exact, ...prefix, ...contains].slice(0, MAX_STYLE_RESULTS);
  }

  function findCommands(query) {
    const q = norm(query);

    const rows = commands();

    if (!q) {
      return rows;
    }

    return rows.filter((command) => {
      const haystack = norm([command.title, command.meta, command.keywords].join(" "));

      return haystack.includes(q);
    });
  }

  /* ======================================================
     RENDER
     ====================================================== */

  function commandHtml(command) {
    const current = command.meta === "CURRENT ARCHIVE";

    return `
      <button
        class="command-item-v004 ${current ? "is-current" : ""}"
        type="button"
        data-command-id="${escapeHtml(command.id)}"
      >
        <span
          class="command-item-type-v004"
        >
          COMMAND
        </span>

        <span
          class="command-item-main-v004"
        >
          ${escapeHtml(command.title)}
        </span>

        <span
          class="command-item-meta-v004"
        >
          ${escapeHtml(command.meta)}
        </span>
      </button>
    `;
  }

  function styleHtml(style) {
    return `
      <button
        class="command-item-v004"
        type="button"
        data-command-style="${escapeHtml(style.name)}"
      >
        <span
          class="command-item-type-v004"
        >
          STYLE
        </span>

        <span
          class="command-item-main-v004"
        >
          ${escapeHtml(style.name)}
        </span>

        <span
          class="command-item-meta-v004"
        >
          SEARCH CURRENT ARCHIVE
        </span>
      </button>
    `;
  }

  function render() {
    if (!input || !results) {
      return;
    }

    const query = clean(input.value);

    const commandRows = findCommands(query);

    const styleRows = findStyles(query);

    let html = "";

    if (!query) {
      html += `
        <div
          class="command-section-label-v004"
        >
          QUICK ACTIONS
        </div>
      `;

      html += commandRows.map(commandHtml).join("");
    } else {
      if (styleRows.length) {
        html += `
          <div
            class="command-section-label-v004"
          >
            STYLES
          </div>
        `;

        html += styleRows.map(styleHtml).join("");
      }

      if (commandRows.length) {
        html += `
          <div
            class="command-section-label-v004"
          >
            COMMANDS
          </div>
        `;

        html += commandRows.map(commandHtml).join("");
      }

      if (!styleRows.length && !commandRows.length) {
        html = `
          <div
            class="command-empty-v004"
          >
            NO MATCHES
            <span>
              try a style name, opus, sky, random, saved…
            </span>
          </div>
        `;
      }
    }

    results.innerHTML = html;
  }

  function scheduleRender() {
    window.clearTimeout(timer);

    timer = window.setTimeout(render, DEBOUNCE_MS);
  }

  /* ======================================================
     OPEN / CLOSE
     ====================================================== */

  function openPalette() {
    if (!overlay) {
      return;
    }

    previousFocus = document.activeElement;

    overlay.hidden = false;

    document.body.classList.add("command-search-open-v004");

    input.value = "";

    render();

    window.requestAnimationFrame(() => {
      input.focus();
    });
  }

  function closePalette() {
    if (!overlay || overlay.hidden) {
      return;
    }

    overlay.hidden = true;

    document.body.classList.remove("command-search-open-v004");

    if (previousFocus && typeof previousFocus.focus === "function") {
      try {
        previousFocus.focus({
          preventScroll: true,
        });
      } catch {}
    }
  }

  function togglePalette() {
    if (overlay?.hidden) {
      openPalette();
    } else {
      closePalette();
    }
  }

  /* ======================================================
     EXECUTE CLICK
     ====================================================== */

  function executeCommand(id) {
    const command = commands().find((row) => row.id === id);

    command?.action();
  }

  /* ======================================================
     UI
     ====================================================== */

  function mountTrigger() {
    if (document.querySelector("#commandSearchButton")) {
      trigger = document.querySelector("#commandSearchButton");

      return;
    }

    const actions = document.querySelector(".top-actions");

    if (!actions) {
      return;
    }

    trigger = document.createElement("button");

    trigger.id = "commandSearchButton";

    trigger.type = "button";

    trigger.className = "text-button command-trigger-v004";

    trigger.innerHTML = `MENU`;

    actions.prepend(trigger);

    trigger.addEventListener("click", openPalette);
  }

  function mountOverlay() {
    if (document.querySelector("#commandSearchOverlay")) {
      overlay = document.querySelector("#commandSearchOverlay");

      input = overlay.querySelector("#commandSearchInput");

      results = overlay.querySelector("#commandSearchResults");

      return;
    }

    overlay = document.createElement("div");

    overlay.id = "commandSearchOverlay";

    overlay.className = "command-overlay-v004";

    overlay.hidden = true;

    overlay.innerHTML = `
      <div
        class="command-backdrop-v004"
        data-command-close
      ></div>

      <section
        class="command-dialog-v004"
        role="dialog"
        aria-modal="true"
        aria-label="Command search"
      >
        <header
          class="command-header-v004"
        >
          <span
            class="command-mark-v004"
          >
            STYLE / COMMAND
          </span>

          <button
            class="command-close-v004"
            type="button"
            data-command-close
          >
            ESC
          </button>
        </header>

        <div
          class="command-input-wrap-v004"
        >
          <span>/</span>

          <input
            id="commandSearchInput"
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="search styles or type a command"
            aria-label="Search styles or commands"
          >
        </div>

        <div
          class="command-results-v004"
          id="commandSearchResults"
        ></div>

        <footer
          class="command-footer-v004"
        >
          <span>
            VISUAL ARCHIVE ONLY
          </span>

          <span>
            ESC TO CLOSE
          </span>
        </footer>
      </section>
    `;

    document.body.appendChild(overlay);

    input = overlay.querySelector("#commandSearchInput");

    results = overlay.querySelector("#commandSearchResults");

    input.addEventListener("input", scheduleRender);

    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-command-close]")) {
        closePalette();
        return;
      }

      const command = event.target.closest("[data-command-id]");

      if (command) {
        executeCommand(command.dataset.commandId);

        return;
      }

      const style = event.target.closest("[data-command-style]");

      if (style) {
        searchStyle(style.dataset.commandStyle);
      }
    });
  }

  /* ======================================================
     HOTKEY
     ====================================================== */

  function bindHotkey() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay && !overlay.hidden) {
        event.preventDefault();

        closePalette();
      }
    });
  }

  /* ======================================================
     MOUNT
     ====================================================== */

  function mount() {
    mountTrigger();

    mountOverlay();

    bindHotkey();

    waitForArchive();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, {
      once: true,
    });
  } else {
    mount();
  }

  window.STYLE_ARCHIVE_COMMAND_V004 = {
    open: openPalette,

    close: closePalette,

    getIndexSize() {
      return styleIndex.length;
    },
  };
})();
