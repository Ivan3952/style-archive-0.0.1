(() => {
  "use strict";

  const FIRST_RUN_KEY = "style-archive:ru-v004-localizer-installed";
  let raf = 0;
  let observer = null;

  const isRu = () =>
    String(document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("ru");

  const setText = (node, ru, en) => {
    if (!node) return;
    const next = isRu() ? ru : en;
    if (node.textContent !== next) node.textContent = next;
  };

  const setAttr = (node, name, ru, en) => {
    if (!node) return;
    const next = isRu() ? ru : en;
    if (node.getAttribute(name) !== next) node.setAttribute(name, next);
  };

  const upper = (node) =>
    String(node?.textContent || "")
      .trim()
      .toUpperCase();

  function translateArchiveSelector() {
    setText(document.querySelector(".archive-v004-label"), "АРХИВ", "ARCHIVE");

    setAttr(
      document.querySelector(".archive-selector-v004"),
      "aria-label",
      "Выбор архива",
      "Archive model"
    );
  }

  function translateSearchModes() {
    setText(document.querySelector(".search-mode-v004 > span"), "РЕЖИМ", "MODE");

    const labels = {
      smart: ["УМНЫЙ", "SMART"],
      word: ["СЛОВА", "WORD"],
      contains: ["СОДЕРЖИТ", "CONTAINS"],
    };

    document.querySelectorAll("[data-search-mode-v004]").forEach((button) => {
      const row = labels[button.dataset.searchModeV004];
      if (row) setText(button, row[0], row[1]);
    });
  }

  function translateGridDensity() {
    setText(document.querySelector(".grid-density-label-v004"), "РАЗМЕР", "SIZE");

    const labels = {
      compact: ["КОМПАКТНО", "COMPACT"],
      normal: ["ОБЫЧНО", "NORMAL"],
      large: ["КРУПНО", "LARGE"],
    };

    document
      .querySelectorAll(".grid-density-v004 button[data-grid-density-v004]")
      .forEach((button) => {
        const row = labels[button.dataset.gridDensityV004];
        if (row) setText(button, row[0], row[1]);
      });
  }

  function translateSearchDiscovery() {
    setText(document.querySelector(".search-discovery-label-v004"), "НЕДАВНИЕ", "RECENT");

    document.querySelectorAll("[data-search-copy-link]").forEach((button) => {
      const value = upper(button);

      if (value.includes("COPIED") || value.includes("СКОПИРОВАН")) {
        setText(button, "СКОПИРОВАНО", "COPIED");
      } else if (value.includes("ERROR") || value.includes("ОШИБ")) {
        setText(button, "ОШИБКА", "ERROR");
      } else {
        setText(button, "КОПИРОВАТЬ ССЫЛКУ", "COPY LINK");
      }
    });

    document
      .querySelectorAll("[data-search-clear-history]")
      .forEach((button) => setText(button, "ОЧИСТИТЬ", "CLEAR"));
  }

  function commandRow(id) {
    return document.querySelector(`[data-command-id="${id}"]`);
  }

  function setCommand(id, ruTitle, enTitle, ruMeta, enMeta) {
    const row = commandRow(id);
    if (!row) return;

    setText(row.querySelector(".command-item-type-v004"), "КОМАНДА", "COMMAND");

    setText(row.querySelector(".command-item-main-v004"), ruTitle, enTitle);

    setText(row.querySelector(".command-item-meta-v004"), ruMeta, enMeta);
  }

  function translateCommandMenu() {
    setText(document.querySelector("#commandSearchButton"), "МЕНЮ", "MENU");

    setText(document.querySelector(".command-mark-v004"), "STYLE / МЕНЮ", "STYLE / COMMAND");

    const dialog = document.querySelector(".command-dialog-v004");
    setAttr(dialog, "aria-label", "Поиск стилей и команд", "Command search");

    const input = document.querySelector("#commandSearchInput");
    setAttr(input, "placeholder", "поиск стиля или команды", "search styles or type a command");
    setAttr(input, "aria-label", "Поиск стилей и команд", "Search styles or commands");

    const archivesApi = window.STYLE_ARCHIVE_ARCHIVES_V004;
    const archive = archivesApi?.currentKey;

    Object.values(archivesApi?.archives || {}).forEach(({ key, label }) => {
      setCommand(
        `archive-${key}`,
        label,
        label,
        archive === key ? "ТЕКУЩИЙ АРХИВ" : "СМЕНИТЬ АРХИВ",
        archive === key ? "CURRENT ARCHIVE" : "SWITCH ARCHIVE"
      );
    });

    setCommand(
      "random",
      "СЛУЧАЙНЫЙ СТИЛЬ",
      "RANDOM STYLE",
      "ОТКРЫТЬ СЛУЧАЙНЫЙ СТИЛЬ",
      "OPEN RANDOM VISUAL"
    );

    setCommand("discover", "ПОДБОРКИ 12", "DISCOVER 12", "ПОДБОРКА СТИЛЕЙ", "CURATED RANDOM SET");

    setCommand("saved", "ИЗБРАННОЕ", "SAVED", "ПОКАЗАТЬ ИЗБРАННОЕ", "SHOW SAVED STYLES");

    setCommand("recent", "НЕДАВНИЕ", "RECENT", "ОТКРЫТЬ НЕДАВНИЕ", "OPEN RECENT STYLES");

    document.querySelectorAll("[data-command-style]").forEach((row) => {
      setText(row.querySelector(".command-item-type-v004"), "СТИЛЬ", "STYLE");

      setText(
        row.querySelector(".command-item-meta-v004"),
        "ИСКАТЬ В ТЕКУЩЕМ АРХИВЕ",
        "SEARCH CURRENT ARCHIVE"
      );
    });

    document.querySelectorAll(".command-section-label-v004").forEach((node) => {
      const value = upper(node);

      if (value === "QUICK ACTIONS" || value === "БЫСТРЫЕ ДЕЙСТВИЯ") {
        setText(node, "БЫСТРЫЕ ДЕЙСТВИЯ", "QUICK ACTIONS");
      } else if (value === "STYLES" || value === "СТИЛИ") {
        setText(node, "СТИЛИ", "STYLES");
      } else if (value === "COMMANDS" || value === "КОМАНДЫ") {
        setText(node, "КОМАНДЫ", "COMMANDS");
      }
    });

    const footer = document.querySelectorAll(".command-footer-v004 span");
    setText(footer[0], "ТОЛЬКО ВИЗУАЛЬНЫЙ АРХИВ", "VISUAL ARCHIVE ONLY");
    setText(footer[1], "ESC — ЗАКРЫТЬ", "ESC TO CLOSE");

    const empty = document.querySelector(".command-empty-v004");
    if (empty) {
      const hint = empty.querySelector("span");
      setText(
        hint,
        "попробуйте имя стиля, opus, sky, random, saved…",
        "try a style name, opus, sky, random, saved…"
      );

      const textNode = [...empty.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && String(node.textContent || "").trim()
      );

      if (textNode) {
        const next = isRu() ? "НИЧЕГО НЕ НАЙДЕНО " : "NO MATCHES ";
        if (textNode.textContent !== next) textNode.textContent = next;
      }
    }
  }

  function translateDiscover() {
    setText(document.querySelector("#discoverPolishButton"), "ПОДБОРКИ", "DISCOVER");

    const rows = {
      random: [
        "СЛУЧАЙНЫЕ 12",
        "RANDOM 12",
        "случайные стили из текущего архива",
        "anything from this archive",
      ],
      newest: ["НОВЫЕ 12", "NEWEST 12", "последние добавленные превью", "latest visual additions"],
      unseen: [
        "НЕПРОСМОТРЕННЫЕ 12",
        "UNSEEN 12",
        "без избранного и недавних",
        "skip saved + recent",
      ],
      multi: [
        "С НЕСКОЛЬКИМИ ПРЕВЬЮ",
        "MULTI-IMAGE 12",
        "стили с двумя и более превью",
        "styles with 2+ previews",
      ],
    };

    document.querySelectorAll("[data-discover-fix], [data-discover-v004]").forEach((item) => {
      const key = item.dataset.discoverFix || item.dataset.discoverV004;
      const row = rows[key];
      if (!row) return;

      setText(item.querySelector("span"), row[0], row[1]);
      setText(item.querySelector("small"), row[2], row[3]);
    });
  }

  function translateSearchQuality() {
    document.querySelectorAll(".search-lite-hint-v004 span").forEach((span) => {
      const value = upper(span);

      if (value === "ALIAS" || value === "АЛИАС") {
        setText(span, "АЛИАС", "ALIAS");
      } else if (value.includes("DID YOU MEAN") || value.includes("ВОЗМОЖНО")) {
        setText(span, "ВОЗМОЖНО?", "DID YOU MEAN?");
      }
    });
  }

  function translateZeroResult() {
    const root = document.querySelector(".zero-result-polish-v004");
    if (!root) return;

    const pairs = new Map([
      ["NO EXACT RESULTS", ["ТОЧНЫХ СОВПАДЕНИЙ НЕТ", "NO EXACT RESULTS"]],
      ["ТОЧНЫХ СОВПАДЕНИЙ НЕТ", ["ТОЧНЫХ СОВПАДЕНИЙ НЕТ", "NO EXACT RESULTS"]],
      ["MAYBE YOU MEANT", ["ВОЗМОЖНО, ВЫ ИМЕЛИ В ВИДУ", "MAYBE YOU MEANT"]],
      ["ВОЗМОЖНО, ВЫ ИМЕЛИ В ВИДУ", ["ВОЗМОЖНО, ВЫ ИМЕЛИ В ВИДУ", "MAYBE YOU MEANT"]],
      ["TRY ANOTHER ARCHIVE", ["ПОИСКАТЬ В ДРУГОМ АРХИВЕ", "TRY ANOTHER ARCHIVE"]],
      ["ПОИСКАТЬ В ДРУГОМ АРХИВЕ", ["ПОИСКАТЬ В ДРУГОМ АРХИВЕ", "TRY ANOTHER ARCHIVE"]],
      ["CLEAR SEARCH", ["ОЧИСТИТЬ ПОИСК", "CLEAR SEARCH"]],
      ["ОЧИСТИТЬ ПОИСК", ["ОЧИСТИТЬ ПОИСК", "CLEAR SEARCH"]],
    ]);

    root
      .querySelectorAll(".zero-result-title-v004, .zero-result-label-v004, [data-zero-clear]")
      .forEach((node) => {
        const row = pairs.get(
          String(node.textContent || "")
            .trim()
            .toUpperCase()
        );
        if (row) setText(node, row[0], row[1]);
      });
  }

  function translateStyleLink() {
    const button = document.querySelector("#styleDeepLinkCopyV004");
    if (!button) return;

    const value = upper(button);

    if (value.includes("COPIED") || value.includes("СКОПИРОВАН")) {
      setText(button, "ССЫЛКА СКОПИРОВАНА", "LINK COPIED");
    } else {
      setText(button, "КОПИРОВАТЬ ССЫЛКУ", "COPY STYLE LINK");
    }
  }

  function applyAll() {
    translateArchiveSelector();
    translateSearchModes();
    translateGridDensity();
    translateSearchDiscovery();
    translateCommandMenu();
    translateDiscover();
    translateSearchQuality();
    translateZeroResult();
    translateStyleLink();
  }

  function schedule() {
    if (raf) return;

    raf = window.requestAnimationFrame(() => {
      raf = 0;
      applyAll();
    });
  }

  function forceRussianOnce() {
    let installed = false;

    try {
      installed = localStorage.getItem(FIRST_RUN_KEY) === "1";
    } catch {}

    if (installed) return;

    try {
      localStorage.setItem(FIRST_RUN_KEY, "1");
    } catch {}

    if (isRu()) return;

    const button = document.querySelector("#languageButton");

    if (button) {
      button.click();
      window.setTimeout(schedule, 30);
      window.setTimeout(schedule, 180);
    }
  }

  function start() {
    forceRussianOnce();
    schedule();

    document.addEventListener(
      "click",
      () => {
        window.setTimeout(schedule, 0);
        window.setTimeout(schedule, 100);
      },
      true
    );

    document.addEventListener(
      "input",
      () => {
        window.setTimeout(schedule, 80);
      },
      true
    );

    observer = new MutationObserver(() => schedule());

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.STYLE_ARCHIVE_RU_V004 = {
      apply: applyAll,
      version: "safe-1",
    };

    console.info("[v0.0.4] safe RU localizer loaded");
  }

  let tries = 0;

  const timer = window.setInterval(() => {
    tries += 1;

    if (window.STYLE_ARCHIVE_V003?.state && document.querySelector("#languageButton")) {
      window.clearInterval(timer);
      start();
      return;
    }

    if (tries >= 150) {
      window.clearInterval(timer);
      console.warn("[v0.0.4] safe RU localizer: app not ready");
    }
  }, 100);
})();
