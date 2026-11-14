/*
 * Каталог LoRA под Anima: страница loras.html.
 * Данные: data/loras.json (tools/import_loras.py, открытый API CivitAI, только baseModel = Anima).
 * Превью показываются с CDN CivitAI (width=450) и только безопасные (PG); у каждой карточки — автор и ссылка.
 * Готовая строка для бота Stable Waifu: <lora:ID:вес>, плюс выбранные триггеры.
 */
import "@fontsource-variable/geologica/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "../css/style.css";
import "../css/mobile.css";
import "../css/usability-v005.css";
import "../css/winter-v005.css";
import "../css/scroll-lock-v009.css";
import "../css/section-switch-v008.css";
import "../css/characters-v008.css";
import "../css/loras-v010.css";
import "../legacy/scroll-lock-v009.js";

const DATA_URL = "./data/loras.json";
const LANG_KEY = "style-archive:lang";
const THEME_KEY = "style-archive:theme";
const TRAY_KEY = "style-archive:tray";
const MIX_KEY = "style-archive:mix-v006";
const BATCH = 36;
const WEIGHT_MIN = 0.3;
const WEIGHT_MAX = 1.2;
const WEIGHT_DEFAULT = 0.8;

const DICT = {
  ru: {
    styles: "СТИЛИ",
    characters: "ПЕРСОНАЖИ",
    eyebrow: "КАТАЛОГ LORA",
    statLoras: "LORA",
    statCharacters: "ПЕРСОНАЖЕЙ",
    search: "ПОИСК",
    searchPlaceholder: "название, автор, тег или триггер",
    lead: "LoRA подключаются в боте Stable Waifu прямо из промпта: скопируй строку и вставь в промпт. Работают только с моделью AM Preview. Функция в боте пока в бета-версии; вес обычно 0.6–1.0, несколько LoRA сразу делают картинку нестабильнее.",
    source:
      "Модели и превью принадлежат их авторам на CivitAI, у каждой карточки есть ссылка. Показываются только LoRA не откровеннее уровня R и только безопасные превью.",
    all: "ВСЕ",
    character: "ПЕРСОНАЖИ",
    style: "СТИЛИ",
    concept: "КОНЦЕПТЫ",
    tool: "ТЕХНИЧЕСКИЕ",
    other: "ДРУГОЕ",
    sortPopular: "ПОПУЛЯРНЫЕ",
    sortNew: "НОВЫЕ",
    sortLiked: "ЛАЙКИ",
    by: "автор",
    downloads: "скачиваний",
    triggers: "Триггеры (нажми, чтобы включить или выключить):",
    noTriggers: "Триггеров нет: автор их не указал, LoRA работает и так.",
    weight: "вес",
    copy: "КОПИРОВАТЬ",
    copyWithMix: "+ МИКС",
    copyWithMixTitle: "Скопировать вместе со стилями из микса",
    copied: "СКОПИРОВАНО",
    copiedWithMix: "СКОПИРОВАНО ВМЕСТЕ С МИКСОМ",
    copyFailed: "НЕ УДАЛОСЬ СКОПИРОВАТЬ",
    open: "на CivitAI ↗",
    empty: "Ничего не нашли. Попробуй имя латиницей, название тайтла или другую категорию.",
    emptyData: "Каталог ещё не загружен.",
    reset: "СБРОСИТЬ",
    updated: "LORA ОБНОВЛЕНЫ",
  },
  en: {
    styles: "STYLES",
    characters: "CHARACTERS",
    eyebrow: "LORA CATALOG",
    statLoras: "LORA",
    statCharacters: "CHARACTERS",
    search: "SEARCH",
    searchPlaceholder: "name, author, tag or trigger",
    lead: "In the Stable Waifu bot a LoRA is added right in the prompt: copy the line and paste it. Works only with the AM Preview model. The feature is in beta; weight is usually 0.6–1.0, and several LoRAs at once make the result less stable.",
    source:
      "Models and previews belong to their authors on CivitAI; every card links there. Only LoRAs rated up to R and only safe previews are shown.",
    all: "ALL",
    character: "CHARACTERS",
    style: "STYLES",
    concept: "CONCEPTS",
    tool: "TECHNICAL",
    other: "OTHER",
    sortPopular: "POPULAR",
    sortNew: "NEW",
    sortLiked: "LIKED",
    by: "by",
    downloads: "downloads",
    triggers: "Triggers (tap to toggle):",
    noTriggers: "No triggers: the author listed none, the LoRA works as is.",
    weight: "weight",
    copy: "COPY",
    copyWithMix: "+ MIX",
    copyWithMixTitle: "Copy together with the styles from your mix",
    copied: "COPIED",
    copiedWithMix: "COPIED WITH THE MIX",
    copyFailed: "COULD NOT COPY",
    open: "on CivitAI ↗",
    empty: "Nothing found. Try a romanized name, a series title or another category.",
    emptyData: "The catalog is not loaded yet.",
    reset: "RESET",
    updated: "LORA UPDATED",
  },
};

const CATEGORIES = ["all", "character", "style", "concept", "tool", "other"];
const SORTS = { popular: "sortPopular", new: "sortNew", liked: "sortLiked" };

const lang = () => (document.documentElement.lang === "en" ? "en" : "ru");
const t = (key) => DICT[lang()][key] ?? DICT.ru[key] ?? key;
const fmt = (number) => new Intl.NumberFormat(lang() === "en" ? "en-US" : "ru-RU").format(number);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
const norm = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_\\()[\]|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const params = new URL(window.location.href).searchParams;
const state = {
  all: [],
  byId: new Map(),
  filtered: [],
  rendered: 0,
  q: params.get("q") || "",
  category: CATEGORIES.includes(params.get("cat")) ? params.get("cat") : "all",
  sort: SORTS[params.get("sort")] ? params.get("sort") : "popular",
  weights: new Map(),
  triggersOff: new Map(), // id -> Set(индексов выключенных триггеров)
  loaded: false,
  updatedAt: "",
};

const $ = (selector) => document.querySelector(selector);
const el = {
  grid: $("#lrGrid"),
  sentinel: $("#lrSentinel"),
  empty: $("#lrEmpty"),
  search: $("#lrSearch"),
  count: $("#lrCount"),
  categories: $("#lrCategories"),
  sort: $("#lrSort"),
  lead: $("#lrLead"),
  source: $("#lrSource"),
  statCount: $("#lrStatCount"),
  statCharacters: $("#lrStatCharacters"),
  updated: $("#lrUpdated"),
  langButton: $("#lrLangButton"),
  themeButton: $("#lrThemeButton"),
  themeColor: $("#themeColor"),
  toast: $("#toast"),
};

/* ---------- микс со страницы стилей (тот же расчёт, что у панели микса) ---------- */

function mixLine() {
  try {
    const tray = JSON.parse(localStorage.getItem(TRAY_KEY) || "[]").filter(
      (name) => typeof name === "string" && name.trim()
    );
    if (!tray.length) return "";
    const store = JSON.parse(localStorage.getItem(MIX_KEY) || "{}") || {};
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
    state.all = (data.loras || []).map((lora, order) => ({
      ...lora,
      order,
      /* авторы часто пишут несколько триггеров одной строкой через запятую — делим на отдельные теги */
      triggers: [
        ...new Set(
          (lora.triggers || [])
            .flatMap((trigger) => String(trigger).split(","))
            .map((trigger) => trigger.trim())
            .filter(Boolean)
        ),
      ].slice(0, 24),
      images: lora.images || [],
      hay: norm(
        [lora.name, lora.creator, ...(lora.tags || []), ...(lora.triggers || [])].join(" | ")
      ),
      nameNorm: norm(lora.name),
    }));
    state.byId = new Map(state.all.map((lora) => [String(lora.id), lora]));
    state.updatedAt = data.updated_at || "";
    state.loaded = true;
  } catch {
    state.loaded = false;
  }
}

/* ---------- строка для бота ---------- */

const weightOf = (lora) => state.weights.get(String(lora.id)) ?? WEIGHT_DEFAULT;

function activeTriggers(lora) {
  const off = state.triggersOff.get(String(lora.id)) || new Set();
  return lora.triggers.filter((_, index) => !off.has(index));
}

function loraLine(lora) {
  const tag = `<lora:${lora.id}:${weightOf(lora).toFixed(1)}>`;
  return [tag, ...activeTriggers(lora)].join(", ");
}

/* ---------- фильтры ---------- */

function applyFilters() {
  /* поле могло измениться, а отложенный поиск ещё не сработал (очистили и сразу нажали категорию) */
  state.q = el.search.value;
  const tokens = norm(state.q).split(" ").filter(Boolean);
  let list = state.all.filter((lora) => {
    if (state.category !== "all" && lora.category !== state.category) return false;
    return tokens.every((token) => lora.hay.includes(token));
  });

  const by = {
    popular: (a, b) => b.downloads - a.downloads,
    new: (a, b) => String(b.published).localeCompare(String(a.published)),
    liked: (a, b) => b.likes - a.likes,
  }[state.sort];
  /* во «Всех» технические LoRA (турбо, детализаторы) уходят в конец: их скачивают больше всех, но ищут редко */
  const toolLast = (a, b) =>
    state.category === "all" ? Number(a.category === "tool") - Number(b.category === "tool") : 0;
  list = [...list].sort((a, b) => toolLast(a, b) || by(a, b) || a.order - b.order);

  const query = norm(state.q);
  if (query) {
    list.sort((a, b) => Number(!a.nameNorm.includes(query)) - Number(!b.nameNorm.includes(query)));
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
  set("cat", state.category === "all" ? "" : state.category);
  set("sort", state.sort === "popular" ? "" : state.sort);
  history.replaceState(null, "", url);
}

/* ---------- карточки ---------- */

function cardHtml(lora) {
  const image = lora.images[0];
  const ratio = image?.width && image?.height ? `${image.width}/${image.height}` : "2/3";
  const off = state.triggersOff.get(String(lora.id)) || new Set();
  const weight = weightOf(lora);

  return `
    <article class="ch-card-v008 lr-card-v010" data-id="${esc(lora.id)}">
      <a class="ch-media-v008 lr-media-v010" href="${esc(lora.url)}" target="_blank" rel="noopener" style="aspect-ratio:${ratio}" aria-label="${esc(lora.name)} — CivitAI">
        ${image ? `<img src="${esc(image.url)}" alt="" loading="lazy" decoding="async">` : ""}
        <span class="lr-cat-v010">${esc(t(lora.category))}</span>
      </a>
      <div class="ch-body-v008">
        <h3 class="ch-name-v008 lr-name-v010" title="${esc(lora.name)}">${esc(lora.name)}</h3>
        <p class="lr-meta-v010">${esc(t("by"))} ${esc(lora.creator)} · ${fmt(lora.downloads)} ${esc(t("downloads"))}</p>
        ${
          lora.triggers.length
            ? `<div class="lr-triggers-v010" aria-label="${esc(t("triggers"))}">${lora.triggers
                .map(
                  (trigger, index) =>
                    `<button type="button" data-trigger="${index}" class="${off.has(index) ? "" : "on"}" title="${esc(trigger)}">${esc(trigger)}</button>`
                )
                .join("")}</div>`
            : `<p class="lr-note-v010">${esc(t("noTriggers"))}</p>`
        }
        <code class="lr-line-v010">${esc(loraLine(lora))}</code>
        <div class="lr-weight-v010">
          <span>${esc(t("weight"))}</span>
          <button type="button" data-weight="-1" ${weight <= WEIGHT_MIN ? "disabled" : ""} aria-label="−">−</button>
          <output>${weight.toFixed(1)}</output>
          <button type="button" data-weight="1" ${weight >= WEIGHT_MAX ? "disabled" : ""} aria-label="+">+</button>
        </div>
        <div class="ch-actions-v008">
          <button class="ch-btn-v008 primary" type="button" data-copy>${esc(t("copy"))}</button>
          <button class="ch-btn-v008 ch-mix-btn-v008" type="button" data-copy-mix title="${esc(t("copyWithMixTitle"))}">${esc(t("copyWithMix"))}</button>
          <a class="ch-source-link-v008 lr-open-v010" href="${esc(lora.url)}" target="_blank" rel="noopener">${esc(t("open"))}</a>
        </div>
      </div>
    </article>`;
}

function renderMore() {
  const next = state.filtered.slice(state.rendered, state.rendered + BATCH);
  if (next.length) {
    el.grid.insertAdjacentHTML("beforeend", next.map(cardHtml).join(""));
    el.grid.querySelectorAll("img:not([data-bound])").forEach((img) => {
      img.dataset.bound = "1";
      img.addEventListener("error", () => img.remove(), { once: true });
    });
    state.rendered += next.length;
  }
  document.documentElement.classList.toggle("ch-has-mix-v008", Boolean(mixLine()));
  syncStatus();
}

function rerenderCard(id) {
  const node = el.grid.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  const lora = state.byId.get(String(id));
  if (node && lora) node.outerHTML = cardHtml(lora);
}

function syncStatus() {
  el.count.textContent = `${fmt(state.filtered.length)} / ${fmt(state.all.length)}`;
  if (!state.loaded) {
    el.empty.hidden = false;
    el.empty.textContent = t("emptyData");
    return;
  }
  el.empty.hidden = state.filtered.length > 0;
  if (!el.empty.hidden) {
    el.empty.innerHTML = `${esc(t("empty"))} <button class="ch-btn-v008" type="button" data-reset>${esc(t("reset"))}</button>`;
  }
}

/* ---------- управление ---------- */

function buildControls() {
  const counts = { all: state.all.length };
  state.all.forEach((lora) => (counts[lora.category] = (counts[lora.category] || 0) + 1));
  el.categories.innerHTML = CATEGORIES.filter((cat) => counts[cat])
    .map(
      (cat) =>
        `<button class="filter-chip" type="button" data-category="${cat}">${esc(t(cat))} <span>${fmt(counts[cat])}</span></button>`
    )
    .join("");
  el.sort.innerHTML = Object.entries(SORTS)
    .map(
      ([key, label]) =>
        `<button class="filter-chip" type="button" data-sort="${key}">${esc(t(label))}</button>`
    )
    .join("");
  el.statCount.textContent = fmt(state.all.length);
  el.statCharacters.textContent = fmt(counts.character || 0);
  el.updated.textContent = state.updatedAt
    ? `${t("updated")} ${state.updatedAt.split("-").reverse().join(".")}`
    : "";
}

function syncControls() {
  if (el.search.value !== state.q) el.search.value = state.q;
  el.categories.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === state.category);
  });
  el.sort.querySelectorAll("[data-sort]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sort === state.sort);
  });
}

function applyLocale() {
  document
    .querySelectorAll("[data-ch-i18n]")
    .forEach((node) => (node.textContent = t(node.dataset.chI18n)));
  document
    .querySelectorAll("[data-lr-i18n]")
    .forEach((node) => (node.textContent = t(node.dataset.lrI18n)));
  el.search.placeholder = t("searchPlaceholder");
  el.lead.textContent = t("lead");
  el.source.textContent = t("source");
  el.langButton.textContent = lang() === "en" ? "RU" : "EN";
}

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
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) return toast(t("copyFailed"));
  }
  toast(message);
}

function bind() {
  let timer = null;
  el.search.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.q = el.search.value;
      applyFilters();
    }, 120);
  });

  el.categories.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    applyFilters();
  });

  el.sort.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sort]");
    if (!button) return;
    state.sort = button.dataset.sort;
    applyFilters();
  });

  el.grid.addEventListener("click", (event) => {
    const card = event.target.closest(".lr-card-v010");
    if (!card) return;
    const lora = state.byId.get(card.dataset.id);
    if (!lora) return;
    const id = String(lora.id);

    const trigger = event.target.closest("[data-trigger]");
    if (trigger) {
      const off = new Set(state.triggersOff.get(id) || []);
      const index = Number(trigger.dataset.trigger);
      if (off.has(index)) off.delete(index);
      else off.add(index);
      state.triggersOff.set(id, off);
      rerenderCard(id);
      return;
    }

    const weight = event.target.closest("[data-weight]");
    if (weight) {
      const next = Math.round((weightOf(lora) + Number(weight.dataset.weight) * 0.1) * 10) / 10;
      state.weights.set(id, Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, next)));
      rerenderCard(id);
      return;
    }

    if (event.target.closest("[data-copy]")) return copyText(loraLine(lora), t("copied"));
    if (event.target.closest("[data-copy-mix]")) {
      const mix = mixLine();
      return copyText(
        mix ? `${loraLine(lora)}, ${mix}` : loraLine(lora),
        mix ? t("copiedWithMix") : t("copied")
      );
    }
  });

  el.empty.addEventListener("click", (event) => {
    if (!event.target.closest("[data-reset]")) return;
    Object.assign(state, { q: "", category: "all" });
    applyFilters();
  });

  el.langButton.addEventListener("click", () => {
    const next = lang() === "en" ? "ru" : "en";
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
    applyLocale();
    buildControls();
    applyFilters();
  });

  el.themeButton.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    el.themeColor?.setAttribute("content", theme === "light" ? "#f2f6fa" : "#0a0e14");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  });

  new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && state.rendered < state.filtered.length)
        renderMore();
    },
    { rootMargin: "1200px 0px" }
  ).observe(el.sentinel);

  window.addEventListener("storage", (event) => {
    if (event.key === TRAY_KEY || event.key === MIX_KEY) {
      document.documentElement.classList.toggle("ch-has-mix-v008", Boolean(mixLine()));
    }
  });
}

async function start() {
  applyLocale();
  bind();
  await load();
  buildControls();
  applyFilters();
}

start();
