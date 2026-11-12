/*
 * Раздел «Персонажи» 0.1.3: отдельная страница characters.html.
 * Данные: data/characters.json (tools/import_characters.py, источник — Stable Waifu / Characters AM).
 * Со страницей стилей общие только оформление, тема, язык и микс (читается из localStorage).
 */
import "@fontsource-variable/geologica/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "../css/style.css";
import "../css/mobile.css";
import "../css/usability-v005.css";
import "../css/winter-v005.css";
import "../css/section-switch-v008.css";
import "../css/characters-v008.css";

const DATA_URL = "./data/characters.json";
const SAVED_KEY = "style-archive:characters-saved-v008";
const LANG_KEY = "style-archive:lang";
const THEME_KEY = "style-archive:theme";
const TRAY_KEY = "style-archive:tray";
const MIX_KEY = "style-archive:mix-v006";
const BATCH = 48;
const TOP_TITLES = 10;

/* ---------- язык ---------- */

const DICT = {
  ru: {
    styles: "СТИЛИ",
    characters: "ПЕРСОНАЖИ",
    saved: "СОХРАНЁННЫЕ",
    eyebrow: "ИНДЕКС ПЕРСОНАЖЕЙ",
    title: "Персонажи",
    statCharacters: "ПЕРСОНАЖЕЙ",
    statTitles: "ТАЙТЛОВ",
    search: "ПОИСК",
    searchPlaceholder: "имя, тайтл или тег",
    titlePlaceholder: "тайтл: все",
    sourceText: "Список, теги и превью собраны сообществом Stable Waifu. Источник:",
    all: "ВСЕ",
    copy: "КОПИРОВАТЬ",
    copyWithMix: "+ МИКС",
    copyWithMixTitle: "Скопировать вместе со стилями из микса",
    noPreview: "превью пока нет",
    sourceLink: "на Stable Waifu ↗",
    sourceLinkTitle: "Открыть персонажа на сайте Stable Waifu (там есть их превью)",
    generatedNote:
      "Превью сгенерировано Anima по тегам этой карточки: один промпт и сид для всех персонажей.",
    copied: "СКОПИРОВАНО",
    copiedWithMix: "СКОПИРОВАНО ВМЕСТЕ С МИКСОМ",
    copyFailed: "НЕ УДАЛОСЬ СКОПИРОВАТЬ",
    saveOn: "Сохранить",
    saveOff: "Убрать из сохранённых",
    savedToast: "СОХРАНЕНО",
    unsavedToast: "УБРАНО ИЗ СОХРАНЁННЫХ",
    variant: "вариант",
    open: "Открыть крупно",
    close: "ЗАКРЫТЬ",
    notes: "Заметки",
    shown: "показано",
    of: "из",
    emptySearch: "Ничего не нашли. Попробуй имя латиницей, тайтл или тег из образа.",
    emptySaved: "Сохранённых персонажей пока нет: нажми ☆ на карточке.",
    emptyData: "Данные персонажей ещё не загружены.",
    reset: "СБРОСИТЬ ФИЛЬТРЫ",
    updated: "ПЕРСОНАЖИ ОБНОВЛЕНЫ",
    savedOnly: "ТОЛЬКО СОХРАНЁННЫЕ",
    filterTitle: "тайтл",
    filterLetter: "буква",
  },
  en: {
    styles: "STYLES",
    characters: "CHARACTERS",
    saved: "SAVED",
    eyebrow: "CHARACTER INDEX",
    title: "Characters",
    statCharacters: "CHARACTERS",
    statTitles: "TITLES",
    search: "SEARCH",
    searchPlaceholder: "name, title or tag",
    titlePlaceholder: "title: all",
    sourceText: "List, tags and previews are collected by the Stable Waifu community. Source:",
    all: "ALL",
    copy: "COPY",
    copyWithMix: "+ MIX",
    copyWithMixTitle: "Copy together with the styles from your mix",
    noPreview: "no preview yet",
    sourceLink: "on Stable Waifu ↗",
    sourceLinkTitle: "Open this character on the Stable Waifu site (they have their own preview)",
    generatedNote:
      "Preview generated with Anima from this card's tags: one prompt and seed for every character.",
    copied: "COPIED",
    copiedWithMix: "COPIED WITH THE MIX",
    copyFailed: "COULD NOT COPY",
    saveOn: "Save",
    saveOff: "Remove from saved",
    savedToast: "SAVED",
    unsavedToast: "REMOVED FROM SAVED",
    variant: "variant",
    open: "Open large",
    close: "CLOSE",
    notes: "Notes",
    shown: "shown",
    of: "of",
    emptySearch: "Nothing found. Try a romanized name, a title or a tag from the outfit.",
    emptySaved: "No saved characters yet: press ☆ on a card.",
    emptyData: "Character data is not loaded yet.",
    reset: "RESET FILTERS",
    updated: "CHARACTERS UPDATED",
    savedOnly: "SAVED ONLY",
    filterTitle: "title",
    filterLetter: "letter",
  },
};

const lang = () => (document.documentElement.lang === "en" ? "en" : "ru");
const t = (key) => DICT[lang()][key] ?? DICT.ru[key] ?? key;

/* ---------- состояние ---------- */

const params = new URL(window.location.href).searchParams;

const state = {
  all: [],
  byId: new Map(),
  filtered: [],
  rendered: 0,
  q: params.get("q") || "",
  title: params.get("title") || "",
  letter: params.get("letter") || "",
  savedOnly: params.get("saved") === "1",
  variant: new Map(),
  saved: readSaved(),
  updatedAt: "",
  loaded: false,
};

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSaved() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...state.saved]));
  } catch {}
}

const $ = (selector) => document.querySelector(selector);
const el = {
  grid: $("#chGrid"),
  sentinel: $("#chSentinel"),
  empty: $("#chEmpty"),
  status: $("#chStatus"),
  search: $("#chSearch"),
  count: $("#chCount"),
  title: $("#chTitle"),
  titleList: $("#chTitleList"),
  titleClear: $("#chTitleClear"),
  topTitles: $("#chTopTitles"),
  letters: $("#chLetters"),
  savedButton: $("#chSavedButton"),
  savedCount: $("#chSavedCount"),
  langButton: $("#chLangButton"),
  themeButton: $("#chThemeButton"),
  themeColor: $("#themeColor"),
  statCount: $("#chStatCount"),
  statTitles: $("#chStatTitles"),
  updated: $("#chUpdated"),
  viewer: $("#chViewer"),
  toast: $("#toast"),
};

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

/* поиск не различает регистр, экранирование, скобки и подчёркивания */
const norm = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\\/g, "")
    .replace(/[()_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmt = (number) => new Intl.NumberFormat(lang() === "en" ? "en-US" : "ru-RU").format(number);

/* ---------- микс со страницы стилей ---------- */

function mixLine() {
  try {
    const tray = JSON.parse(localStorage.getItem(TRAY_KEY) || "[]").filter(
      (name) => typeof name === "string" && name.trim()
    );
    if (!tray.length) return "";
    const store = JSON.parse(localStorage.getItem(MIX_KEY) || "{}") || {};
    /* тот же ключ, что у панели микса (normalizeStyleName в app.js) */
    const key = (name) =>
      String(name || "")
        .normalize("NFKC")
        .toLowerCase()
        .replaceAll("ё", "е")
        .trim()
        .replace(/\s+/g, " ");
    if (store.format === "blend" && tray.length >= 2) {
      return `@[${tray.map((name) => name.replace(/^@/, "")).join("|")}]`;
    }
    return tray
      .map((name) => {
        const weight = Number(store.weights?.[key(name)]);
        return Number.isFinite(weight) && weight !== 1 ? `(${name}:${weight.toFixed(1)})` : name;
      })
      .join(", ");
  } catch {
    return "";
  }
}

/* ---------- данные ---------- */

async function load() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    state.all = (data.characters || []).map((character, order) => ({
      ...character,
      order,
      variants: character.variants?.length ? character.variants : [{ label: "", tags: "" }],
      notes: character.notes || [],
      nameNorm: norm(character.name),
      baseNorm: norm(character.base || character.name),
      titleNorm: norm(character.title),
      hay: norm(
        [
          character.name,
          character.title,
          ...(character.variants || []).flatMap((variant) => [variant.label, variant.tags]),
        ].join(" | ")
      ),
    }));
    state.byId = new Map(state.all.map((character) => [character.id, character]));
    state.updatedAt = data.updated_at || "";
    state.loaded = true;
  } catch {
    state.loaded = false;
  }
}

/* ---------- фильтры ---------- */

function applyFilters() {
  const tokens = norm(state.q).split(" ").filter(Boolean);
  const title = norm(state.title);
  const query = norm(state.q);

  let list = state.all.filter((character) => {
    if (state.savedOnly && !state.saved.has(character.id)) return false;
    if (title && character.titleNorm !== title) return false;
    if (state.letter && character.letter !== state.letter) return false;
    return tokens.every((token) => character.hay.includes(token));
  });

  if (query) {
    const score = (character) => {
      if (character.baseNorm === query || character.nameNorm === query) return 0;
      if (character.baseNorm.startsWith(query)) return 1;
      if (character.nameNorm.includes(query)) return 2;
      if (character.titleNorm.includes(query)) return 3;
      return 4;
    };
    list = list
      .map((character) => [score(character), character])
      .sort((a, b) => a[0] - b[0] || a[1].order - b[1].order)
      .map(([, character]) => character);
  }

  state.filtered = list;
  state.rendered = 0;
  el.grid.innerHTML = "";
  renderMore();
  syncControls();
  syncUrl();
}

function syncUrl() {
  const url = new URL(window.location.href);
  const set = (key, value) =>
    value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  set("q", state.q.trim());
  set("title", state.title);
  set("letter", state.letter);
  set("saved", state.savedOnly ? "1" : "");
  history.replaceState(null, "", url);
}

/* ---------- карточки ---------- */

function currentVariant(character) {
  const index = Math.min(state.variant.get(character.id) || 0, character.variants.length - 1);
  return { index, variant: character.variants[index] };
}

function variantLabel(variant, index) {
  return variant.label || `${t("variant")} ${index + 1}`;
}

function sourceLink(character) {
  if (!character.source_url) return "";
  return `<a class="ch-source-link-v008" href="${esc(character.source_url)}" target="_blank" rel="noopener" title="${esc(t("sourceLinkTitle"))}">${esc(t("sourceLink"))}</a>`;
}

function cardHtml(character) {
  const { index, variant } = currentVariant(character);
  const saved = state.saved.has(character.id);
  /* без превью — низкая заглушка, чтобы тысячи пустых карточек не выглядели поломкой */
  const ratio = character.image
    ? character.width && character.height
      ? `${character.width}/${character.height}`
      : "2/3"
    : "3/2";
  const showVariants = character.variants.length > 1;

  return `
    <article class="ch-card-v008" data-id="${esc(character.id)}">
      <button class="ch-media-v008" type="button" data-open style="aspect-ratio:${ratio}" aria-label="${esc(t("open"))}: ${esc(character.name)}">
        ${character.image ? `<img src=".${esc(character.image)}" alt="" loading="lazy" decoding="async">` : `<span class="ch-noimg-v008"><b>${esc((character.base || character.name).slice(0, 1))}</b><small>${esc(t("noPreview"))}</small></span>`}
        ${showVariants ? `<span class="ch-vcount-v008">×${character.variants.length}</span>` : ""}
      </button>
      <div class="ch-body-v008">
        <div class="ch-head-v008">
          <h3 class="ch-name-v008" title="${esc(character.name)}">${esc(character.base || character.name)}</h3>
          <button class="ch-save-v008${saved ? " on" : ""}" type="button" data-save aria-pressed="${saved}" title="${esc(saved ? t("saveOff") : t("saveOn"))}">${saved ? "★" : "☆"}</button>
        </div>
        ${character.title ? `<button class="ch-title-v008" type="button" data-title="${esc(character.title)}">${esc(character.title)}</button>` : ""}
        ${
          showVariants
            ? `<div class="ch-variants-v008">${character.variants
                .map(
                  (item, position) =>
                    `<button type="button" data-variant="${position}" class="${position === index ? "active" : ""}">${esc(variantLabel(item, position))}</button>`
                )
                .join("")}</div>`
            : variant.label
              ? `<div class="ch-variants-v008"><span class="ch-variant-single-v008">${esc(variant.label)}</span></div>`
              : ""
        }
        <p class="ch-tags-v008" title="${esc(variant.tags)}">${esc(variant.tags)}</p>
        ${character.notes.map((note) => `<p class="ch-note-v008">${esc(note)}</p>`).join("")}
        ${sourceLink(character)}
        <div class="ch-actions-v008">
          <button class="ch-btn-v008 primary" type="button" data-copy>${esc(t("copy"))}</button>
          <button class="ch-btn-v008 ch-mix-btn-v008" type="button" data-copy-mix title="${esc(t("copyWithMixTitle"))}">${esc(t("copyWithMix"))}</button>
        </div>
      </div>
    </article>`;
}

function renderMore() {
  const next = state.filtered.slice(state.rendered, state.rendered + BATCH);
  if (next.length) {
    el.grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
    state.rendered += next.length;
  }
  syncMixButtons();
  syncStatus();
}

function rerenderCard(id) {
  const node = el.grid.querySelector(`[data-id="${CSS.escape(id)}"]`);
  const character = state.byId.get(id);
  if (!node || !character) return;
  node.outerHTML = cardHtml(character);
  syncMixButtons();
}

function syncMixButtons() {
  const line = mixLine();
  document.documentElement.classList.toggle("ch-has-mix-v008", Boolean(line));
  el.grid.querySelectorAll("[data-copy-mix]").forEach((button) => {
    button.title = line ? `${t("copyWithMixTitle")}: ${line}` : t("copyWithMixTitle");
  });
}

function syncStatus() {
  const total = state.filtered.length;
  el.count.textContent = `${fmt(total)} / ${fmt(state.all.length)}`;

  const parts = [];
  if (state.title) parts.push(`${t("filterTitle")}: ${state.title}`);
  if (state.letter) parts.push(`${t("filterLetter")}: ${state.letter}`);
  if (state.savedOnly) parts.push(t("savedOnly"));
  el.status.textContent = parts.length
    ? `${parts.join(" · ")} — ${t("shown")} ${fmt(Math.min(state.rendered, total))} ${t("of")} ${fmt(total)}`
    : "";

  const empty = state.loaded && total === 0;
  el.empty.hidden = state.loaded ? !empty : false;
  if (!state.loaded) {
    el.empty.textContent = t("emptyData");
  } else if (empty) {
    el.empty.innerHTML = `${esc(state.savedOnly && !state.q && !state.title && !state.letter ? t("emptySaved") : t("emptySearch"))} <button class="ch-btn-v008" type="button" data-reset>${esc(t("reset"))}</button>`;
  }
}

/* ---------- элементы управления ---------- */

function titleCounts() {
  const counts = new Map();
  state.all.forEach((character) => {
    if (character.title) counts.set(character.title, (counts.get(character.title) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function buildControls() {
  const titles = titleCounts();
  el.titleList.innerHTML = titles
    .map(([title, count]) => `<option value="${esc(title)}">${count}</option>`)
    .join("");

  el.topTitles.innerHTML = titles
    .slice(0, TOP_TITLES)
    .map(
      ([title]) =>
        `<button class="filter-chip" type="button" data-top-title="${esc(title)}">${esc(title)}</button>`
    )
    .join("");

  const letters = [...new Set(state.all.map((character) => character.letter).filter(Boolean))].sort(
    (a, b) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b))
  );
  el.letters.innerHTML =
    `<button type="button" data-letter="">${esc(t("all"))}</button>` +
    letters
      .map((letter) => `<button type="button" data-letter="${esc(letter)}">${esc(letter)}</button>`)
      .join("");

  el.statCount.textContent = fmt(state.all.length);
  el.statTitles.textContent = fmt(titles.length);
  el.updated.textContent = state.updatedAt
    ? `${t("updated")} ${state.updatedAt.split("-").reverse().join(".")}`
    : "";
}

function syncControls() {
  if (el.search.value !== state.q) el.search.value = state.q;
  if (el.title.value !== state.title) el.title.value = state.title;
  el.titleClear.hidden = !state.title;
  el.topTitles.querySelectorAll("[data-top-title]").forEach((button) => {
    button.classList.toggle("active", norm(button.dataset.topTitle) === norm(state.title));
  });
  el.letters.querySelectorAll("[data-letter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.letter === state.letter);
  });
  el.savedButton.classList.toggle("active", state.savedOnly);
  el.savedCount.textContent = String(state.saved.size);
  el.savedCount.dataset.zero = state.saved.size ? "0" : "1";
}

function applyLocale() {
  document.querySelectorAll("[data-ch-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.chI18n);
  });
  document.querySelectorAll("[data-ch-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.chI18nPlaceholder);
  });
  el.langButton.textContent = lang() === "en" ? "RU" : "EN";
  el.langButton.setAttribute("aria-label", lang() === "en" ? "Русский" : "English");
  el.themeButton.setAttribute("aria-label", lang() === "en" ? "Switch theme" : "Сменить тему");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  el.themeColor?.setAttribute("content", theme === "light" ? "#f2f6fa" : "#0a0e14");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

/* ---------- копирование и уведомления ---------- */

let toastTimer = null;
function toast(text) {
  window.clearTimeout(toastTimer);
  el.toast.textContent = text;
  el.toast.classList.add("show");
  toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), 1400);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) {
      toast(t("copyFailed"));
      return;
    }
  }
  toast(message);
}

function copyCharacter(character, withMix, variantIndex = null) {
  const index = variantIndex ?? currentVariant(character).index;
  const tags = character.variants[index]?.tags || "";
  const mix = withMix ? mixLine() : "";
  copyText(mix ? `${tags}, ${mix}` : tags, mix ? t("copiedWithMix") : t("copied"));
}

function toggleSaved(id) {
  if (state.saved.has(id)) {
    state.saved.delete(id);
    toast(t("unsavedToast"));
  } else {
    state.saved.add(id);
    toast(t("savedToast"));
  }
  writeSaved();
  syncControls();
  if (state.savedOnly) applyFilters();
  else rerenderCard(id);
  if (el.viewer.open && el.viewer.dataset.id === id) openViewer(id);
}

/* ---------- просмотр ---------- */

function openViewer(id) {
  const character = state.byId.get(id);
  if (!character) return;
  const saved = state.saved.has(id);
  const { index } = currentVariant(character);

  el.viewer.dataset.id = id;
  el.viewer.querySelector(".ch-viewer-shell-v008").innerHTML = `
    <div class="ch-viewer-media-v008${character.image ? "" : " empty"}">
      ${
        character.image
          ? `<img src=".${esc(character.image)}" alt="${esc(character.name)}">`
          : `<span class="ch-noimg-v008"><b>${esc((character.base || character.name).slice(0, 1))}</b><small>${esc(t("noPreview"))}</small></span>`
      }
    </div>
    <div class="ch-viewer-info-v008">
      <header>
        <div>
          ${character.title ? `<span class="eyebrow">${esc(character.title)}</span>` : ""}
          <h2>${esc(character.base || character.name)}</h2>
        </div>
        <button class="text-button" type="button" data-close>${esc(t("close"))}</button>
      </header>
      <ul class="ch-viewer-variants-v008">
        ${character.variants
          .map(
            (variant, position) => `
          <li class="${position === index ? "active" : ""}">
            <div class="ch-viewer-variant-head-v008">
              <span>${esc(character.variants.length > 1 || variant.label ? variantLabel(variant, position) : "")}</span>
              <span class="ch-viewer-buttons-v008">
                <button class="ch-btn-v008 primary" type="button" data-copy-variant="${position}">${esc(t("copy"))}</button>
                <button class="ch-btn-v008 ch-mix-btn-v008" type="button" data-copy-variant-mix="${position}" title="${esc(t("copyWithMixTitle"))}">${esc(t("copyWithMix"))}</button>
              </span>
            </div>
            <p>${esc(variant.tags)}</p>
          </li>`
          )
          .join("")}
      </ul>
      ${
        character.notes.length
          ? `<div class="ch-viewer-notes-v008"><span class="eyebrow">${esc(t("notes"))}</span>${character.notes
              .map((note) => `<p>${esc(note)}</p>`)
              .join("")}</div>`
          : ""
      }
      ${character.image ? `<p class="ch-generated-v008">${esc(t("generatedNote"))}</p>` : ""}
      ${sourceLink(character)}
      <button class="ch-btn-v008 ch-viewer-save-v008${saved ? " on" : ""}" type="button" data-viewer-save>${saved ? "★" : "☆"} ${esc(saved ? t("saveOff") : t("saveOn"))}</button>
    </div>`;

  if (!el.viewer.open) el.viewer.showModal();
}

/* ---------- события ---------- */

function bind() {
  let searchTimer = null;
  el.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.q = el.search.value;
      applyFilters();
    }, 120);
  });

  const commitTitle = () => {
    const value = el.title.value.trim();
    const match = titleCounts().find(([title]) => norm(title) === norm(value));
    if (value && !match) return;
    state.title = match ? match[0] : "";
    applyFilters();
  };
  el.title.addEventListener("change", commitTitle);
  el.title.addEventListener("input", () => {
    if (!el.title.value.trim() && state.title) commitTitle();
    else if (titleCounts().some(([title]) => title === el.title.value)) commitTitle();
  });
  el.titleClear.addEventListener("click", () => {
    state.title = "";
    applyFilters();
  });

  el.topTitles.addEventListener("click", (event) => {
    const button = event.target.closest("[data-top-title]");
    if (!button) return;
    state.title =
      norm(button.dataset.topTitle) === norm(state.title) ? "" : button.dataset.topTitle;
    applyFilters();
  });

  el.letters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-letter]");
    if (!button) return;
    state.letter = button.dataset.letter === state.letter ? "" : button.dataset.letter;
    applyFilters();
  });

  el.savedButton.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    applyFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  el.langButton.addEventListener("click", () => {
    const next = lang() === "en" ? "ru" : "en";
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
    applyLocale();
    buildControls();
    syncControls();
    el.grid.innerHTML = "";
    state.rendered = 0;
    renderMore();
  });

  el.themeButton.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  });

  el.grid.addEventListener("click", (event) => {
    const card = event.target.closest(".ch-card-v008");
    if (!card) return;
    const character = state.byId.get(card.dataset.id);
    if (!character) return;

    const variant = event.target.closest("[data-variant]");
    if (variant) {
      state.variant.set(character.id, Number(variant.dataset.variant) || 0);
      rerenderCard(character.id);
      return;
    }
    if (event.target.closest("[data-copy]")) return copyCharacter(character, false);
    if (event.target.closest("[data-copy-mix]")) return copyCharacter(character, true);
    if (event.target.closest("[data-save]")) return toggleSaved(character.id);
    const title = event.target.closest("[data-title]");
    if (title) {
      state.title = title.dataset.title;
      applyFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (event.target.closest("[data-open]")) openViewer(character.id);
  });

  el.empty.addEventListener("click", (event) => {
    if (!event.target.closest("[data-reset]")) return;
    Object.assign(state, { q: "", title: "", letter: "", savedOnly: false });
    applyFilters();
  });

  el.viewer.addEventListener("click", (event) => {
    if (event.target === el.viewer || event.target.closest("[data-close]")) {
      el.viewer.close();
      return;
    }
    const character = state.byId.get(el.viewer.dataset.id);
    if (!character) return;
    const copy = event.target.closest("[data-copy-variant]");
    if (copy) return copyCharacter(character, false, Number(copy.dataset.copyVariant));
    const copyMix = event.target.closest("[data-copy-variant-mix]");
    if (copyMix) return copyCharacter(character, true, Number(copyMix.dataset.copyVariantMix));
    if (event.target.closest("[data-viewer-save]")) toggleSaved(character.id);
  });

  new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && state.rendered < state.filtered.length) {
        renderMore();
      }
    },
    { rootMargin: "1200px 0px" }
  ).observe(el.sentinel);

  /* микс мог поменяться в соседней вкладке со стилями */
  window.addEventListener("storage", (event) => {
    if (event.key === TRAY_KEY || event.key === MIX_KEY) syncMixButtons();
    if (event.key === SAVED_KEY) {
      state.saved = readSaved();
      syncControls();
    }
  });
}

/* ---------- запуск ---------- */

async function start() {
  applyLocale();
  bind();
  await load();
  buildControls();
  applyFilters();
}

start();
