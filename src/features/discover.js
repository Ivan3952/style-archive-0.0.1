/*
 * DISCOVER в шапке: подборка из 12 стилей (случайные, новые, ещё не виденные, с несколькими превью).
 */
import "../css/features/discover.css";
import { onDomReady, replaceUrl, shuffle, whenAppReady } from "../utils.js";

const LIMIT = 12;

const MODES = [
  ["random", "RANDOM 12", "anything from this archive"],
  ["newest", "NEWEST 12", "latest visual additions"],
  ["unseen", "UNSEEN 12", "skip saved + recent"],
  ["multi", "MULTI-IMAGE 12", "styles with 2+ previews"],
];

let app = null;
let menu = null;

function pickPool(mode) {
  const styles = [...(app?.state?.styles || [])];

  if (mode === "newest") {
    const time = (style) => Date.parse(style.published_at || "") || 0;
    return styles.sort((a, b) => time(b) - time(a)).slice(0, LIMIT);
  }

  if (mode === "unseen") {
    const recent = new Set(app.state.recent || []);
    const saved = app.state.saved || new Set();
    const pool = styles.filter((style) => !recent.has(style.id) && !saved.has(style.id));
    return shuffle(pool.length < LIMIT ? styles : pool).slice(0, LIMIT);
  }

  if (mode === "multi") {
    const pool = styles.filter((style) => Array.isArray(style.media) && style.media.length >= 2);
    return shuffle(pool.length < LIMIT ? styles : pool).slice(0, LIMIT);
  }

  return shuffle(styles).slice(0, LIMIT);
}

function closeMenu() {
  if (menu) menu.hidden = true;
}

function run(mode) {
  app.state.discoveryStyles = pickPool(mode);
  app.state.savedOnly = false;
  app.state.activePreset = "all";
  app.state.visualSort = "archive";

  const searchInput = document.querySelector("#searchInput");
  if (searchInput) searchInput.value = "";

  replaceUrl((params) => {
    params.delete("q");
    params.delete("style");
  });

  app.syncVisualControls?.();
  app.applyVisualFilters(true);
  closeMenu();

  const shell = document.querySelector("#visualShell");
  if (shell) {
    window.scrollTo({ top: Math.max(0, shell.offsetTop - 145), behavior: "smooth" });
  }
}

function mountButton() {
  const wrap = document.createElement("div");
  wrap.className = "discover-polish-wrap-v004";

  const button = document.createElement("button");
  button.id = "discoverPolishButton";
  button.type = "button";
  button.className = "text-button discover-polish-button-v004";
  button.textContent = "DISCOVER";

  menu = document.createElement("div");
  menu.className = "discover-polish-menu-v004";
  menu.hidden = true;
  menu.innerHTML = MODES.map(
    ([mode, title, hint]) =>
      `<button type="button" data-discover-fix="${mode}"><span>${title}</span><small>${hint}</small></button>`
  ).join("");

  wrap.append(button, menu);

  // в шапку, перед кнопкой MENU
  const actions = document.querySelector(".top-actions");
  const menuButton = document.querySelector("#commandSearchButton");
  if (actions) {
    if (menuButton?.parentElement === actions) actions.insertBefore(wrap, menuButton);
    else actions.appendChild(wrap);
  } else {
    const random = document.querySelector("#randomButton");
    if (random?.parentElement) random.parentElement.insertAdjacentElement("afterend", wrap);
    else document.body.appendChild(wrap);
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  menu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-discover-fix]");
    if (item) run(item.dataset.discoverFix);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".discover-polish-wrap-v004")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function init(readyApp) {
  app = readyApp;
  mountButton();
  window.STYLE_ARCHIVE_FINAL_FIX_V004 = { runDiscover: run };
}

onDomReady(() => whenAppReady(init, { label: "Discover", methods: ["applyVisualFilters"] }));
