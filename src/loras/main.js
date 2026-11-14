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
const GALLERY_URL = "./data/loras-gallery"; // доп. превью: <id % shards>.json, грузятся при открытии окна
const LANG_KEY = "style-archive:lang";
const THEME_KEY = "style-archive:theme";
const TRAY_KEY = "style-archive:tray";
const MIX_KEY = "style-archive:mix-v006";
const BATCH = 36;
const CARD_TAGS = 6; // тегов на карточке; остальные — в окне просмотра
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
    triggerSets: "Наборы триггеров автора: другие образы персонажа выключены, дополнения включены",
    toggleSet: "Включить или выключить весь набор",
    noTriggers: "Триггеров нет: автор их не указал, LoRA работает и так.",
    describedNote: "Из описания автора на CivitAI (поле триггеров пустое или неполное). Подобрано автоматически: включи нужное, например одного персонажа из пака.",
    describedCount: (n) => `теги в описании: ${n}`,
    weight: "вес",
    copy: "КОПИРОВАТЬ",
    copyWithMix: "+ МИКС",
    copyWithMixTitle: "Скопировать вместе со стилями из микса",
    copied: "СКОПИРОВАНО",
    copiedWithMix: "СКОПИРОВАНО ВМЕСТЕ С МИКСОМ",
    copyFailed: "НЕ УДАЛОСЬ СКОПИРОВАТЬ",
    open: "на CivitAI ↗",
    menuGo: "Перейти на CivitAI",
    menuCopyLink: "Скопировать ссылку",
    menuCopyId: "Скопировать ID",
    linkCopied: "ССЫЛКА СКОПИРОВАНА",
    idCopied: "ID СКОПИРОВАН",
    more: "ещё",
    sets: (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "набор" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "набора" : "наборов"}`,
    inLine: (n) => `в строке тегов: ${n}`,
    allTriggers: "все триггеры",
    previews: "Превью: открой карточку, чтобы посмотреть все",
    close: "ЗАКРЫТЬ",
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
    triggerSets: "Author's trigger sets: other outfits are off, add-ons are on",
    toggleSet: "Toggle the whole set",
    noTriggers: "No triggers: the author listed none, the LoRA works as is.",
    describedNote: "From the author's description on CivitAI (the trigger field is empty or incomplete). Picked automatically: turn on what you need, e.g. one character from a pack.",
    describedCount: (n) => `tags in description: ${n}`,
    weight: "weight",
    copy: "COPY",
    copyWithMix: "+ MIX",
    copyWithMixTitle: "Copy together with the styles from your mix",
    copied: "COPIED",
    copiedWithMix: "COPIED WITH THE MIX",
    copyFailed: "COULD NOT COPY",
    open: "on CivitAI ↗",
    menuGo: "Open on CivitAI",
    menuCopyLink: "Copy link",
    menuCopyId: "Copy ID",
    linkCopied: "LINK COPIED",
    idCopied: "ID COPIED",
    more: "more",
    sets: (n) => `${n} sets`,
    inLine: (n) => `tags in the line: ${n}`,
    allTriggers: "all triggers",
    previews: "Previews: open the card to see them all",
    close: "CLOSE",
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
  triggersOn: new Map(), // id -> Set("набор:тег") включённых; нет записи — по умолчанию
  loaded: false,
  updatedAt: "",
  shards: 100,
  galleryCache: new Map(), // номер шарда -> Promise<объект id -> картинки>
  viewerImage: 0,
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
  viewer: $("#lrViewer"),
  menu: $("#lrMenu"),
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

/* Формат 2 (tools/import_loras.py): LoRA — массив в порядке data.fields, одна картинка
   ["uuid/123.jpeg", w, h] без общего префикса, категория — индекс в data.categories.
   Старый формат (объекты) проходит без изменений. */
function imageUnpacker(data) {
  const prefix = data.image_prefix || "";
  const width = data.image_width || 450;
  return (image) => {
    if (!Array.isArray(image)) return null;
    let [url, w, h] = image;
    if (!/^https?:/.test(url)) {
      const cut = url.lastIndexOf("/");
      url = `${prefix}${url.slice(0, cut)}/width=${width}/${url.slice(cut + 1)}`;
    }
    return { url, width: w, height: h };
  };
}

function unpackRow(data) {
  const fields = data.fields || [];
  const categories = data.categories || [];
  const unpackImage = imageUnpacker(data);
  return (row) => {
    if (!Array.isArray(row)) return row;
    const lora = {};
    fields.forEach((field, index) => (lora[field] = row[index]));
    if (typeof lora.category === "number") lora.category = categories[lora.category] || "other";
    const image = lora.image;
    delete lora.image;
    lora.images = [];
    const unpacked = unpackImage(image);
    if (unpacked) lora.images.push(unpacked);
    lora.more = Number(lora.more) || 0;
    lora.url = `https://civitai.com/models/${lora.id}?modelVersionId=${lora.version_id}`;
    return lora;
  };
}

async function load() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    state.all = (data.loras || []).map(unpackRow(data)).map((lora, order) => ({
      ...lora,
      order,
      /* авторы часто пишут несколько триггеров одной строкой через запятую — делим на отдельные теги */
      triggers: triggerGroups(lora.triggers),
      described: (lora.described || []).map((tag) => String(tag).trim()).filter(Boolean),
      images: lora.images || [],
      hay: norm(
        [lora.name, lora.creator, ...(lora.tags || []), ...triggerGroups(lora.triggers).flat(), ...(lora.described || [])].join(" | ")
      ),
      nameNorm: norm(lora.name),
    }));
    state.byId = new Map(state.all.map((lora) => [String(lora.id), lora]));
    state.updatedAt = data.updated_at || "";
    state.shards = data.gallery_shards || 100;
    state.unpackImage = imageUnpacker(data);
    state.loaded = true;
  } catch {
    state.loaded = false;
  }
}

/* ---------- триггеры ---------- */

/* Наборы триггеров, как их ввёл автор на CivitAI: это могут быть разные образы персонажа
   (тогда они повторяют имя из первого набора) или дополнения к первому — см. triggersOn.
   Старый формат (список строк) — каждая строка набор, теги через запятую. */
function triggerGroups(raw) {
  return (raw || [])
    .map((group) =>
      (Array.isArray(group) ? group : String(group).split(","))
        .map((tag) => String(tag).trim())
        .filter((tag) => tag && !/^<\s*lora\s*:/i.test(tag))
    )
    .filter((group) => group.length);
}

const keysOf = (lora, groupIndex) => lora.triggers[groupIndex].map((_, index) => `${groupIndex}:${index}`);

function triggersOn(lora) {
  const saved = state.triggersOn.get(String(lora.id));
  if (saved) return saved;
  /* Набор, повторяющий теги первого (обычно имя персонажа), — самостоятельный другой образ:
     выключен. Набор без пересечений — дополнение (костюм, токен стиля): включён. */
  const first = new Set((lora.triggers[0] || []).map((tag) => tag.toLowerCase()));
  const keys = [];
  lora.triggers.forEach((group, g) => {
    if (g === 0 || !group.some((tag) => first.has(tag.toLowerCase()))) keys.push(...keysOf(lora, g));
  });
  return new Set(keys);
}

/* ---------- строка для бота ---------- */

const weightOf = (lora) => state.weights.get(String(lora.id)) ?? WEIGHT_DEFAULT;

function activeTriggers(lora) {
  const on = triggersOn(lora);
  const out = [];
  lora.triggers.forEach((group, g) =>
    group.forEach((tag, i) => {
      if (on.has(`${g}:${i}`) && !out.some((x) => x.toLowerCase() === tag.toLowerCase())) out.push(tag);
    })
  );
  lora.described.forEach((tag, i) => {
    if (on.has(`d:${i}`) && !out.some((x) => x.toLowerCase() === tag.toLowerCase())) out.push(tag);
  });
  return out;
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

function tagButton(lora, on, g, i) {
  const tag = lora.triggers[g][i];
  return `<button type="button" data-trigger="${g}:${i}" class="${on.has(`${g}:${i}`) ? "on" : ""}" title="${esc(tag)}">${esc(tag)}</button>`;
}

/* Все наборы с переключателями — в окне просмотра. */
function describedHtml(lora) {
  if (!lora.described.length) return "";
  const on = triggersOn(lora);
  return `<div class="lr-described-v010">
      <p class="lr-note-v010">${esc(t("describedNote"))}</p>
      <div class="lr-triggers-v010">${lora.described
        .map(
          (tag, i) =>
            `<button type="button" data-trigger="d:${i}" class="${on.has(`d:${i}`) ? "on" : ""}" title="${esc(tag)}">${esc(tag)}</button>`
        )
        .join("")}</div>
    </div>`;
}

function triggersFullHtml(lora) {
  if (!lora.triggers.length)
    return lora.described.length ? describedHtml(lora) : `<p class="lr-note-v010">${esc(t("noTriggers"))}</p>`;
  const on = triggersOn(lora);
  const many = lora.triggers.length > 1;
  return `<div class="lr-triggers-v010" aria-label="${esc(t(many ? "triggerSets" : "triggers"))}">${lora.triggers
    .map((group, g) => {
      const tags = group.map((_, i) => tagButton(lora, on, g, i)).join("");
      if (!many) return tags;
      const keys = keysOf(lora, g);
      const all = keys.every((key) => on.has(key));
      return `<div class="lr-tgroup-v010${keys.some((key) => on.has(key)) ? " on" : ""}"><button type="button" class="lr-tset-v010${all ? " on" : ""}" data-trigger-set="${g}" title="${esc(t("toggleSet"))}">${g + 1}</button>${tags}</div>`;
    })
    .join("")}</div>${describedHtml(lora)}`;
}

/* На карточке — только первые теги первого набора, остальное за «+N»: карточки одной высоты. */
function triggersCardHtml(lora) {
  if (!lora.triggers.length) {
    if (!lora.described.length) return `<p class="lr-note-v010">${esc(t("noTriggers"))}</p>`;
    return `<div class="lr-triggers-v010 compact"><button type="button" class="lr-more-v010" data-open>${esc(t("describedCount")(lora.described.length))}</button></div>`;
  }
  const on = triggersOn(lora);
  const shown = lora.triggers[0].slice(0, CARD_TAGS);
  const total = lora.triggers.reduce((sum, group) => sum + group.length, 0);
  const hidden = total - shown.length;
  const sets = lora.triggers.length > 1 ? ` · ${t("sets")(lora.triggers.length)}` : "";
  return `<div class="lr-triggers-v010 compact">${shown.map((_, i) => tagButton(lora, on, 0, i)).join("")}${
    hidden > 0 ? `<button type="button" class="lr-more-v010" data-open>+${hidden}${esc(sets)}</button>` : ""
  }</div>`;
}

function controlsHtml(lora, { full = false } = {}) {
  const weight = weightOf(lora);
  const active = activeTriggers(lora).length;
  const visible = full ? active : lora.triggers[0]?.slice(0, CARD_TAGS).filter((_, i) => triggersOn(lora).has(`0:${i}`)).length || 0;
  return `
        <code class="lr-line-v010" title="${esc(loraLine(lora))}">${esc(loraLine(lora))}</code>
        ${
          !full && active > visible
            ? `<p class="lr-inline-v010">${esc(t("inLine")(active))} · <button type="button" data-open>${esc(t("allTriggers"))}</button></p>`
            : ""
        }
        <div class="lr-weight-v010">
          <span>${esc(t("weight"))}</span>
          <button type="button" data-weight="-1" ${weight <= WEIGHT_MIN ? "disabled" : ""} aria-label="−">−</button>
          <output>${weight.toFixed(1)}</output>
          <button type="button" data-weight="1" ${weight >= WEIGHT_MAX ? "disabled" : ""} aria-label="+">+</button>
        </div>
        <div class="ch-actions-v008">
          <button class="ch-btn-v008 primary" type="button" data-copy>${esc(t("copy"))}</button>
          <button class="ch-btn-v008 ch-mix-btn-v008" type="button" data-copy-mix title="${esc(t("copyWithMixTitle"))}">${esc(t("copyWithMix"))}</button>
          <button class="ch-source-link-v008 lr-open-v010" type="button" data-civitai aria-haspopup="menu">${esc(t("open"))}</button>
        </div>`;
}

function cardHtml(lora) {
  const image = lora.images[0];
  const ratio = image?.width && image?.height ? `${image.width}/${image.height}` : "2/3";
  return `
    <article class="ch-card-v008 lr-card-v010" data-id="${esc(lora.id)}">
      <button type="button" class="ch-media-v008 lr-media-v010" data-open style="aspect-ratio:${ratio}" aria-label="${esc(lora.name)}">
        ${image ? `<img src="${esc(image.url)}" alt="" loading="lazy" decoding="async">` : ""}
        <span class="lr-cat-v010">${esc(t(lora.category))}</span>
        ${lora.more ? `<span class="lr-count-v010" title="${esc(t("previews"))}">▣ ${lora.more + 1}</span>` : ""}
      </button>
      <div class="ch-body-v008">
        <h3 class="ch-name-v008 lr-name-v010" title="${esc(lora.name)}"><button type="button" data-open>${esc(lora.name)}</button></h3>
        <p class="lr-meta-v010">${esc(t("by"))} ${esc(lora.creator)} · ${fmt(lora.downloads)} ${esc(t("downloads"))}</p>
        ${triggersCardHtml(lora)}
        ${controlsHtml(lora)}
      </div>
    </article>`;
}

/* ---------- галерея превью ---------- */

function loadGallery(lora) {
  if (lora.gallery) return Promise.resolve(lora.gallery);
  if (!lora.more) return Promise.resolve((lora.gallery = lora.images));
  const shard = Number(lora.id) % state.shards;
  if (!state.galleryCache.has(shard)) {
    state.galleryCache.set(
      shard,
      fetch(`${GALLERY_URL}/${shard}.json`)
        .then((response) => (response.ok ? response.json() : {}))
        .catch(() => ({}))
    );
  }
  return state.galleryCache.get(shard).then((data) => {
    const extra = (data[String(lora.id)] || []).map(state.unpackImage).filter(Boolean);
    lora.gallery = [...lora.images, ...extra];
    return lora.gallery;
  });
}

function mediaHtml(lora) {
  const images = lora.gallery || lora.images;
  const count = Math.max(images.length, lora.images.length + (lora.gallery ? 0 : lora.more));
  const index = Math.min(state.viewerImage, Math.max(0, images.length - 1));
  const image = images[index];
  if (!image) return `<div class="ch-viewer-media-v008 empty"></div>`;
  const nav =
    count > 1
      ? `<button type="button" class="lr-nav-v010 prev" data-gallery="-1" aria-label="←" ${index === 0 ? "disabled" : ""}>‹</button>
         <button type="button" class="lr-nav-v010 next" data-gallery="1" aria-label="→" ${index >= images.length - 1 ? "disabled" : ""}>›</button>
         <span class="lr-counter-v010">${index + 1} / ${count}</span>`
      : "";
  const thumbs =
    images.length > 1
      ? `<div class="lr-thumbs-v010">${images
          .map(
            (item, i) =>
              `<button type="button" data-gallery-to="${i}" class="${i === index ? "on" : ""}" aria-label="${i + 1}"><img src="${esc(item.url)}" alt="" loading="lazy" decoding="async"></button>`
          )
          .join("")}</div>`
      : "";
  return `<div class="ch-viewer-media-v008 lr-gallery-v010">
      <div class="lr-stage-v010"><img src="${esc(image.url)}" alt="${esc(lora.name)}">${nav}</div>
      ${thumbs}
    </div>`;
}

function renderMedia(lora) {
  const media = el.viewer.querySelector(".lr-gallery-v010, .ch-viewer-media-v008");
  if (media) media.outerHTML = mediaHtml(lora);
}

function stepGallery(lora, delta, absolute = false) {
  const images = lora.gallery || lora.images;
  const next = absolute ? delta : state.viewerImage + delta;
  if (next < 0 || next >= images.length || next === state.viewerImage) return;
  state.viewerImage = next;
  renderMedia(lora);
}

function viewerHtml(lora) {
  return `
    ${mediaHtml(lora)}
    <div class="ch-viewer-info-v008 lr-viewer-info-v010" data-id="${esc(lora.id)}">
      <header>
        <div>
          <span class="eyebrow">${esc(t(lora.category))} · ${esc(t("by"))} ${esc(lora.creator)} · ${fmt(lora.downloads)} ${esc(t("downloads"))}</span>
          <h2>${esc(lora.name)}</h2>
        </div>
        <button class="text-button" type="button" data-close>${esc(t("close"))}</button>
      </header>
      ${triggersFullHtml(lora)}
      ${controlsHtml(lora, { full: true })}
    </div>`;
}

function openViewer(id) {
  const lora = state.byId.get(String(id));
  if (!lora) return;
  const reopen = el.viewer.open && el.viewer.dataset.id === String(lora.id);
  if (!reopen) state.viewerImage = 0;
  el.viewer.dataset.id = String(lora.id);
  const info = el.viewer.querySelector(".lr-viewer-info-v010");
  const scroll = [info?.scrollTop || 0, el.viewer.querySelector(".ch-viewer-shell-v008").scrollTop];
  el.viewer.querySelector(".ch-viewer-shell-v008").innerHTML = viewerHtml(lora);
  if (!el.viewer.open) el.viewer.showModal();
  else if (reopen) {
    el.viewer.querySelector(".lr-viewer-info-v010").scrollTop = scroll[0];
    el.viewer.querySelector(".ch-viewer-shell-v008").scrollTop = scroll[1];
  }
  if (!lora.gallery && lora.more) {
    loadGallery(lora).then(() => {
      if (el.viewer.open && el.viewer.dataset.id === String(lora.id)) renderMedia(lora);
    });
  }
}

/* ---------- меню «на CivitAI»: перейти / скопировать ссылку / скопировать ID ---------- */

function closeMenu() {
  if (el.menu.hidden) return;
  el.menu.hidden = true;
  el.menu.dataset.id = "";
}

function openMenu(button, lora) {
  if (!el.menu.hidden && el.menu.dataset.id === String(lora.id) && el.menu.anchor === button) return closeMenu();
  /* в открытом модальном окне меню должно жить внутри него, иначе оно под окном и не кликается */
  const host = button.closest("dialog") || document.body;
  if (el.menu.parentElement !== host) host.append(el.menu);
  el.menu.dataset.id = String(lora.id);
  el.menu.anchor = button;
  el.menu.scrollAt = window.scrollY;
  el.menu.innerHTML = `
    <a role="menuitem" href="${esc(lora.url)}" target="_blank" rel="noopener" data-menu="go">${esc(t("menuGo"))} ↗</a>
    <button role="menuitem" type="button" data-menu="link">${esc(t("menuCopyLink"))}</button>
    <button role="menuitem" type="button" data-menu="id">${esc(t("menuCopyId"))} <span>${esc(lora.id)}</span></button>`;
  el.menu.hidden = false;
  const sheet = window.matchMedia("(max-width: 640px)").matches;
  el.menu.classList.toggle("sheet", sheet);
  if (sheet) {
    el.menu.style.left = el.menu.style.top = "";
  } else {
    const rect = button.getBoundingClientRect();
    const width = el.menu.offsetWidth;
    const height = el.menu.offsetHeight;
    const left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width));
    const below = rect.bottom + 6 + height <= window.innerHeight;
    el.menu.style.left = `${left}px`;
    el.menu.style.top = `${below ? rect.bottom + 6 : rect.top - height - 6}px`;
  }
  el.menu.querySelector("[data-menu]")?.focus({ preventScroll: true });
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

  const onLoraClick = (event) => {
    const host = event.target.closest("[data-id]");
    if (!host) return;
    const lora = state.byId.get(host.dataset.id);
    if (!lora) return;
    const id = String(lora.id);
    const refresh = () => {
      rerenderCard(id);
      if (el.viewer.open && el.viewer.dataset.id === id) openViewer(id);
    };

    const civitai = event.target.closest("[data-civitai]");
    if (civitai) return openMenu(civitai, lora);

    if (event.target.closest("[data-open]")) return openViewer(id);

    const set = event.target.closest("[data-trigger-set]");
    if (set) {
      const on = new Set(triggersOn(lora));
      const keys = keysOf(lora, Number(set.dataset.triggerSet));
      const all = keys.every((key) => on.has(key));
      keys.forEach((key) => (all ? on.delete(key) : on.add(key)));
      state.triggersOn.set(id, on);
      return refresh();
    }

    const trigger = event.target.closest("[data-trigger]");
    if (trigger) {
      const on = new Set(triggersOn(lora));
      const key = trigger.dataset.trigger;
      if (on.has(key)) on.delete(key);
      else on.add(key);
      state.triggersOn.set(id, on);
      return refresh();
    }

    const weight = event.target.closest("[data-weight]");
    if (weight) {
      const next = Math.round((weightOf(lora) + Number(weight.dataset.weight) * 0.1) * 10) / 10;
      state.weights.set(id, Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, next)));
      return refresh();
    }

    if (event.target.closest("[data-copy]")) return copyText(loraLine(lora), t("copied"));
    if (event.target.closest("[data-copy-mix]")) {
      const mix = mixLine();
      return copyText(
        mix ? `${loraLine(lora)}, ${mix}` : loraLine(lora),
        mix ? t("copiedWithMix") : t("copied")
      );
    }
  };

  el.grid.addEventListener("click", onLoraClick);

  el.viewer.addEventListener("click", (event) => {
    if (el.menu.contains(event.target)) return;
    const viewerLora = state.byId.get(el.viewer.dataset.id);
    const step = event.target.closest("[data-gallery]");
    if (step && viewerLora) return stepGallery(viewerLora, Number(step.dataset.gallery));
    const jump = event.target.closest("[data-gallery-to]");
    if (jump && viewerLora) return stepGallery(viewerLora, Number(jump.dataset.galleryTo), true);
    if (event.target === el.viewer || event.target.closest("[data-close]")) {
      closeMenu();
      return el.viewer.close();
    }
    onLoraClick(event);
  });
  el.viewer.addEventListener("close", closeMenu);

  /* галерея: стрелки клавиатуры и свайп по картинке */
  el.viewer.addEventListener("keydown", (event) => {
    const lora = state.byId.get(el.viewer.dataset.id);
    if (!lora || !el.menu.hidden || event.target.closest("input, textarea")) return;
    if (event.key === "ArrowLeft") stepGallery(lora, -1);
    if (event.key === "ArrowRight") stepGallery(lora, 1);
  });
  let touchX = null;
  el.viewer.addEventListener(
    "touchstart",
    (event) => {
      touchX = event.target.closest(".lr-stage-v010") ? event.touches[0].clientX : null;
    },
    { passive: true }
  );
  el.viewer.addEventListener("touchend", (event) => {
    const lora = state.byId.get(el.viewer.dataset.id);
    if (touchX === null || !lora) return;
    const dx = event.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) stepGallery(lora, dx < 0 ? 1 : -1);
  });

  el.menu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-menu]");
    const lora = state.byId.get(el.menu.dataset.id);
    if (!item || !lora) return;
    if (item.dataset.menu === "link") copyText(lora.url, t("linkCopied"));
    if (item.dataset.menu === "id") copyText(String(lora.id), t("idCopied"));
    closeMenu();
  });

  /* клик мимо меню и Esc закрывают его; Esc в окне сначала закрывает меню, а не окно */
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!el.menu.hidden && !el.menu.contains(event.target) && !event.target.closest("[data-civitai]")) closeMenu();
    },
    true
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && !el.menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      }
    },
    true
  );
  el.viewer.addEventListener("cancel", (event) => {
    if (!el.menu.hidden) event.preventDefault();
  });
  window.addEventListener("resize", closeMenu);
  /* меню привязано к кнопке: при заметной прокрутке закрывается (мелкий сдвиг от клика не в счёт) */
  window.addEventListener(
    "scroll",
    () => {
      if (!el.menu.hidden && !el.menu.classList.contains("sheet") && Math.abs(window.scrollY - el.menu.scrollAt) > 40) closeMenu();
    },
    { passive: true }
  );

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
  /* поле поиска заполняется из ?q= до фильтрации: applyFilters читает запрос из поля */
  el.search.value = state.q;
  applyFilters();
}

start();
