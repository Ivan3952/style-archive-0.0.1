/*
 * Удобство интерфейса 0.1.1.
 * Не меняет логику фильтров: только переносит существующие элементы (id и классы остаются)
 * в сворачиваемую панель «Фильтры», чтобы панель поиска не занимала треть экрана.
 */
(() => {
  "use strict";

  const OPEN_KEY = "style-archive:filters-open-v005";
  const SETUP_ATTEMPTS = 40;

  const tr = (ru, en) => (document.documentElement.lang === "en" ? en : ru);

  function readOpen() {
    try {
      return localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  }

  function writeOpen(value) {
    try {
      localStorage.setItem(OPEN_KEY, value ? "1" : "0");
    } catch {}
  }

  function setup() {
    const toolbar = document.querySelector(".toolbar");
    const searchWrap = toolbar?.querySelector(".search-wrap");
    const groups = toolbar?.querySelector(".visual-filter-groups");
    const mode = toolbar?.querySelector(".search-mode-v004");
    const density = toolbar?.querySelector(".grid-density-v004");
    const danbooruPosts = toolbar?.querySelector("#danbooruFilterList");
    const danbooruData = toolbar?.querySelector("#danbooruPresenceList");

    if (!toolbar || !searchWrap || !groups || !mode || !density || !danbooruPosts || !danbooruData) {
      return false;
    }

    if (toolbar.querySelector(".filters-panel-v005")) return true;

    /* строка поиска + кнопка «Фильтры» */
    const bar = document.createElement("div");
    bar.className = "toolbar-bar-v005";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "filters-toggle-v005";
    toggle.id = "filtersToggle";
    toggle.setAttribute("aria-controls", "filtersPanel");
    toggle.innerHTML = `<span class="filters-toggle-label-v005"></span><span class="filters-toggle-count-v005" hidden></span>`;

    toolbar.insertBefore(bar, searchWrap);
    bar.append(searchWrap, toggle);

    /* сама панель: режим поиска, вид сетки, фильтры Danbooru */
    const panel = document.createElement("div");
    panel.className = "filters-panel-v005";
    panel.id = "filtersPanel";
    panel.hidden = true;

    danbooruPosts.classList.add("visual-only-v005");
    danbooruData.classList.add("visual-only-v005");
    density.classList.add("visual-only-v005");

    const section = (title, node) => {
      const box = document.createElement("div");
      box.className = "filters-section-v005";
      if (node.classList.contains("visual-only-v005")) box.classList.add("visual-only-v005");
      box.appendChild(node);
      return box;
    };

    panel.append(
      section("mode", mode),
      section("view", density),
      section("posts", danbooruPosts),
      section("data", danbooruData)
    );

    /* панель — продолжение липкой полосы, а не отдельный блок */
    bar.insertAdjacentElement("afterend", panel);

    const summary = document.createElement("div");
    summary.className = "filters-summary-v005";
    summary.hidden = true;
    panel.insertAdjacentElement("afterend", summary);

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("open", open);
      writeOpen(open);
    }

    toggle.addEventListener("click", () => setOpen(panel.hidden));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden && !document.querySelector("dialog[open]")) {
        setOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (panel.hidden) return;
      if (event.target.closest(".toolbar")) return;
      setOpen(false);
    });

    /* какие настройки панели отличаются от значений по умолчанию */
    function activeLabels() {
      const labels = [];

      const take = (root, defaultValue, prefix, attr) => {
        const active = root.querySelector("button.active");
        if (!active) return;
        const value = active.dataset[attr];
        if (value === undefined || value === defaultValue) return;
        labels.push(`${prefix} ${active.textContent.trim()}`);
      };

      const activeMode = mode.querySelector("button.active");
      if (activeMode && activeMode.dataset.searchModeV004 && activeMode.dataset.searchModeV004 !== "smart") {
        labels.push(`${tr("РЕЖИМ", "MODE")} ${activeMode.textContent.trim()}`);
      }

      take(danbooruPosts, "0", tr("ПОСТЫ", "POSTS"), "danbooruMin");
      /* порог постов сам включает «есть данные», второй чип был бы дублем */
      if (!labels.some((item) => item.startsWith(tr("ПОСТЫ", "POSTS")))) {
        take(danbooruData, "all", tr("ДАННЫЕ", "DATA"), "danbooruPresence");
      }

      return labels;
    }

    function syncLabels() {
      const label = toggle.querySelector(".filters-toggle-label-v005");
      const text = tr("ФИЛЬТРЫ", "FILTERS");
      if (label.textContent !== text) label.textContent = text;

      const labels = activeLabels();
      const count = toggle.querySelector(".filters-toggle-count-v005");
      count.hidden = labels.length === 0;
      count.textContent = String(labels.length);
      toggle.classList.toggle("has-active", labels.length > 0);

      summary.hidden = labels.length === 0 || !panel.hidden;
      const html = labels.map((item) => `<span>${item.replace(/[<>&]/g, "")}</span>`).join("");
      if (summary.innerHTML !== html) summary.innerHTML = html;
    }

    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        syncLabels();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(panel, { subtree: true, attributes: true, attributeFilter: ["class", "disabled"], childList: true, characterData: true });
    new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    panel.addEventListener("click", schedule);

    setOpen(readOpen());
    syncLabels();
    return true;
  }

  /* счётчики в шапке: при нуле прячем, чтобы не шумели */
  function hideZeroCounts() {
    ["recentCount", "trayCount", "savedCount"].forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      const sync = () => {
        const zero = node.textContent.trim() === "0" ? "1" : "0";
        if (node.dataset.zero !== zero) node.dataset.zero = zero;
      };
      sync();
      new MutationObserver(sync).observe(node, { childList: true, characterData: true, subtree: true });
    });
  }

  /* соседние модули достраивают панель поиска позже, поэтому ждём их элементы */
  let attempts = 0;

  function boot() {
    if (attempts === 0) hideZeroCounts();
    if (setup() || attempts >= SETUP_ATTEMPTS) return;
    attempts += 1;
    setTimeout(boot, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
