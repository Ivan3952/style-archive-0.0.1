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
import { extractLoraRef } from "./id-search.js";

const DATA_URL = "./data/loras.json";
const ADULT_URL = "./data/loras-adult.json";
const SAVED_KEY = "style-archive:lora-saved";
const GALLERY_URL = "./data/loras-gallery"; // доп. превью: <id % shards>.json, грузятся при открытии окна
const ADULT_GALLERY_URL = "./data/loras-adult-gallery";
const LANG_KEY = "style-archive:lang";
const THEME_KEY = "style-archive:theme";
const TRAY_KEY = "style-archive:tray";
const MIX_KEY = "style-archive:mix-v006";
const BATCH = 36;
const CARD_TAGS = 6; // тегов на карточке; остальные — в окне просмотра
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 1;
const WEIGHT_DEFAULT = 0.8;

const DICT = {
  ru: {
    styles: "СТИЛИ",
    characters: "ПЕРСОНАЖИ",
    eyebrow: "КАТАЛОГ LORA",
    statLoras: "LORA",
    statCharacters: "ПЕРСОНАЖЕЙ",
    search: "ПОИСК",
    searchPlaceholder: "название, автор, тег, триггер или ID",
    lead: "LoRA подключаются в боте Stable Waifu прямо из промпта: скопируй строку и вставь в промпт. Работают только с моделью AM Preview. Функция в боте пока в бета-версии; вес обычно 0.6–1.0, несколько LoRA сразу делают картинку нестабильнее.",
    source:
      "Модели и превью принадлежат их авторам на CivitAI, у каждой карточки есть ссылка. Показываются только LoRA не откровеннее уровня R и только безопасные превью.",
    all: "ВСЕ",
    standard: "ОБЩИЙ КАТАЛОГ",
    filterTriggers: "Триггеры",
    withTriggers: "Указаны автором",
    withoutTriggers: "Без триггеров автора",
    multipleTriggers: "Несколько наборов",
    descriptionTriggers: "Есть теги из описания",
    filterPanel: "Фильтры",
    backToTop: "Наверх",
    showResults: (count) => `Показать модели (${count})`,
    authorFilter: "Автор на CivitAI",
    authorPlaceholder: "Имя или часть имени",
    publishedFilter: "Дата публикации",
    anyPeriod: "За всё время",
    last30: "За 30 дней",
    last90: "За 90 дней",
    last365: "За год",
    noDate: "Дата неизвестна",
    downloadsFilter: "Скачивания",
    under100: "Меньше 100",
    framesFilter: "Кадры в галерее",
    oneFrame: "Один кадр",
    includeTags: "Все указанные теги",
    excludeTags: "Исключить теги",
    tagsPlaceholder: "Теги через запятую",
    likesFilter: "Лайки",
    orientationFilter: "Ориентация обложки",
    portrait: "Вертикальная",
    landscape: "Горизонтальная",
    square: "Квадратная",
    unknownSize: "Размер неизвестен",
    resolutionFilter: "Длинная сторона обложки",
    withGallery: "2+ ПРЕВЬЮ",
    withPreview: "С ПРЕВЬЮ",
    withoutPreview: "БЕЗ ПРЕВЬЮ",
    saved: "ИЗБРАННОЕ",
    saveLora: "Добавить в избранное",
    unsaveLora: "Убрать из избранного",
    sortName: "ПО ИМЕНИ",
    adultTitle: "Каталог 18+",
    revealAdult: "Показать превью",
    hideAdult: "Скрыть превью",
    noPreview: "Превью нет",
    adultNotice:
      "Здесь могут быть названия моделей для взрослых. Изображения скрыты под спойлером. Раздел доступен с 18 лет.",
    confirmAge: "МНЕ ЕСТЬ 18",
    cancel: "НАЗАД",
    adultLoading: "Загружаем каталог 18+…",
    adultEmpty: "В каталоге 18+ пока нет опубликованных моделей.",
    adultError: "Каталог 18+ не загрузился. Попробуй открыть его ещё раз.",
    adultSource:
      "Модели принадлежат авторам на CivitAI. Описания и превью можно посмотреть на странице модели.",
    character: "ПЕРСОНАЖИ",
    style: "СТИЛИ",
    concept: "КОНЦЕПТЫ",
    tool: "ТЕХНИЧЕСКИЕ",
    other: "ДРУГОЕ",
    sortPopular: "ПОПУЛЯРНЫЕ",
    sortNew: "НОВЫЕ",
    sortLiked: "ЛАЙКИ",
    free: "БЕСПЛАТНЫЕ",
    paid: "ПЛАТНЫЕ",
    paidBadge: "ПЛАТНАЯ",
    paidTitle: "Платный ранний доступ на CivitAI",
    paidUntil: "до",
    paidNote: "Без покупки на CivitAI модель может быть недоступна в боте.",
    by: "автор",
    downloads: "скачиваний",
    triggers: "Триггеры (нажми, чтобы включить или выключить):",
    triggerSets: "Наборы триггеров автора: другие образы персонажа выключены, дополнения включены",
    toggleSet: "Включить или выключить весь набор",
    noTriggers: "Триггеров нет: автор их не указал, LoRA работает и так.",
    describedNote:
      "Из описания автора на CivitAI (поле триггеров пустое или неполное). Подобрано автоматически: включи нужное, например одного персонажа из пака.",
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
    sets: (n) =>
      `${n} ${n % 10 === 1 && n % 100 !== 11 ? "набор" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "набора" : "наборов"}`,
    inLine: (n) => `в строке тегов: ${n}`,
    allTriggers: "все триггеры",
    previews: "Превью: открой карточку, чтобы посмотреть все",
    close: "ЗАКРЫТЬ",
    empty: "Ничего не нашли. Попробуй имя латиницей, название тайтла или другую категорию.",
    emptyId: "В этом разделе нет LoRA с ID {id}.",
    openCivitai: "ОТКРЫТЬ НА CIVITAI",
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
    searchPlaceholder: "name, author, tag, trigger or ID",
    lead: "In the Stable Waifu bot a LoRA is added right in the prompt: copy the line and paste it. Works only with the AM Preview model. The feature is in beta; weight is usually 0.6–1.0, and several LoRAs at once make the result less stable.",
    source:
      "Models and previews belong to their authors on CivitAI; every card links there. Only LoRAs rated up to R and only safe previews are shown.",
    all: "ALL",
    standard: "GENERAL CATALOG",
    filterTriggers: "Triggers",
    withTriggers: "Listed by author",
    withoutTriggers: "No author triggers",
    multipleTriggers: "Multiple sets",
    descriptionTriggers: "Tags from description",
    filterPanel: "Filters",
    backToTop: "Back to top",
    showResults: (count) => `Show models (${count})`,
    authorFilter: "CivitAI author",
    authorPlaceholder: "Name or part of name",
    publishedFilter: "Published",
    anyPeriod: "Any time",
    last30: "Last 30 days",
    last90: "Last 90 days",
    last365: "Last year",
    noDate: "Unknown date",
    downloadsFilter: "Downloads",
    under100: "Fewer than 100",
    framesFilter: "Gallery images",
    oneFrame: "One image",
    includeTags: "Require all tags",
    excludeTags: "Exclude tags",
    tagsPlaceholder: "Comma-separated tags",
    likesFilter: "Likes",
    orientationFilter: "Cover orientation",
    portrait: "Portrait",
    landscape: "Landscape",
    square: "Square",
    unknownSize: "Unknown size",
    resolutionFilter: "Long edge of cover",
    withGallery: "2+ PREVIEWS",
    withPreview: "WITH PREVIEW",
    withoutPreview: "NO PREVIEW",
    saved: "FAVORITES",
    saveLora: "Add to favorites",
    unsaveLora: "Remove from favorites",
    sortName: "BY NAME",
    adultTitle: "18+ catalog",
    revealAdult: "Show preview",
    hideAdult: "Hide preview",
    noPreview: "No preview",
    adultNotice:
      "This section may contain names of adult models. Images are hidden behind spoilers. You must be 18 or older to enter.",
    confirmAge: "I AM 18 OR OLDER",
    cancel: "BACK",
    adultLoading: "Loading the 18+ catalog…",
    adultEmpty: "No models have been published in the 18+ catalog yet.",
    adultError: "Could not load the 18+ catalog. Try opening it again.",
    adultSource:
      "Models belong to their authors on CivitAI. Descriptions and previews are available on the model page.",
    character: "CHARACTERS",
    style: "STYLES",
    concept: "CONCEPTS",
    tool: "TECHNICAL",
    other: "OTHER",
    sortPopular: "POPULAR",
    sortNew: "NEW",
    sortLiked: "LIKED",
    free: "FREE",
    paid: "PAID",
    paidBadge: "PAID",
    paidTitle: "Paid early access on CivitAI",
    paidUntil: "until",
    paidNote: "The model may be unavailable in the bot until purchased on CivitAI.",
    by: "by",
    downloads: "downloads",
    triggers: "Triggers (tap to toggle):",
    triggerSets: "Author's trigger sets: other outfits are off, add-ons are on",
    toggleSet: "Toggle the whole set",
    noTriggers: "No triggers: the author listed none, the LoRA works as is.",
    describedNote:
      "From the author's description on CivitAI (the trigger field is empty or incomplete). Picked automatically: turn on what you need, e.g. one character from a pack.",
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
    emptyId: "There is no LoRA with ID {id} in this section.",
    openCivitai: "OPEN ON CIVITAI",
    emptyData: "The catalog is not loaded yet.",
    reset: "RESET",
    updated: "LORA UPDATED",
  },
};

const CATEGORIES = ["all", "character", "style", "concept", "tool", "other"];
const SORTS = { popular: "sortPopular", new: "sortNew", liked: "sortLiked", name: "sortName" };
/* форматы файла (tools/import_loras.py, TYPES): подпись на карточке и в фильтре */
const KINDS = { lora: "LoRA", locon: "LoCon", dora: "DoRA" };
const ACCESS = ["free", "paid"];

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
const EXTRA_OPTIONS = {
  period: ["all", "30", "90", "365", "unknown"],
  downloads: ["all", "under100", "100", "1000", "10000"],
  frames: ["all", "one", "2-5", "6-10", "11"],
  likes: ["all", "10", "50", "100", "500"],
  orientation: ["all", "portrait", "landscape", "square", "unknown"],
  resolution: ["all", "768", "1024", "1536", "2048"],
};
const TEXT_FACETS = { author: 80, tags: 200, excludeTags: 200 };
const IMAGE_FACETS = ["frames", "orientation", "resolution"];
const EXTRA_DEFAULTS = Object.fromEntries([
  ...Object.keys(TEXT_FACETS).map((key) => [key, ""]),
  ...Object.keys(EXTRA_OPTIONS).map((key) => [key, "all"]),
]);
const FRAME_RANGES = { one: [1, 1], "2-5": [2, 5], "6-10": [6, 10], 11: [11, Infinity] };
const extraCount = () =>
  Object.keys(EXTRA_DEFAULTS).filter((key) => state.extra[key].trim() !== EXTRA_DEFAULTS[key])
    .length;
const state = {
  all: [],
  standard: [],
  byId: new Map(),
  filtered: [],
  rendered: 0,
  q: params.get("q") || params.get("id") || "",
  idRef: "",
  category: CATEGORIES.includes(params.get("cat")) ? params.get("cat") : "all",
  sort: Object.hasOwn(SORTS, params.get("sort")) ? params.get("sort") : "popular",
  kind: Object.hasOwn(KINDS, params.get("kind")) ? params.get("kind") : "all",
  access: ACCESS.includes(params.get("access")) ? params.get("access") : "all",
  triggerFilter: ["author", "none", "multiple", "described"].includes(params.get("triggers"))
    ? params.get("triggers")
    : "all",
  gallery: params.get("gallery") === "1",
  extra: {
    ...EXTRA_DEFAULTS,
    ...Object.fromEntries(
      Object.entries(TEXT_FACETS).map(([key, limit]) => [
        key,
        (params.get(key) || "").trim().slice(0, limit),
      ])
    ),
    ...Object.fromEntries(
      Object.entries(EXTRA_OPTIONS).map(([key, options]) => [
        key,
        options.includes(params.get(key)) ? params.get(key) : EXTRA_DEFAULTS[key],
      ])
    ),
  },
  preview: params.get("preview") === "without" ? "without" : "with",
  savedOnly: params.get("saved") === "1",
  scope: "standard",
  adult: null,
  adultLoading: false,
  adultError: false,
  ageConfirmed: false,
  revealedAdult: new Set(),
  saved: new Set(),
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
  kinds: $("#lrKinds"),
  stickyControls: $(".lr-sticky-controls-v010"),
  backToTop: $("#lrBackToTop"),
  catalogTitle: $("#lrCatalogTitle"),
  refine: $("#lrRefine"),
  advanced: $("#lrAdvanced"),
  filters: $("#lrFilters"),
  openFilters: $("#lrOpenFilters"),
  filterCount: $("#lrFilterCount"),
  showResults: $("#lrShowResults"),
  triggerFilter: $("#lrTriggerFilter"),
  scope: $(".lr-scope-v010"),
  preview: $(".lr-preview-filter-v010"),
  age: $("#lrAge"),
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
  const kinds = data.kinds || ["lora", "locon", "dora"];
  const unpackImage = imageUnpacker(data);
  return (row) => {
    if (!Array.isArray(row)) return row;
    const lora = {};
    fields.forEach((field, index) => (lora[field] = row[index]));
    if (typeof lora.category === "number") lora.category = categories[lora.category] || "other";
    /* kind и access появились 16.11.2026; в старых строках их нет — это бесплатная LoRA */
    if (typeof lora.kind === "number") lora.kind = kinds[lora.kind] || "lora";
    lora.kind = KINDS[lora.kind] ? lora.kind : "lora";
    lora.access = Number(lora.access) || 0;
    lora.until = lora.until || "";
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

function readLoras(data, adult = false) {
  return data.loras.map(unpackRow(data)).map((lora, order) => {
    const triggers = triggerGroups(lora.triggers);
    return {
      ...lora,
      order,
      adult,
      tagKeys: (lora.tags || []).map(norm),
      /* авторы часто пишут несколько триггеров одной строкой через запятую — делим на отдельные теги */
      triggers,
      described: (lora.described || []).map((tag) => String(tag).trim()).filter(Boolean),
      images: adult ? (lora.images || []).slice(0, 1) : lora.images || [],
      more: Number(lora.more) || 0,
      hay: norm(
        [
          lora.name,
          lora.creator,
          ...(lora.tags || []),
          ...triggers.flat(),
          ...(lora.described || []),
        ].join(" | ")
      ),
      nameNorm: norm(lora.name),
    };
  });
}

async function load() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    state.standard = readLoras(data);
    state.updatedAt = data.updated_at || "";
    state.shards = data.gallery_shards || 100;
    state.unpackImage = imageUnpacker(data);
    state.loaded = true;
  } catch {
    state.loaded = false;
  }
}

function refreshScope() {
  state.all = state.scope === "adult" ? state.adult || [] : state.standard;
  state.byId = new Map(state.all.map((lora) => [String(lora.id), lora]));
  el.source.textContent = t(state.scope === "adult" ? "adultSource" : "source");
  buildControls();
  applyFilters();
}

async function changeScope(scope) {
  const needsAdult = scope === "adult" && !state.adult && !state.adultLoading;
  if (needsAdult) {
    state.adultLoading = true;
    state.adultError = false;
  }
  if (scope !== state.scope) {
    state.revealedAdult.clear();
    state.scope = scope;
    state.preview = "with";
    resetFilters({ refresh: true });
  }
  if (!needsAdult) return;

  syncStatus();
  try {
    const response = await fetch(ADULT_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    state.adult = readLoras(data, true);
    state.adultUpdatedAt = data.updated_at || "";
  } catch {
    state.adultError = true;
  } finally {
    state.adultLoading = false;
    if (state.scope === "adult") refreshScope();
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

const keysOf = (lora, groupIndex) =>
  lora.triggers[groupIndex].map((_, index) => `${groupIndex}:${index}`);

function triggersOn(lora) {
  const saved = state.triggersOn.get(String(lora.id));
  if (saved) return saved;
  /* Набор, повторяющий теги первого (обычно имя персонажа), — самостоятельный другой образ:
     выключен. Набор без пересечений — дополнение (костюм, токен стиля): включён. */
  const first = new Set((lora.triggers[0] || []).map((tag) => tag.toLowerCase()));
  const keys = [];
  lora.triggers.forEach((group, g) => {
    if (g === 0 || !group.some((tag) => first.has(tag.toLowerCase())))
      keys.push(...keysOf(lora, g));
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
      if (on.has(`${g}:${i}`) && !out.some((x) => x.toLowerCase() === tag.toLowerCase()))
        out.push(tag);
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

const previewGroup = (lora) => (lora.images.length ? "with" : "without");
const tagQuery = (input) => input.split(",").map(norm).filter(Boolean);

function coverMatches(cover, orientation, resolution) {
  const width = Number(cover?.width);
  const height = Number(cover?.height);
  const actual =
    width > 0 && height > 0
      ? width === height
        ? "square"
        : width > height
          ? "landscape"
          : "portrait"
      : "unknown";
  return (
    (orientation === "all" || orientation === actual) &&
    (resolution === "all" ||
      (actual !== "unknown" && Math.max(width, height) >= Number(resolution)))
  );
}

function applyFilters() {
  /* поле могло измениться, а отложенный поиск ещё не сработал (очистили и сразу нажали категорию) */
  state.q = el.search.value;
  const ref = extractLoraRef(state.q);
  const match = ref && state.byId.get(ref.id);
  state.idRef = ref ? ref.id : "";
  if (match) state.preview = previewGroup(match);
  if (state.preview === "without") {
    state.gallery = false;
    for (const key of IMAGE_FACETS) state.extra[key] = EXTRA_DEFAULTS[key];
  }
  const { author, period, downloads, frames, tags, excludeTags, likes, orientation, resolution } =
    state.extra;
  const authorQuery = norm(author);
  const requiredTags = tagQuery(tags);
  const blockedTags = tagQuery(excludeTags);
  const cutoff = Number(period)
    ? new Date(Date.now() - Number(period) * 86_400_000).toISOString().slice(0, 10)
    : "";
  const frameRange = FRAME_RANGES[frames];
  const tokens = norm(state.q).split(" ").filter(Boolean);
  const list = ref
    ? match
      ? [match]
      : []
    : state.all.filter((lora) => {
        if (previewGroup(lora) !== state.preview) return false;
        if (state.category !== "all" && lora.category !== state.category) return false;
        if (state.kind !== "all" && lora.kind !== state.kind) return false;
        if (state.access === "free" && lora.access) return false;
        if (state.access === "paid" && !lora.access) return false;
        if (state.triggerFilter === "author" && !lora.triggers.length) return false;
        if (state.triggerFilter === "none" && lora.triggers.length) return false;
        if (state.triggerFilter === "multiple" && lora.triggers.length < 2) return false;
        if (state.triggerFilter === "described" && !lora.described.length) return false;
        if (authorQuery && !norm(lora.creator).includes(authorQuery)) return false;
        if (requiredTags.some((tag) => !lora.tagKeys.includes(tag))) return false;
        if (blockedTags.some((tag) => lora.tagKeys.includes(tag))) return false;
        if (likes !== "all" && !(Number(lora.likes) >= Number(likes))) return false;
        if (
          (orientation !== "all" || resolution !== "all") &&
          !coverMatches(lora.images[0], orientation, resolution)
        )
          return false;
        if (period === "unknown" && lora.published) return false;
        if (cutoff && (!lora.published || lora.published < cutoff)) return false;
        if (downloads !== "all") {
          if (lora.downloads == null) return false;
          if (downloads === "under100" ? lora.downloads >= 100 : lora.downloads < Number(downloads))
            return false;
        }
        const frameCount = lora.images.length + lora.more;
        if (frameRange && (frameCount < frameRange[0] || frameCount > frameRange[1])) return false;
        if (state.gallery && lora.images.length + lora.more < 2) return false;
        if (state.savedOnly && !state.saved.has(String(lora.id))) return false;
        return tokens.every((token) => lora.hay.includes(token));
      });

  const nameOrder =
    state.sort === "name"
      ? new Intl.Collator(lang(), { numeric: true, sensitivity: "base" })
      : null;
  const by = {
    popular: (a, b) => b.downloads - a.downloads,
    new: (a, b) => String(b.published || "").localeCompare(String(a.published || "")),
    liked: (a, b) => b.likes - a.likes,
    name: (a, b) => nameOrder.compare(a.name, b.name),
  }[state.sort];
  /* во «Всех» технические LoRA (турбо, детализаторы) уходят в конец: их скачивают больше всех, но ищут редко */
  const toolLast = (a, b) =>
    state.category === "all" && state.sort === "popular"
      ? Number(a.category === "tool") - Number(b.category === "tool")
      : 0;
  list.sort((a, b) => toolLast(a, b) || by(a, b) || a.order - b.order);

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
  if (state.scope === "adult") return;
  const url = new URL(window.location.href);
  const set = (key, value) =>
    value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  url.searchParams.delete("id");
  set("q", state.q.trim());
  set("cat", state.category === "all" ? "" : state.category);
  set("sort", state.sort === "popular" ? "" : state.sort);
  set("kind", state.kind === "all" ? "" : state.kind);
  set("access", state.access === "all" ? "" : state.access);
  set("triggers", state.triggerFilter === "all" ? "" : state.triggerFilter);
  set("gallery", state.gallery ? "1" : "");
  set("preview", state.preview === "without" ? "without" : "");
  set("saved", state.savedOnly ? "1" : "");
  for (const [key, value] of Object.entries(state.extra))
    set(key, value === EXTRA_DEFAULTS[key] ? "" : value.trim());
  history.replaceState(null, "", url);
}

function resetFilters({ refresh = false } = {}) {
  el.search.value = "";
  Object.assign(state, {
    category: "all",
    kind: "all",
    access: "all",
    sort: "popular",
    triggerFilter: "all",
    gallery: false,
    extra: { ...EXTRA_DEFAULTS },
    savedOnly: false,
  });
  if (refresh) refreshScope();
  else applyFilters();
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
    return lora.described.length
      ? describedHtml(lora)
      : `<p class="lr-note-v010">${esc(t("noTriggers"))}</p>`;
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
    hidden > 0
      ? `<button type="button" class="lr-more-v010" data-open>+${hidden}${esc(sets)}</button>`
      : ""
  }</div>`;
}

function controlsHtml(lora, { full = false } = {}) {
  const weight = weightOf(lora);
  const active = activeTriggers(lora).length;
  const visible = full
    ? active
    : lora.triggers[0]?.slice(0, CARD_TAGS).filter((_, i) => triggersOn(lora).has(`0:${i}`))
        .length || 0;
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

/* Метки в углу превью: возрастная категория и формат файла. */
function flagsHtml(lora) {
  const flags = [];
  if (lora.adult) flags.push('<span class="adult">18+</span>');
  if (lora.kind !== "lora") flags.push(`<span>${esc(KINDS[lora.kind])}</span>`);
  return flags.length ? `<span class="lr-flags-v010">${flags.join("")}</span>` : "";
}

function paidStatusHtml(lora) {
  if (!lora.access) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(lora.until) ? lora.until : "";
  const until = date
    ? `<span>${esc(t("paidUntil"))} <time datetime="${date}">${date.split("-").reverse().join(".")}</time></span>`
    : "";
  return `<p class="lr-paid-status-v010"><strong title="${esc(t("paidTitle"))}">${esc(t("paidBadge"))}</strong>${until}</p>`;
}

function favoriteHtml(lora) {
  const saved = state.saved.has(String(lora.id));
  const label = t(saved ? "unsaveLora" : "saveLora");
  return `<button type="button" class="lr-favorite-v010" data-favorite aria-pressed="${saved}" aria-label="${esc(label)}" title="${esc(label)}">${saved ? "♥" : "♡"}</button>`;
}

function adultPreviewHtml(lora) {
  const image = lora.images[0];
  if (!image)
    return `<div class="lr-spoiler-v010"><strong>18+</strong><span>${esc(t("noPreview"))}</span></div>`;
  const revealed = state.revealedAdult.has(String(lora.id));
  return `<button class="lr-spoiler-v010" type="button" data-spoiler aria-expanded="${revealed}">
    ${revealed ? `<img src="${esc(image.url)}" alt="" decoding="async">` : "<strong>18+</strong>"}
    <span>${esc(t(revealed ? "hideAdult" : "revealAdult"))}</span>
  </button>`;
}

function cardHtml(lora) {
  const image = lora.images[0];
  const ratio =
    image?.width && image?.height ? `${image.width}/${image.height}` : image ? "2/3" : "3/2";
  const count = lora.more
    ? `<span class="lr-count-v010" title="${esc(t("previews"))}">▣ ${lora.more + 1}</span>`
    : "";
  const media = lora.adult
    ? `<div class="lr-adult-media-v010">${adultPreviewHtml(lora)}${flagsHtml(lora)}${count}</div>`
    : `<button type="button" class="ch-media-v008 lr-media-v010" data-open style="aspect-ratio:${ratio}" aria-label="${esc(lora.name)}">
        ${image ? `<img src="${esc(image.url)}" alt="" loading="lazy" decoding="async">` : `<span class="lr-empty-preview-v010">${esc(t("noPreview"))}</span>`}
        <span class="lr-cat-v010">${esc(t(lora.category))}</span>
        ${flagsHtml(lora)}
        ${count}
      </button>`;
  return `
    <article class="ch-card-v008 lr-card-v010" data-id="${esc(lora.id)}">
      ${media}
      <div class="ch-body-v008">
        <div class="lr-card-title-v010">
          <h3 class="ch-name-v008 lr-name-v010" title="${esc(lora.name)}"><button type="button" data-open>${esc(lora.name)}</button></h3>
          ${favoriteHtml(lora)}
        </div>
        ${paidStatusHtml(lora)}
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
  const url = `${lora.adult ? ADULT_GALLERY_URL : GALLERY_URL}/${shard}.json`;
  if (!state.galleryCache.has(url)) {
    state.galleryCache.set(
      url,
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .catch(() => {
          state.galleryCache.delete(url);
          return null;
        })
    );
  }
  return state.galleryCache.get(url).then((data) => {
    if (!data) return null;
    const extra = (data[String(lora.id)] || []).map(state.unpackImage).filter(Boolean);
    lora.gallery = [...lora.images, ...extra];
    return lora.gallery;
  });
}

function mediaHtml(lora) {
  if (lora.adult && !state.revealedAdult.has(String(lora.id)))
    return `<div class="ch-viewer-media-v008 lr-adult-media-v010" data-id="${esc(lora.id)}">${adultPreviewHtml(lora)}</div>`;
  const images = lora.gallery || lora.images;
  const count = Math.max(images.length, lora.images.length + (lora.gallery ? 0 : lora.more));
  const index = Math.min(state.viewerImage, Math.max(0, images.length - 1));
  const image = images[index];
  if (!image)
    return `<div class="ch-viewer-media-v008 empty"><span class="lr-empty-preview-v010">${esc(t("noPreview"))}</span></div>`;
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
  const hide = lora.adult
    ? `<button class="ch-btn-v008 lr-hide-gallery-v010" type="button" data-spoiler aria-expanded="true">${esc(t("hideAdult"))}</button>`
    : "";
  return `<div class="ch-viewer-media-v008 lr-gallery-v010" data-id="${esc(lora.id)}">
      ${hide}
      <div class="lr-stage-v010"><img src="${esc(image.url)}" alt="${esc(lora.name)}">${nav}</div>
      ${thumbs}
    </div>`;
}

function renderMedia(lora) {
  const media = el.viewer.querySelector(".lr-gallery-v010, .ch-viewer-media-v008");
  if (!media) return;
  const spoilerFocused =
    media.contains(document.activeElement) && document.activeElement.matches("[data-spoiler]");
  media.outerHTML = mediaHtml(lora);
  if (spoilerFocused) el.viewer.querySelector("[data-spoiler]")?.focus();
}

function loadViewerGallery(lora) {
  if (lora.gallery || !lora.more || (lora.adult && !state.revealedAdult.has(String(lora.id))))
    return;
  loadGallery(lora).then((gallery) => {
    if (gallery && el.viewer.open && el.viewer.dataset.id === String(lora.id)) renderMedia(lora);
  });
}

function stepGallery(lora, delta, absolute = false) {
  if (lora.adult && !state.revealedAdult.has(String(lora.id))) return;
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
          <span class="eyebrow">${esc(t(lora.category))}${lora.kind === "lora" ? "" : ` · ${esc(KINDS[lora.kind])}`} · ${esc(t("by"))} ${esc(lora.creator)} · ${fmt(lora.downloads)} ${esc(t("downloads"))}</span>
          <h2>${esc(lora.name)}</h2>
        </div>
        <button class="text-button" type="button" data-close>${esc(t("close"))}</button>
      </header>
      ${paidStatusHtml(lora)}
      ${lora.access ? `<p class="lr-paid-note-v010">${esc(t("paidNote"))}</p>` : ""}
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
  loadViewerGallery(lora);
}

/* ---------- меню «на CivitAI»: перейти / скопировать ссылку / скопировать ID ---------- */

function closeMenu() {
  if (el.menu.hidden) return;
  el.menu.hidden = true;
  el.menu.dataset.id = "";
}

function openMenu(button, lora) {
  if (!el.menu.hidden && el.menu.dataset.id === String(lora.id) && el.menu.anchor === button)
    return closeMenu();
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
  const total = state.all.filter((lora) => previewGroup(lora) === state.preview).length;
  el.count.textContent = `${fmt(state.filtered.length)} / ${fmt(total)}`;
  el.showResults.textContent = t("showResults")(fmt(state.filtered.length));
  if (state.scope === "adult" && !state.adult?.length) {
    el.empty.hidden = false;
    el.empty.textContent = t(
      state.adultLoading ? "adultLoading" : state.adultError ? "adultError" : "adultEmpty"
    );
    return;
  }
  if (state.scope === "standard" && !state.loaded) {
    el.empty.hidden = false;
    el.empty.textContent = t("emptyData");
    return;
  }
  el.empty.hidden = state.filtered.length > 0;
  if (!el.empty.hidden) {
    const reset = `<button class="ch-btn-v008" type="button" data-reset>${esc(t("reset"))}</button>`;
    el.empty.innerHTML = state.idRef
      ? `${esc(t("emptyId").replace("{id}", state.idRef))} <a class="ch-btn-v008" href="https://civitai.com/models/${esc(state.idRef)}" target="_blank" rel="noopener">${esc(t("openCivitai"))} ↗</a> ${reset}`
      : `${esc(t("empty"))} ${reset}`;
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
  /* формат и доступ: ряд появляется, только когда в каталоге есть из чего выбирать */
  const kindCounts = {};
  let paid = 0;
  state.all.forEach((lora) => {
    kindCounts[lora.kind] = (kindCounts[lora.kind] || 0) + 1;
    if (lora.access) paid += 1;
  });
  const kindChips =
    Object.keys(kindCounts).length > 1
      ? Object.keys(KINDS)
          .filter((kind) => kindCounts[kind])
          .map(
            (kind) =>
              `<button class="filter-chip" type="button" data-kind="${kind}">${esc(KINDS[kind])} <span>${fmt(kindCounts[kind])}</span></button>`
          )
      : [];
  const accessChips = ACCESS.filter((key) => paid || key === "paid" || state.access === "free").map(
    (key) =>
      `<button class="filter-chip" type="button" data-access="${key}">${esc(t(key))} <span>${fmt(key === "paid" ? paid : state.all.length - paid)}</span></button>`
  );
  el.kinds.innerHTML = [...kindChips, ...accessChips].join("");
  el.kinds.hidden = !el.kinds.innerHTML;
  el.statCount.textContent = fmt(state.all.length);
  el.statCharacters.textContent = fmt(counts.character || 0);
  const updatedAt = state.scope === "adult" ? state.adultUpdatedAt : state.updatedAt;
  el.updated.textContent = updatedAt
    ? `${t("updated")} ${updatedAt.split("-").reverse().join(".")}`
    : "";
}

function syncControls() {
  if (el.search.value !== state.q) el.search.value = state.q;
  el.triggerFilter.value = state.triggerFilter;
  el.advanced.querySelectorAll("[data-image-facet]").forEach((field) => {
    field.hidden = state.preview === "without";
  });
  el.advanced.querySelectorAll("[data-facet]").forEach((field) => {
    const value = state.extra[field.dataset.facet];
    if (field.value !== value) field.value = value;
  });
  const active =
    extraCount() +
    [
      state.preview !== "with",
      state.category !== "all",
      state.sort !== "popular",
      state.kind !== "all",
      state.access !== "all",
      state.triggerFilter !== "all",
      state.gallery,
      state.savedOnly,
    ].filter(Boolean).length;
  el.filterCount.textContent = fmt(active);
  el.filterCount.hidden = !active;
  el.openFilters.classList.toggle("has-active", Boolean(active));
  el.refine.querySelector("[data-feature='gallery']").hidden = state.preview === "without";
  const selections = {
    scope: state.scope,
    preview: state.preview,
    category: state.category,
    sort: state.sort,
    kind: state.kind,
    access: state.access,
  };
  const stateButtons = [
    ...el.scope.querySelectorAll("[data-scope]"),
    ...el.filters.querySelectorAll(
      "[data-preview], [data-category], [data-sort], [data-kind], [data-access], [data-feature]"
    ),
  ];
  stateButtons.forEach((button) => {
    const [key, value] = Object.entries(button.dataset)[0];
    const selected =
      key === "feature"
        ? value === "saved"
          ? state.savedOnly
          : state.gallery
        : selections[key] === value;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  el.filters.querySelector("[data-reset]").hidden = !(state.q.trim() || active);
}

function applyLocale() {
  document
    .querySelectorAll("[data-ch-i18n]")
    .forEach((node) => (node.textContent = t(node.dataset.chI18n)));
  document
    .querySelectorAll("[data-lr-i18n]")
    .forEach((node) => (node.textContent = t(node.dataset.lrI18n)));
  el.search.placeholder = t("searchPlaceholder");
  el.backToTop.setAttribute("aria-label", t("backToTop"));
  el.backToTop.title = t("backToTop");
  el.advanced.querySelector("[data-facet='author']").placeholder = t("authorPlaceholder");
  for (const key of ["tags", "excludeTags"])
    el.advanced.querySelector(`[data-facet="${key}"]`).placeholder = t("tagsPlaceholder");
  el.lead.textContent = t("lead");
  el.source.textContent = t(state.scope === "adult" ? "adultSource" : "source");
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
  const header = $(".topbar");
  const syncHeaderHeight = () => {
    el.stickyControls.style.setProperty("--lr-header-height", `${header.offsetHeight}px`);
  };
  syncHeaderHeight();
  new ResizeObserver(syncHeaderHeight).observe(header);

  const syncBackToTop = () => {
    el.backToTop.hidden = window.scrollY < 450;
  };
  syncBackToTop();
  el.backToTop.addEventListener("click", () => {
    el.catalogTitle.focus({ preventScroll: true });
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });

  let timer = null;
  const queueFilter = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(applyFilters, 120);
  };
  el.search.addEventListener("input", queueFilter);
  el.openFilters.addEventListener("click", () => el.filters.showModal());
  el.filters.addEventListener("click", (event) => {
    if (event.target === el.filters || event.target.closest("[data-close-filters]")) {
      el.filters.close();
    } else if (event.target.closest("[data-reset]")) {
      state.preview = "with";
      resetFilters();
      el.showResults.focus();
    }
  });
  el.advanced.addEventListener("input", (event) => {
    const key = event.target.dataset.facet;
    if (!Object.hasOwn(TEXT_FACETS, key)) return;
    state.extra[key] = event.target.value;
    queueFilter();
  });
  el.advanced.addEventListener("change", (event) => {
    const key = event.target.dataset.facet;
    if (!Object.hasOwn(EXTRA_OPTIONS, key)) return;
    state.extra[key] = event.target.value;
    if (key === "frames" && state.extra.frames === "one") state.gallery = false;
    applyFilters();
  });

  el.scope.addEventListener("click", (event) => {
    const scope = event.target.closest("[data-scope]")?.dataset.scope;
    if (!scope) return;
    if (scope === "adult" && !state.ageConfirmed) {
      el.age.returnValue = "";
      el.age.showModal();
    } else {
      changeScope(scope);
    }
  });
  el.age.addEventListener("close", () => {
    if (el.age.returnValue !== "confirm") return;
    state.ageConfirmed = true;
    changeScope("adult");
  });
  el.preview.addEventListener("click", (event) => {
    const next = event.target.closest("[data-preview]")?.dataset.preview;
    if (!next || next === state.preview) return;
    const ref = extractLoraRef(el.search.value);
    if (ref && state.byId.has(ref.id) && previewGroup(state.byId.get(ref.id)) !== next) {
      el.search.value = "";
    }
    state.preview = next;
    applyFilters();
  });
  el.triggerFilter.addEventListener("change", () => {
    state.triggerFilter = el.triggerFilter.value;
    applyFilters();
  });
  el.refine.addEventListener("click", (event) => {
    const feature = event.target.closest("[data-feature]")?.dataset.feature;
    if (!feature) return;
    if (feature === "gallery") {
      state.gallery = !state.gallery;
      if (state.gallery && state.extra.frames === "one") state.extra.frames = "all";
    } else state.savedOnly = !state.savedOnly;
    applyFilters();
  });
  el.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-favorite]");
    if (!button) return;
    const id = button.closest("[data-id]").dataset.id;
    if (state.saved.has(id)) state.saved.delete(id);
    else state.saved.add(id);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify([...state.saved]));
    } catch {}
    if (state.savedOnly) {
      applyFilters();
      el.refine.querySelector("[data-feature='saved']").focus();
    } else {
      button.outerHTML = favoriteHtml(state.byId.get(id));
      el.grid.querySelector(`[data-id="${CSS.escape(id)}"] [data-favorite]`)?.focus();
    }
  });

  el.categories.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    applyFilters();
  });

  /* повторный клик по включённому чипу снимает фильтр */
  el.kinds.addEventListener("click", (event) => {
    const kind = event.target.closest("[data-kind]");
    const access = event.target.closest("[data-access]");
    if (kind) state.kind = state.kind === kind.dataset.kind ? "all" : kind.dataset.kind;
    else if (access)
      state.access = state.access === access.dataset.access ? "all" : access.dataset.access;
    else return;
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
    if (event.target.closest("[data-spoiler]")) {
      if (state.revealedAdult.has(id)) state.revealedAdult.delete(id);
      else state.revealedAdult.add(id);
      rerenderCard(id);
      if (el.viewer.open) {
        renderMedia(lora);
        el.viewer.querySelector("[data-spoiler]")?.focus();
        loadViewerGallery(lora);
      } else {
        el.grid.querySelector(`[data-id="${CSS.escape(id)}"] [data-spoiler]`)?.focus();
      }
      return;
    }
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
      if (
        !el.menu.hidden &&
        !el.menu.contains(event.target) &&
        !event.target.closest("[data-civitai]")
      )
        closeMenu();
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
      syncBackToTop();
      if (
        !el.menu.hidden &&
        !el.menu.classList.contains("sheet") &&
        Math.abs(window.scrollY - el.menu.scrollAt) > 40
      )
        closeMenu();
    },
    { passive: true }
  );

  el.empty.addEventListener("click", (event) => {
    if (!event.target.closest("[data-reset]")) return;
    resetFilters();
    el.search.focus();
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
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    if (Array.isArray(saved)) state.saved = new Set(saved.filter((id) => typeof id === "string"));
  } catch {}
  applyLocale();
  bind();
  await load();
  /* поле поиска заполняется из ?q= до фильтрации: applyFilters читает запрос из поля */
  el.search.value = state.q;
  refreshScope();
  /* ссылка loras.html?id=… сразу открывает карточку */
  const linked = params.get("id");
  if (linked && state.byId.has(linked)) openViewer(linked);
}

start();
