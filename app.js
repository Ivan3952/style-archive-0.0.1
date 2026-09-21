(() => {
  const VISUAL_PAGE_SIZE = window.innerWidth <= 680 ? 24 : 48;
  const SUPPORTED_PAGE_SIZE = window.innerWidth <= 680 ? 120 : 240;
  const SUPPORTED_TOTAL_FALLBACK = 59676;
  const VISUAL_SUPPORTED_PREVIEW_LIMIT = window.innerWidth <= 680 ? 10 : 18;
  const RECENT_LIMIT = 24;

  const LANG_KEY = "style-archive:lang";
  const THEME_KEY = "style-archive:theme";

  const I18N = {
    en: {
      previewsShort: "PREVIEWS",
      supportedShort: "SUPPORTED",
      styleIndex: "STYLE INDEX",
      stylesTitle: "Styles",
      visualStat: "VISUAL",
      supportedStat: "SUPPORTED",
      random: "RANDOM",
      randomAny: "ANY",
      discover12: "DISCOVER 12",
      recent: "RECENT",
      tray: "ADDED",
      saved: "SAVED",
      info: "INFO",
      aboutTitle: "ABOUT",
      aboutLead: "A visual archive and searchable index of model-supported styles.",
      archiveOriginTitle: "ABOUT THE ARCHIVE",
      archiveOriginDesc: "All styles featured in the Visual Archive were tested by members of the Stable Waifu community using the AM Preview model. The previews in the archive are results of those tests.",
      visualArchiveDesc: "Styles with visual previews available in the archive.",
      allSupportedDesc: "The complete searchable list of style identifiers supported by the model.",
      presetsDesc: "Available preview presets for a style.",
      infoGroupExplore: "EXPLORE",
      infoGroupTools: "STYLE TOOLS",
      infoGroupViewer: "PREVIEW VIEWER",
      infoGroupInterface: "INTERFACE",
      visualArchiveFullDesc: "Browse only styles that already have visual previews. Click an image to open the full-screen viewer; click a style name to copy it.",
      allSupportedFullDesc: "Browse the complete list of model-supported style identifiers, including styles without previews. Styles with available previews are highlighted.",
      searchFullDesc: "Search across the archive and the full supported index. The search tolerates minor typos and close spellings.",
      presetsFullDesc: "Filter previews by the preset in which they were generated. In the full index you can also show styles with MAIN, ALT, both presets, previews, or no previews.",
      sortFullDesc: "Reorder the visual archive by archive order, newest, oldest, A–Z, or a new random order.",
      alphabetInfoTitle: "A–Z INDEX",
      alphabetInfoDesc: "Use alphabet navigation in All Supported to jump directly to styles beginning with a specific letter or symbol.",
      randomFullDesc: "Open a random visual style. The menu can limit the random pool to ANY, MAIN, ALT, or your SAVED styles.",
      addedFullDesc: "Build a temporary working list of style names. Add styles from cards, the supported index, Recent, or the viewer, then copy the whole list at once.",
      savedFullDesc: "Save styles to a persistent local favourites list. Press SAVED in the header to show only saved visual styles. In Saved mode, ADDED ↓ shows the most recently saved styles first, while ADDED ↑ shows the oldest saved styles first.",
      recentFullDesc: "Keeps the latest viewed preview styles so you can quickly return to something you opened earlier.",
      copyInfoTitle: "ONE-CLICK COPY",
      copyInfoDesc: "Click a style name anywhere in the interface to copy its identifier. Added can copy several selected styles in one line.",
      localStorageInfoTitle: "LOCAL STORAGE",
      localStorageInfoDesc: "Saved, Added, Recent, language, and theme are stored only in your browser. No account is required.",
      viewerInfoTitle: "FULL-SCREEN PREVIEW",
      viewerInfoDesc: "Open an image at maximum available size. If a style has several previews, use the arrows to move between them.",
      relatedFullDesc: "Shows additional previewed styles that share an available preset with the current style. This is preset-based related content, not visual-similarity search.",
      previewMetaInfoTitle: "PREVIEW INFO",
      previewMetaInfoDesc: "The viewer shows the archive position, preset, publication date, and the number of available preview images.",
      themeInfoTitle: "LIGHT / DARK",
      themeInfoDesc: "Use the ◐ button to switch between light and dark themes. Your choice is remembered by the browser.",
      languageInfoDesc: "Switch the interface between Russian and English without changing style identifiers or preset names.",
      shortcutsInfoTitle: "KEYBOARD",
      shortcutsInfoDesc: "/ focuses search, R opens a random style, C copies the current style in the viewer, ← / → switch preview images, and Esc closes the side panel.",
      version: "VERSION",
      visualArchive: "VISUAL ARCHIVE",
      stylesWithPreviews: "styles with previews",
      allSupported: "ALL SUPPORTED",
      fullModelIndex: "full model index",
      search: "SEARCH",
      searchPlaceholder: "search every style",
      sort: "SORT",
      sortArchive: "ARCHIVE",
      sortNewest: "NEWEST",
      sortOldest: "OLDEST",
      sortAddedNewest: "ADDED ↓",
      sortAddedOldest: "ADDED ↑",
      sortRandom: "RANDOM",
      clear: "CLEAR",
      loadingArchive: "LOADING ARCHIVE",
      moreSupportedStyles: "More supported styles",
      viewAll: "VIEW ALL",
      supportedIndex: "SUPPORTED INDEX",
      styleTools: "Style tools",
      close: "CLOSE",
      copyAll: "COPY ALL",
      lastViewedPreviews: "LAST VIEWED PREVIEWS",
      related: "RELATED",
      add: "ADD",
      added: "ADDED ✓",
      save: "SAVE",
      savedState: "SAVED ✓",
      remove: "REMOVE",
      removed: "REMOVED",
      copy: "COPY",
      copied: "COPIED ✓",
      allCopied: "ALL COPIED ✓",
      savedToast: "SAVED ✓",
      unsavedToast: "REMOVED FROM SAVED",
      addedToast: "ADDED ✓",
      removedToast: "REMOVED FROM ADDED",
      cleared: "CLEARED",
      nothingFound: "NOTHING FOUND",
      nothingFoundHint: "Try another query or reset the active filters.",
      resetFilters: "RESET FILTERS",
      archiveLoadFailed: "ARCHIVE COULD NOT BE LOADED",
      archiveLoadFailedHint: "Check that the site is running through a local HTTP server and try again.",
      supportedLoadFailed: "SUPPORTED INDEX COULD NOT BE LOADED",
      supportedLoadFailedHint: "The supported style list is unavailable. Try again.",
      retry: "RETRY",
      localBuildDate: "RELEASE · 22.09.2026",
      verifiedStylesThrough: "VERIFIED STYLES THROUGH",
      shortcutSearch: "Focus search",
      shortcutRandom: "Random style",
      shortcutCopy: "Copy current style",
      shortcutPreview: "Previous / next preview",
      shortcutClose: "Close open panel or viewer",
      preview: "PREVIEW",
      previews: "PREVIEWS",
      noPreview: "NO PREVIEW",
      all: "ALL",
      matches: "MATCHES",
      visualIndex: "VISUAL INDEX",
      discoverStatus: "DISCOVER",
      savedStatus: "SAVED",
      supportedSearch: "SUPPORTED SEARCH",
      loadingSupportedIndex: "LOADING SUPPORTED INDEX",
      supportedGeneric: "SUPPORTED",
      dataError: "SUPPORTED DATA ERROR",
      empty: "EMPTY",
      trayEmptyToast: "NOTHING ADDED",
      trayEmpty: "Added styles appear here. Copy the full list in one click.",
      recentEmpty: "Viewed styles will appear here.",
      noMatchingStyles: "No matching styles.",
      availablePreviewPresets: "Available preview presets",
      untitled: "Untitled",
      styleAlt: "Style",
      archiveDataError: "ERROR / ARCHIVE DATA NOT FOUND",
      archiveDataHint: "Could not load <code>./data/styles.json</code> and <code>./data/media.json</code>. Run the site through a local HTTP server instead of opening index.html directly.",
      switchToRussian: "Switch to Russian",
      switchToEnglish: "Switch to English",
      switchTheme: "Switch theme",
      lightTheme: "Light theme",
      darkTheme: "Dark theme",
      moreSupportedMatches: "{count} more supported matches",
    },
    ru: {
      previewsShort: "ПРЕВЬЮ",
      supportedShort: "ПОДДЕРЖИВАЕМЫХ",
      styleIndex: "ИНДЕКС СТИЛЕЙ",
      stylesTitle: "Стили",
      visualStat: "С ПРЕВЬЮ",
      supportedStat: "ПОДДЕРЖИВАЕТСЯ",
      random: "СЛУЧАЙНЫЙ",
      randomAny: "ЛЮБОЙ",
      discover12: "ПОДБОРКА 12",
      recent: "НЕДАВНИЕ",
      tray: "ДОБАВЛЕННЫЕ",
      saved: "ИЗБРАННОЕ",
      info: "ИНФО",
      aboutTitle: "О ПРОЕКТЕ",
      aboutLead: "Визуальный архив и поисковый индекс стилей, поддерживаемых моделью.",
      archiveOriginTitle: "ОБ АРХИВЕ",
      archiveOriginDesc: "Все стили, представленные в Визуальном архиве, были проверены участниками чата Stable Waifu на модели AM Preview. Превью в архиве являются результатами этих проверок.",
      visualArchiveDesc: "Стили, для которых в архиве доступны визуальные превью.",
      allSupportedDesc: "Полный доступный для поиска список идентификаторов стилей, поддерживаемых моделью.",
      presetsDesc: "Доступные варианты превью для конкретного стиля.",
      infoGroupExplore: "ПОИСК И ПРОСМОТР",
      infoGroupTools: "ИНСТРУМЕНТЫ",
      infoGroupViewer: "ПРОСМОТР ПРЕВЬЮ",
      infoGroupInterface: "ИНТЕРФЕЙС",
      visualArchiveFullDesc: "Здесь находятся только стили, для которых уже есть визуальные превью. Нажмите на изображение, чтобы открыть полноэкранный просмотр, или на название стиля, чтобы сразу его скопировать.",
      allSupportedFullDesc: "Полный список идентификаторов стилей, поддерживаемых моделью, включая стили без превью. Стили с доступными визуальными примерами выделяются отдельно.",
      searchFullDesc: "Поиск работает одновременно по визуальному архиву и полному списку поддерживаемых стилей. Допускаются небольшие опечатки и близкие варианты написания.",
      presetsFullDesc: "Позволяют отфильтровать превью по пресету, в котором они были получены. В полном списке также доступны фильтры MAIN, ALT, MAIN + ALT, с превью и без превью.",
      sortFullDesc: "Визуальный архив можно сортировать по исходному порядку, от новых к старым, от старых к новым, по алфавиту или в случайном порядке.",
      alphabetInfoTitle: "АЛФАВИТ A–Z",
      alphabetInfoDesc: "Во вкладке «Все поддерживаемые» можно быстро перейти к стилям, начинающимся с нужной буквы или символа.",
      randomFullDesc: "Открывает случайный стиль с превью. В меню можно ограничить выбор всеми стилями, только MAIN, только ALT или только сохранёнными стилями.",
      addedFullDesc: "Временная рабочая подборка стилей. Стили можно добавлять из карточек, полного списка, «Недавних» и полноэкранного просмотра, а затем скопировать весь список одной строкой.",
      savedFullDesc: "Постоянное локальное избранное. Кнопка «Избранное» в шапке позволяет показать только сохранённые визуальные стили.",
      recentFullDesc: "Автоматически сохраняет последние просмотренные стили с превью, чтобы к ним можно было быстро вернуться.",
      copyInfoTitle: "КОПИРОВАНИЕ В ОДИН КЛИК",
      copyInfoDesc: "Нажмите на название стиля в любой части сайта, чтобы скопировать его идентификатор. Через «Добавленные» можно скопировать сразу несколько выбранных стилей одной строкой.",
      localStorageInfoTitle: "ЛОКАЛЬНОЕ ХРАНЕНИЕ",
      localStorageInfoDesc: "Избранное, Добавленные, Недавние, язык и тема сохраняются только в вашем браузере. Регистрация и аккаунт не требуются.",
      viewerInfoTitle: "ПОЛНОЭКРАННЫЙ ПРОСМОТР",
      viewerInfoDesc: "Открывает изображение в максимально доступном размере. Если у стиля несколько превью, между ними можно переключаться стрелками.",
      relatedFullDesc: "Показывает дополнительные стили с превью, у которых совпадает доступный пресет с текущим стилем. Сейчас это подборка по пресету, а не поиск по визуальному сходству.",
      previewMetaInfoTitle: "ИНФОРМАЦИЯ О ПРЕВЬЮ",
      previewMetaInfoDesc: "В просмотрщике отображаются позиция в архиве, пресет, дата публикации и количество доступных изображений стиля.",
      themeInfoTitle: "СВЕТЛАЯ / ТЁМНАЯ ТЕМА",
      themeInfoDesc: "Кнопка ◐ переключает светлую и тёмную тему. Выбранный вариант запоминается браузером.",
      languageInfoDesc: "Кнопка RU / EN переключает интерфейс между русским и английским языком, не изменяя названия стилей и пресетов.",
      shortcutsInfoTitle: "КЛАВИАТУРА",
      shortcutsInfoDesc: "/ переводит курсор в поиск, R открывает случайный стиль, C копирует текущий стиль в просмотрщике, ← / → переключают превью, Esc закрывает боковую панель.",
      version: "ВЕРСИЯ",
      visualArchive: "ВИЗУАЛЬНЫЙ АРХИВ",
      stylesWithPreviews: "стили с доступными превью",
      allSupported: "ВСЕ ПОДДЕРЖИВАЕМЫЕ",
      fullModelIndex: "полный список модели",
      search: "ПОИСК",
      searchPlaceholder: "найти стиль",
      sort: "СОРТИРОВКА",
      sortArchive: "АРХИВ",
      sortNewest: "НОВЫЕ",
      sortOldest: "СТАРЫЕ",
      sortAddedNewest: "ДОБАВЛЕНЫ ↓",
      sortAddedOldest: "ДОБАВЛЕНЫ ↑",
      sortRandom: "СЛУЧАЙНО",
      clear: "СБРОСИТЬ",
      loadingArchive: "ЗАГРУЗКА АРХИВА",
      moreSupportedStyles: "Другие поддерживаемые стили",
      viewAll: "ПОКАЗАТЬ ВСЕ",
      supportedIndex: "СПИСОК ПОДДЕРЖИВАЕМЫХ",
      styleTools: "Инструменты стилей",
      close: "ЗАКРЫТЬ",
      copyAll: "КОПИРОВАТЬ ВСЕ",
      lastViewedPreviews: "ПОСЛЕДНИЕ ПРОСМОТРЕННЫЕ",
      related: "ЕЩЁ",
      add: "ДОБАВИТЬ",
      added: "ДОБАВЛЕНО ✓",
      save: "СОХРАНИТЬ",
      savedState: "СОХРАНЕНО ✓",
      remove: "УДАЛИТЬ",
      removed: "УДАЛЕНО",
      copy: "КОПИРОВАТЬ",
      copied: "СКОПИРОВАНО ✓",
      allCopied: "ВСЁ СКОПИРОВАНО ✓",
      savedToast: "СОХРАНЕНО ✓",
      unsavedToast: "УДАЛЕНО ИЗ ИЗБРАННОГО",
      addedToast: "ДОБАВЛЕНО ✓",
      removedToast: "УДАЛЕНО ИЗ ДОБАВЛЕННЫХ",
      cleared: "ОЧИЩЕНО",
      nothingFound: "НИЧЕГО НЕ НАЙДЕНО",
      nothingFoundHint: "Попробуйте изменить запрос или сбросить активные фильтры.",
      resetFilters: "СБРОСИТЬ ФИЛЬТРЫ",
      archiveLoadFailed: "НЕ УДАЛОСЬ ЗАГРУЗИТЬ АРХИВ",
      archiveLoadFailedHint: "Проверьте, что сайт запущен через локальный HTTP-сервер, и повторите попытку.",
      supportedLoadFailed: "НЕ УДАЛОСЬ ЗАГРУЗИТЬ СПИСОК",
      supportedLoadFailedHint: "Полный список поддерживаемых стилей сейчас недоступен. Повторите попытку.",
      retry: "ПОВТОРИТЬ",
      localBuildDate: "РЕЛИЗ · 22.09.2026",
      verifiedStylesThrough: "ПРОВЕРЕННЫЕ СТИЛИ ДО",
      shortcutSearch: "Перейти к поиску",
      shortcutRandom: "Случайный стиль",
      shortcutCopy: "Скопировать текущий стиль",
      shortcutPreview: "Предыдущее / следующее превью",
      shortcutClose: "Закрыть окно или просмотр",
      preview: "ПРЕВЬЮ",
      previews: "ПРЕВЬЮ",
      noPreview: "БЕЗ ПРЕВЬЮ",
      all: "ВСЕ",
      matches: "СОВПАДЕНИЙ",
      visualIndex: "ВИЗУАЛЬНЫЙ АРХИВ",
      discoverStatus: "ПОДБОРКА",
      savedStatus: "ИЗБРАННОЕ",
      supportedSearch: "ПОИСК ПО ПОДДЕРЖИВАЕМЫМ",
      loadingSupportedIndex: "ЗАГРУЗКА СПИСКА",
      supportedGeneric: "ПОДДЕРЖИВАЕТСЯ",
      dataError: "ОШИБКА ДАННЫХ",
      empty: "ПУСТО",
      trayEmptyToast: "НИЧЕГО НЕ ДОБАВЛЕНО",
      trayEmpty: "Добавленные стили появятся здесь. Весь список можно скопировать одним нажатием.",
      recentEmpty: "Здесь появятся последние просмотренные стили.",
      noMatchingStyles: "Подходящих стилей не найдено.",
      availablePreviewPresets: "Доступные пресеты превью",
      untitled: "Без названия",
      styleAlt: "Стиль",
      archiveDataError: "ОШИБКА / ДАННЫЕ АРХИВА НЕ НАЙДЕНЫ",
      archiveDataHint: "Не удалось загрузить <code>./data/styles.json</code> и <code>./data/media.json</code>. Запускай сайт через локальный HTTP-сервер, а не двойным кликом по index.html.",
      switchToRussian: "Переключить на русский",
      switchToEnglish: "Переключить на английский",
      switchTheme: "Переключить тему",
      lightTheme: "Светлая тема",
      darkTheme: "Тёмная тема",
      moreSupportedMatches: "Ещё поддерживаемых совпадений: {count}",
    },
  };

  const initialLanguage = (() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "ru" || saved === "en") return saved;
    } catch {}
    return String(navigator.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
  })();

  const initialTheme = (() => {
    const domTheme = document.documentElement.dataset.theme;
    if (domTheme === "light" || domTheme === "dark") return domTheme;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  })();

  const readStoredArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const initialSavedIds = readStoredArray("style-archive:saved")
    .filter((value) => typeof value === "string" && value);

  const readSavedAt = (savedIds) => {
    const map = new Map();
    let stored = [];

    try {
      const parsed = JSON.parse(localStorage.getItem("style-archive:saved-at") || "[]");
      if (Array.isArray(parsed)) stored = parsed;
    } catch {}

    stored.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return;
      const id = String(entry[0] || "");
      const stamp = Number(entry[1]);
      if (id && Number.isFinite(stamp)) map.set(id, stamp);
    });

    // Migration for favourites created before timestamped saved data:
    // Set preserves the old insertion order, so sequential legacy values
    // retain "first saved → last saved" without deleting old favourites.
    savedIds.forEach((id, index) => {
      if (!map.has(id)) map.set(id, index + 1);
    });

    return map;
  };

  const initialSavedAt = readSavedAt(initialSavedIds);

  const state = {
    mode: "visual",
    styles: [],
    archiveOrder: new Map(),
    styleById: new Map(),
    visualNameMap: new Map(),
    visualNameMeta: new Map(),
    visualSearchIndex: new Map(),
    relatedCache: new Map(),
    media: {},
    filtered: [],
    rendered: 0,
    activePreset: "all",
    visualSort: "archive",
    danbooruMin: 0,
    danbooruPresence: "all",
    randomSortSeed: Date.now(),
    savedOnly: false,
    discoveryStyles: null,
    saved: new Set(initialSavedIds),
    savedAt: initialSavedAt,
    tray: readStoredArray("style-archive:tray").filter((value) => typeof value === "string" && value.trim()),
    recent: readStoredArray("style-archive:recent").filter((value) => typeof value === "string"),
    drawerTab: "tray",
    viewerStyle: null,
    viewerMediaIndex: 0,
    toastTimer: null,
    columns: [],
    columnCount: 0,
    supported: null,
    supportedIndex: null,
    supportedPromise: null,
    supportedFiltered: [],
    supportedRendered: 0,
    supportedLastLetter: "",
    supportedLetter: "all",
    supportedFilter: "all",
    supportedSort: "az",
    supportedDanbooruPresence: "all",
    lang: initialLanguage,
    theme: initialTheme,
  };

  const el = {
    brandVisualCount: document.querySelector("#brandVisualCount"),
    brandSupportedCount: document.querySelector("#brandSupportedCount"),
    visualStat: document.querySelector("#visualStat"),
    supportedStat: document.querySelector("#supportedStat"),
    savedCount: document.querySelector("#savedCount"),
    trayCount: document.querySelector("#trayCount"),
    recentCount: document.querySelector("#recentCount"),
    searchInput: document.querySelector("#searchInput"),
    resultCount: document.querySelector("#resultCount"),
    filterList: document.querySelector("#filterList"),
    sortList: document.querySelector("#sortList"),
    visualFilters: document.querySelector("#visualFilters"),
    supportedTools: document.querySelector("#supportedTools"),
    supportedFilterList: document.querySelector("#supportedFilterList"),
    supportedSortList: document.querySelector("#supportedSortList"),
    alphabet: document.querySelector("#alphabet"),
    clearButton: document.querySelector("#clearButton"),
    supportedClearButton: document.querySelector("#supportedClearButton"),
    randomButton: document.querySelector("#randomButton"),
    randomMenu: document.querySelector("#randomMenu"),
    discoverButton: document.querySelector("#discoverButton"),
    recentButton: document.querySelector("#recentButton"),
    trayButton: document.querySelector("#trayButton"),
    savedButton: document.querySelector("#savedButton"),
    infoButton: document.querySelector("#infoButton"),
    infoDialog: document.querySelector("#infoDialog"),
    closeInfo: document.querySelector("#closeInfo"),
    infoVisualCount: document.querySelector("#infoVisualCount"),
    infoSupportedCount: document.querySelector("#infoSupportedCount"),
    gallery: document.querySelector("#gallery"),
    statusLine: document.querySelector("#statusLine"),
    archiveSkeleton: document.querySelector("#archiveSkeleton"),
    visualEmptyState: document.querySelector("#visualEmptyState"),
    visualEmptyReset: document.querySelector("#visualEmptyReset"),
    archiveErrorState: document.querySelector("#archiveErrorState"),
    retryArchiveButton: document.querySelector("#retryArchiveButton"),
    visualShell: document.querySelector("#visualShell"),
    supportedShell: document.querySelector("#supportedShell"),
    sentinel: document.querySelector("#loadSentinel"),
    supportedSentinel: document.querySelector("#supportedSentinel"),
    supportedList: document.querySelector("#supportedList"),
    supportedStatusLine: document.querySelector("#supportedStatusLine"),
    supportedEmptyState: document.querySelector("#supportedEmptyState"),
    supportedEmptyReset: document.querySelector("#supportedEmptyReset"),
    supportedErrorState: document.querySelector("#supportedErrorState"),
    retrySupportedButton: document.querySelector("#retrySupportedButton"),
    searchSupported: document.querySelector("#searchSupported"),
    searchSupportedTitle: document.querySelector("#searchSupportedTitle"),
    searchSupportedList: document.querySelector("#searchSupportedList"),
    showAllSupportedResults: document.querySelector("#showAllSupportedResults"),
    drawerBackdrop: document.querySelector("#drawerBackdrop"),
    utilityDrawer: document.querySelector("#utilityDrawer"),
    drawerTabs: [...document.querySelectorAll("[data-drawer-tab]")],
    closeDrawer: document.querySelector("#closeDrawer"),
    trayPanel: document.querySelector("#trayPanel"),
    recentPanel: document.querySelector("#recentPanel"),
    trayList: document.querySelector("#trayList"),
    recentList: document.querySelector("#recentList"),
    drawerTrayCount: document.querySelector("#drawerTrayCount"),
    drawerRecentCount: document.querySelector("#drawerRecentCount"),
    copyTrayButton: document.querySelector("#copyTrayButton"),
    clearTrayButton: document.querySelector("#clearTrayButton"),
    clearRecentButton: document.querySelector("#clearRecentButton"),
    toast: document.querySelector("#toast"),
    viewer: document.querySelector("#viewer"),
    viewerIndex: document.querySelector("#viewerIndex"),
    viewerImage: document.querySelector("#viewerImage"),
    viewerName: document.querySelector("#viewerName"),
    viewerPreset: document.querySelector("#viewerPreset"),
    viewerDate: document.querySelector("#viewerDate"),
    viewerImageCount: document.querySelector("#viewerImageCount"),
    viewerSave: document.querySelector("#viewerSave"),
    viewerTray: document.querySelector("#viewerTray"),
    viewerRelated: document.querySelector("#viewerRelated"),
    viewerRelatedList: document.querySelector("#viewerRelatedList"),
    closeViewer: document.querySelector("#closeViewer"),
    prevMedia: document.querySelector("#prevMedia"),
    nextMedia: document.querySelector("#nextMedia"),
    languageButton: document.querySelector("#languageButton"),
    themeButton: document.querySelector("#themeButton"),
    themeColor: document.querySelector("#themeColor"),
    modeTabs: [...document.querySelectorAll("[data-mode]")],
  };

  function t(key, vars = {}) {
    const dict = I18N[state.lang] || I18N.en;
    let value = dict[key] ?? I18N.en[key] ?? key;
    Object.entries(vars).forEach(([name, replacement]) => {
      value = String(value).replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  }

  function previewCountLabel(count) {
    const n = Number(count) || 0;
    if (state.lang === "ru") return `${n} ${t("preview")}`;
    return `${n} ${n === 1 ? t("preview") : t("previews")}`;
  }

  function supportedFilterLabel(filter) {
    if (filter === "preview") return t("preview");
    if (filter === "no-preview") return t("noPreview");
    if (filter === "main") return "MAIN";
    if (filter === "alt") return "ALT";
    if (filter === "both") return "MAIN + ALT";
    return "";
  }

  function applyStaticLocale() {
    document.documentElement.lang = state.lang;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (key) node.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.dataset.i18nPlaceholder;
      if (key) node.setAttribute("placeholder", t(key));
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const key = node.dataset.i18nAria;
      if (key) node.setAttribute("aria-label", t(key));
    });

    if (el.languageButton) {
      const nextLang = state.lang === "ru" ? "en" : "ru";
      el.languageButton.textContent = nextLang.toUpperCase();
      el.languageButton.setAttribute("aria-label", state.lang === "ru" ? t("switchToEnglish") : t("switchToRussian"));
      el.languageButton.title = state.lang === "ru" ? t("switchToEnglish") : t("switchToRussian");
    }

    updateThemeButton();
  }

  function applyTheme(theme, persist = true) {
    state.theme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;

    if (el.themeColor) {
      el.themeColor.setAttribute("content", state.theme === "light" ? "#f4f2ed" : "#0b0b0b");
    }

    if (persist) {
      try { localStorage.setItem(THEME_KEY, state.theme); } catch {}
    }

    updateThemeButton();
  }

  function updateThemeButton() {
    if (!el.themeButton) return;
    const targetLabel = state.theme === "dark" ? t("lightTheme") : t("darkTheme");
    el.themeButton.textContent = "◐";
    el.themeButton.setAttribute("aria-label", `${t("switchTheme")}: ${targetLabel}`);
    el.themeButton.title = `${t("switchTheme")}: ${targetLabel}`;
  }

  function toggleTheme() {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  }

  function setLanguage(lang) {
    if (lang !== "ru" && lang !== "en") return;
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch {}

    applyStaticLocale();
    buildFilters();
    buildAlphabet();
    if (state.supportedIndex) buildSupportedFilters();

    if (state.mode === "visual") applyVisualFilters(true);
    else if (state.supportedIndex) applySupportedFilters(true);

    if (!el.utilityDrawer.hidden) renderDrawer();
    if (el.viewer.open && state.viewerStyle) renderViewer();
  }

  const toLocalPath = (path) => {
    if (!path) return "";
    return path.startsWith("/") ? `.${path}` : path;
  };

  const pad = (value, width = 6) => String(value).padStart(width, "0");
  const prettyNumber = (value) => Number(value || 0).toLocaleString("en-US");

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replaceAll("ё", "е")
      .trim();

  const normalizeStyleName = (value) => normalize(value).replace(/\s+/g, " ");

  const compactSearch = (value) =>
    normalizeStyleName(value)
      .replace(/^@+/, "")
      .replace(/[^\p{L}\p{N}]+/gu, "");

  const searchTokens = (value) =>
    normalizeStyleName(value)
      .replace(/^@+/, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);

  const compactDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(state.lang === "ru" ? "ru-RU" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(d);
  };

  const getLetter = (name) => {
    const raw = normalizeStyleName(name).replace(/^@+/, "").trim();
    const first = raw.charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : "#";
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function boundedLevenshtein(a, b, maxDistance) {
    if (a === b) return 0;
    if (!a || !b) return Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = current[0];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost,
        );
        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }
      if (rowMin > maxDistance) return maxDistance + 1;
      previous = current;
    }

    return previous[b.length];
  }

  function fuzzyThreshold(length) {
    if (length <= 4) return 1;
    if (length <= 8) return 2;
    if (length <= 14) return 3;
    return 4;
  }

  function fuzzyDistance(queryCompact, entry) {
    if (!queryCompact || queryCompact.length < 3) return null;
    const maxDistance = fuzzyThreshold(queryCompact.length);
    const candidates = [...entry.tokens, entry.compact];
    let best = maxDistance + 1;

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (Math.abs(candidate.length - queryCompact.length) > maxDistance) continue;
      if (candidate[0] !== queryCompact[0] && !candidate.includes(queryCompact.slice(0, 2))) continue;
      const distance = boundedLevenshtein(queryCompact, candidate, maxDistance);
      if (distance < best) best = distance;
      if (best === 0) break;
    }

    return best <= maxDistance ? best : null;
  }

  function makeNameIndex(name) {
    return {
      name,
      norm: normalizeStyleName(name),
      compact: compactSearch(name),
      tokens: searchTokens(name),
      letter: getLetter(name),
    };
  }

  function savePersistentState() {
    localStorage.setItem("style-archive:saved", JSON.stringify([...state.saved]));
    localStorage.setItem("style-archive:saved-at", JSON.stringify(
      [...state.savedAt.entries()].filter(([id]) => state.saved.has(id))
    ));
    localStorage.setItem("style-archive:tray", JSON.stringify(state.tray));
    localStorage.setItem("style-archive:recent", JSON.stringify(state.recent));
    updateUtilityCounts();
  }

  function updateUtilityCounts() {
    el.savedCount.textContent = state.saved.size;
    el.trayCount.textContent = state.tray.length;
    el.recentCount.textContent = state.recent.length;
    el.drawerTrayCount.textContent = state.tray.length;
    el.drawerRecentCount.textContent = state.recent.length;
  }

  function showToast(text) {
    window.clearTimeout(state.toastTimer);
    el.toast.textContent = text;
    el.toast.classList.add("show");
    state.toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), 1250);
  }

  async function copyValue(value, toast = null) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(toast || t("copied"));
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showToast(toast || t("copied"));
    }
  }

  function copyStyle(style) {
    if (!style) return;
    return copyValue(style.copy_value || style.name || "");
  }

  function findStyle(id) {
    return state.styleById.get(id);
  }

  function previewStyleForName(name) {
    return state.visualNameMap.get(normalizeStyleName(name)) || null;
  }

  function previewMetaForName(name) {
    return state.visualNameMeta.get(normalizeStyleName(name)) || null;
  }

  function buildVisualLookup() {
    state.styleById = new Map();
    state.visualNameMap = new Map();
    state.visualNameMeta = new Map();
    state.visualSearchIndex = new Map();
    state.archiveOrder = new Map();

    state.styles.forEach((style, index) => {
      state.styleById.set(style.id, style);
      state.archiveOrder.set(style.id, index);
      state.visualSearchIndex.set(style.id, makeNameIndex(style.name || style.copy_value || ""));

      const aliases = [...new Set([style.name, style.copy_value].filter(Boolean).map(normalizeStyleName))];
      aliases.forEach((key) => {
        if (!key) return;

        if (!state.visualNameMap.has(key)) state.visualNameMap.set(key, style);

        if (!state.visualNameMeta.has(key)) {
          state.visualNameMeta.set(key, {
            style,
            records: new Set(),
            mediaIds: new Set(),
            presets: new Map(),
            presetMedia: new Map(),
          });
        }

        const meta = state.visualNameMeta.get(key);
        meta.records.add(style.id);
        (style.media || []).forEach((mediaId) => meta.mediaIds.add(mediaId));

        (style.presets || []).forEach((preset) => {
          const presetKey = normalize(preset);
          if (!presetKey) return;
          if (!meta.presets.has(presetKey)) meta.presets.set(presetKey, preset);
          if (!meta.presetMedia.has(presetKey)) meta.presetMedia.set(presetKey, new Set());
          (style.media || []).forEach((mediaId) => meta.presetMedia.get(presetKey).add(mediaId));
        });
      });
    });
  }

  function toggleSaved(styleId) {
    const willSave = !state.saved.has(styleId);
    if (willSave) {
      state.saved.add(styleId);
      state.savedAt.set(styleId, Date.now());
    } else {
      state.saved.delete(styleId);
      state.savedAt.delete(styleId);
    }

    savePersistentState();
    showToast(t(willSave ? "savedToast" : "unsavedToast"));

    document.querySelectorAll("[data-save-id]").forEach((button) => {
      if (button.dataset.saveId !== styleId) return;
      const active = state.saved.has(styleId);
      button.classList.toggle("saved", active);
      button.textContent = active ? t("savedState") : t("save");
    });

    if (state.viewerStyle?.id === styleId) updateViewerActions();
    if (state.savedOnly) applyVisualFilters(true);
    if (state.drawerTab === "recent" && !el.utilityDrawer.hidden) renderRecent();
  }

  function trayKey(name) {
    return normalizeStyleName(name);
  }

  function isInTray(name) {
    const key = trayKey(name);
    return state.tray.some((item) => trayKey(item) === key);
  }

  function toggleTray(name) {
    if (!name) return;
    const key = trayKey(name);
    const index = state.tray.findIndex((item) => trayKey(item) === key);
    const willAdd = index < 0;

    if (!willAdd) state.tray.splice(index, 1);
    else state.tray.push(name);

    savePersistentState();
    showToast(t(willAdd ? "addedToast" : "removedToast"));
    updateVisibleTrayButtons();
    if (!el.utilityDrawer.hidden && state.drawerTab === "tray") renderTray();
    updateViewerActions();
  }

  function removeFromTray(name) {
    const key = trayKey(name);
    state.tray = state.tray.filter((item) => trayKey(item) !== key);
    savePersistentState();
    showToast(t("removedToast"));
    updateVisibleTrayButtons();
    renderTray();
    updateViewerActions();
  }

  function updateVisibleTrayButtons() {
    document.querySelectorAll("[data-tray-name]").forEach((button) => {
      const active = isInTray(button.dataset.trayName);
      button.classList.toggle("added", active);
      if (button.classList.contains("card-tray")) button.textContent = active ? t("added") : t("add");
      else if (button.classList.contains("supported-action")) button.textContent = active ? t("added") : t("add");
    });
  }

  function addRecent(styleId) {
    if (!styleId) return;
    state.recent = [styleId, ...state.recent.filter((id) => id !== styleId)]
      .filter((id) => state.styleById.has(id))
      .slice(0, RECENT_LIMIT);
    savePersistentState();
    if (!el.utilityDrawer.hidden && state.drawerTab === "recent") renderRecent();
  }

  function buildFilters() {
    const presets = new Map();

    state.styles.forEach((style) => {
      (style.presets || []).forEach((preset) => {
        const key = normalize(preset);
        if (key && !presets.has(key)) presets.set(key, preset);
      });
    });

    const items = [["all", t("all")], ...[...presets.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => [key, String(label).toUpperCase()])];

    el.filterList.innerHTML = items
      .map(([key, label]) => `<button class="filter-chip${key === "all" ? " active" : ""}" data-preset="${escapeHtml(key)}" type="button">${escapeHtml(label)}</button>`)
      .join("");
  }

  function buildAlphabet() {
    const letters = [{ key: "all", label: t("all") }, { key: "#", label: "#" }, ...[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => ({ key: letter, label: letter }))];
    el.alphabet.innerHTML = letters
      .map(({ key, label }) => {
        return `<button class="alphabet-button${key === state.supportedLetter ? " active" : ""}" data-letter="${key}" type="button">${label}</button>`;
      })
      .join("");
  }

  function hasMetaPreset(meta, preset) {
    return Boolean(meta?.presets?.has(normalize(preset)));
  }

  function supportedFilterMatch(entry, filter = state.supportedFilter) {
    const meta = previewMetaForName(entry.name);
    if (filter === "all") return true;
    if (filter === "preview") return Boolean(meta);
    if (filter === "no-preview") return !meta;
    if (filter === "main") return hasMetaPreset(meta, "main");
    if (filter === "alt") return hasMetaPreset(meta, "alt");
    if (filter === "both") return hasMetaPreset(meta, "main") && hasMetaPreset(meta, "alt");
    return true;
  }

  function buildSupportedFilters() {
    if (!state.supportedIndex) return;

    const counts = {
      all: state.supportedIndex.length,
      preview: 0,
      "no-preview": 0,
      main: 0,
      alt: 0,
      both: 0,
    };

    state.supportedIndex.forEach((entry) => {
      const meta = previewMetaForName(entry.name);
      if (meta) counts.preview += 1;
      else counts["no-preview"] += 1;
      if (hasMetaPreset(meta, "main")) counts.main += 1;
      if (hasMetaPreset(meta, "alt")) counts.alt += 1;
      if (hasMetaPreset(meta, "main") && hasMetaPreset(meta, "alt")) counts.both += 1;
    });

    const items = [
      ["all", t("all")],
      ["preview", t("preview")],
      ["no-preview", t("noPreview")],
      ["main", "MAIN"],
      ["alt", "ALT"],
      ["both", "MAIN + ALT"],
    ];

    el.supportedFilterList.innerHTML = items.map(([key, label]) => `
      <button class="supported-filter-chip${key === state.supportedFilter ? " active" : ""}" data-supported-filter="${key}" type="button">
        <span>${label}</span><small>${prettyNumber(counts[key])}</small>
      </button>
    `).join("");
  }

  async function loadSupported() {
    if (state.supported) return state.supported;
    if (state.supportedPromise) return state.supportedPromise;

    state.supportedPromise = fetch("./data/supported.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load supported styles");
        return response.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.styles || []);
        state.supported = rows
          .filter((name) => typeof name === "string" && name.trim())
          .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
        state.supportedIndex = state.supported.map(makeNameIndex);

        const count = state.supported.length;
        el.brandSupportedCount.textContent = pad(count);
        el.supportedStat.textContent = prettyNumber(count);
        buildSupportedFilters();
        return state.supported;
      })
      .catch((error) => {
        state.supportedPromise = null;
        console.error(error);
        showToast(t("dataError"));
        throw error;
      });

    return state.supportedPromise;
  }

  function visualSearchMatch(style, queryNorm, queryCompact) {
    if (!queryNorm) return { match: true, rank: 0 };

    const haystack = normalize([
      style.name,
      style.copy_value,
      ...(style.presets || []),
      ...(style.tags || []),
    ].join(" "));

    if (haystack.includes(queryNorm)) return { match: true, rank: 0 };

    const entry = state.visualSearchIndex.get(style.id);
    if (queryCompact && entry?.compact.includes(queryCompact)) return { match: true, rank: 1 };

    const distance = entry ? fuzzyDistance(queryCompact, entry) : null;
    if (distance !== null) return { match: true, rank: 10 + distance };

    return { match: false, rank: Infinity };
  }

  function sortVisualResults(rows, queryActive = false) {
    const result = [...rows];

    if (
      queryActive &&
      state.visualSort !== "danbooru-desc" &&
      state.visualSort !== "danbooru-asc"
    ) {
      result.sort((a, b) =>
        (a.rank - b.rank) ||
        ((state.archiveOrder.get(a.style.id) || 0) -
         (state.archiveOrder.get(b.style.id) || 0))
      );
      return result.map((row) => row.style);
    }

    const styles = result.map((row) => row.style);
    if (state.visualSort === "saved-newest") {
      return styles.sort((a, b) =>
        ((state.savedAt.get(b.id) || 0) - (state.savedAt.get(a.id) || 0)) ||
        ((state.archiveOrder.get(a.id) || 0) - (state.archiveOrder.get(b.id) || 0))
      );
    }
    if (state.visualSort === "saved-oldest") {
      return styles.sort((a, b) =>
        ((state.savedAt.get(a.id) || 0) - (state.savedAt.get(b.id) || 0)) ||
        ((state.archiveOrder.get(a.id) || 0) - (state.archiveOrder.get(b.id) || 0))
      );
    }
    if (state.visualSort === "danbooru-desc") {
      return styles.sort((a, b) =>
        (Number(b.danbooru_post_count || 0) - Number(a.danbooru_post_count || 0)) ||
        ((state.archiveOrder.get(a.id) || 0) - (state.archiveOrder.get(b.id) || 0))
      );
    }
    if (state.visualSort === "danbooru-asc") {
      return styles.sort((a, b) => {
        const av = Number(a.danbooru_post_count || 0);
        const bv = Number(b.danbooru_post_count || 0);

        if (!av && bv) return 1;
        if (av && !bv) return -1;

        return (av - bv) ||
          ((state.archiveOrder.get(a.id) || 0) - (state.archiveOrder.get(b.id) || 0));
      });
    }

    if (state.visualSort === "newest") {
      return styles.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    }
    if (state.visualSort === "oldest") {
      return styles.sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0));
    }
    if (state.visualSort === "az") {
      return styles.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }));
    }
    if (state.visualSort === "random") {
      return styles.sort((a, b) => hashString(`${state.randomSortSeed}:${a.id}`) - hashString(`${state.randomSortSeed}:${b.id}`));
    }
    return styles.sort((a, b) => (state.archiveOrder.get(a.id) || 0) - (state.archiveOrder.get(b.id) || 0));
  }

  function applyVisualFilters(reset = false) {
    const queryNorm = normalize(el.searchInput.value);
    const queryCompact = compactSearch(el.searchInput.value);
    const source = state.discoveryStyles || state.styles;
    const scored = [];

    source.forEach((style) => {
      if (state.savedOnly && !state.saved.has(style.id)) return;

      const danbooruRecord =
        window.STYLE_ARCHIVE_DANBOORU?.recordForName?.(
          style.copy_value || style.name
        ) || null;

      const danbooruMatched = danbooruRecord?.status === "matched";

      if (state.danbooruPresence === "on" && !danbooruMatched) return;
      if (state.danbooruPresence === "no-data" && danbooruMatched) return;

      if (
        state.danbooruMin > 0 &&
        Number(style?.danbooru_post_count || 0) < state.danbooruMin
      ) return;

      if (state.activePreset !== "all") {
        const presets = (style.presets || []).map(normalize);
        if (!presets.includes(state.activePreset)) return;
      }

      const search = visualSearchMatch(style, queryNorm, queryCompact);
      if (!search.match) return;
      scored.push({ style, rank: search.rank });
    });

    state.filtered = sortVisualResults(scored, Boolean(queryNorm));

    if (queryNorm) el.resultCount.textContent = previewCountLabel(state.filtered.length);
    else el.resultCount.textContent = `${state.filtered.length} / ${state.styles.length}`;

    el.statusLine.textContent = state.discoveryStyles
      ? `${t("discoverStatus")} / ${state.filtered.length}`
      : state.savedOnly
        ? `${t("savedStatus")} / ${state.filtered.length}`
        : `${t("visualIndex")} / ${state.filtered.length}`;

    if (reset) {
      state.rendered = 0;
      setupGalleryColumns(true);
    }

    if (el.visualEmptyState) el.visualEmptyState.hidden = state.filtered.length !== 0;
    renderVisualMore();

    if (queryNorm && !state.savedOnly) updateVisualSupportedMatches(queryNorm, queryCompact);
    else {
      el.searchSupported.hidden = true;
      el.searchSupportedList.innerHTML = "";
    }
  }

  function rankSupportedEntries(entries, queryNorm, queryCompact) {
    if (!queryNorm) return entries;

    const exact = [];
    const exactNames = new Set();

    entries.forEach((entry) => {
      if (entry.norm.includes(queryNorm) || (queryCompact && entry.compact.includes(queryCompact))) {
        exact.push(entry);
        exactNames.add(entry.name);
      }
    });

    if (!queryCompact || queryCompact.length < 3 || exact.length >= 80) return exact;

    const fuzzy = [];
    entries.forEach((entry) => {
      if (exactNames.has(entry.name)) return;
      const distance = fuzzyDistance(queryCompact, entry);
      if (distance === null) return;
      fuzzy.push({ entry, distance });
    });

    fuzzy.sort((a, b) => (a.distance - b.distance) || a.entry.name.localeCompare(b.entry.name, "en", { sensitivity: "base" }));
    return [...exact, ...fuzzy.slice(0, Math.max(0, 80 - exact.length)).map((row) => row.entry)];
  }

  async function updateVisualSupportedMatches(queryNorm, queryCompact) {
    try {
      await loadSupported();
      if (state.mode !== "visual" || normalize(el.searchInput.value) !== queryNorm) return;

      const ranked = rankSupportedEntries(state.supportedIndex, queryNorm, queryCompact);
      const additional = ranked.filter((entry) => !previewStyleForName(entry.name));

      if (!additional.length) {
        el.searchSupported.hidden = true;
        return;
      }

      el.searchSupported.hidden = false;
      el.searchSupportedTitle.textContent = t("moreSupportedMatches", { count: prettyNumber(additional.length) });
      el.searchSupportedList.innerHTML = additional
        .slice(0, VISUAL_SUPPORTED_PREVIEW_LIMIT)
        .map((entry, index) => supportedRowHtml(entry.name, index + 1, false))
        .join("");
      updateVisibleTrayButtons();
    } catch {
      el.searchSupported.hidden = true;
    }
  }

  function getColumnCount() {
    const width = window.innerWidth;
    if (width <= 390) return 1;
    if (width <= 680) return 2;
    if (width <= 980) return 3;
    if (width <= 1320) return 4;
    return 5;
  }

  function setupGalleryColumns(force = false) {
    const count = getColumnCount();
    if (!force && count === state.columnCount && state.columns.length) return;

    state.columnCount = count;
    el.gallery.style.setProperty("--gallery-cols", count);
    el.gallery.innerHTML = "";
    state.columns = [];

    for (let i = 0; i < count; i += 1) {
      const column = document.createElement("div");
      column.className = "gallery-column";
      el.gallery.appendChild(column);
      state.columns.push(column);
    }
  }

  function shortestColumn() {
    if (!state.columns.length) setupGalleryColumns(true);
    return state.columns.reduce((best, column) =>
      column.offsetHeight < best.offsetHeight ? column : best
    , state.columns[0]);
  }

  function renderVisualMore() {
    if (state.mode !== "visual" || state.rendered >= state.filtered.length) return;
    setupGalleryColumns();

    const slice = state.filtered.slice(state.rendered, state.rendered + VISUAL_PAGE_SIZE);

    slice.forEach((style) => {
      const archiveIndex = (state.archiveOrder.get(style.id) || 0) + 1;
      shortestColumn().appendChild(createCard(style, archiveIndex));
    });

    state.rendered += slice.length;
    updateVisibleTrayButtons();
  }

  function createCard(style, archiveIndex) {
    const card = document.createElement("article");
    card.className = "card";

    const firstMediaId = (style.media || [])[0];
    const media = state.media[firstMediaId] || {};
    const thumb = toLocalPath(media.thumb || media.src || "");
    const imageCount = (style.media || []).length;
    const saved = state.saved.has(style.id);
    const trayName = style.copy_value || style.name || "";

    const mediaWidth = Number(media.width) || 0;
    const mediaHeight = Number(media.height) || 0;
    const ratioStyle = mediaWidth > 0 && mediaHeight > 0
      ? ` style="aspect-ratio:${mediaWidth}/${mediaHeight}"`
      : "";
    const sizeAttrs = mediaWidth > 0 && mediaHeight > 0
      ? ` width="${mediaWidth}" height="${mediaHeight}"`
      : "";

    card.innerHTML = `
      <div class="card-media" data-open-id="${escapeHtml(style.id)}"${ratioStyle}>
        ${thumb ? `<img src="${escapeAttr(thumb)}"${sizeAttrs} loading="lazy" decoding="async" alt="${escapeAttr(style.name || t("styleAlt"))}">` : ""}
        ${imageCount > 1 ? `<span class="card-image-count">×${imageCount}</span>` : ""}
      </div>
      <div class="card-bottom">
        <div class="card-index">
          <span>#${pad(archiveIndex)}</span>
          <span class="card-inline-actions">
            <button class="card-tray" data-tray-name="${escapeAttr(trayName)}" type="button">${t("add")}</button>
            <button class="card-save${saved ? " saved" : ""}" data-save-id="${escapeHtml(style.id)}" type="button">${saved ? t("savedState") : t("save")}</button>
          </span>
        </div>
        <button class="card-name" data-copy-id="${escapeHtml(style.id)}" type="button">${escapeHtml(style.name || t("untitled"))}</button>
        <div class="card-meta">
          ${(style.presets || []).map((p) => `<span>${escapeHtml(p)}</span>`).join("")}
          ${imageCount ? `<span>${previewCountLabel(imageCount)}</span>` : ""}
          ${style.published_at ? `<span>${escapeHtml(compactDate(style.published_at))}</span>` : ""}
        </div>
      </div>
    `;

    const img = card.querySelector("img");
    if (img) {
      if (img.complete) img.classList.add("loaded");
      else img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    }

    return card;
  }

  function presetSummaryHtml(meta) {
    if (!meta) return "";
    const priority = ["main", "alt"];
    const keys = [...meta.presets.keys()].sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return a.localeCompare(b);
    });

    return keys.map((key) => {
      const label = String(meta.presets.get(key) || key).toUpperCase();
      const count = meta.presetMedia.get(key)?.size || 0;
      return `<span class="supported-preset">${escapeHtml(label)}${count ? ` ×${count}` : ""}</span>`;
    }).join("");
  }

  function supportedRowHtml(name, index, showNumber = true) {
    const previewMeta = previewMetaForName(name);
    const preview = previewMeta?.style || null;
    const trayAdded = isInTray(name);

    return `
      <div class="supported-row${preview ? " has-preview" : ""}">
        <button class="supported-name" data-supported-copy="${escapeAttr(name)}" type="button">${escapeHtml(name)}</button>
        <div class="supported-actions">
          ${showNumber ? `<span class="supported-number">${pad(index)}</span>` : ""}
          ${preview ? `<span class="supported-presets" aria-label="${escapeAttr(t("availablePreviewPresets"))}">${presetSummaryHtml(previewMeta)}</span>` : ""}
          ${preview ? `<button class="supported-action preview" data-preview-id="${escapeAttr(preview.id)}" type="button">${t("preview")} ×${previewMeta.mediaIds.size}</button>` : ""}
          <button class="supported-action${trayAdded ? " added" : ""}" data-tray-name="${escapeAttr(name)}" type="button">${trayAdded ? t("added") : t("add")}</button>
          <button class="supported-action" data-supported-copy="${escapeAttr(name)}" type="button">${t("copy")}</button>
        </div>
      </div>
    `;
  }

  function supportedDanbooruCount(entry) {
    const local = Number(entry?.danbooru_post_count || 0);
    if (local > 0) return local;

    const external = Number(
      window.STYLE_ARCHIVE_DANBOORU?.countForName?.(entry?.name) || 0
    );
    return Number.isFinite(external) ? external : 0;
  }

  function syncSupportedSortControls() {
    if (!el.supportedSortList) return;
    el.supportedSortList.querySelectorAll("[data-supported-sort]").forEach((button) => {
      button.classList.toggle("active", button.dataset.supportedSort === state.supportedSort);
    });
  }

  function applySupportedFilters(reset = false) {
    if (!state.supportedIndex) return;

    const queryNorm = normalizeStyleName(el.searchInput.value);
    const queryCompact = compactSearch(el.searchInput.value);

    let base = state.supportedIndex.filter((entry) => {
      if (state.supportedLetter !== "all" && entry.letter !== state.supportedLetter) return false;
      if (!supportedFilterMatch(entry)) return false;

      const record =
        window.STYLE_ARCHIVE_DANBOORU?.recordForName?.(entry.name) || null;

      const matched = record?.status === "matched";

      if (state.supportedDanbooruPresence === "on" && !matched) return false;
      if (state.supportedDanbooruPresence === "no-data" && matched) return false;

      return true;
    });

    let rankedSupported = rankSupportedEntries(base, queryNorm, queryCompact);

    if (state.supportedSort === "danbooru-desc") {
      rankedSupported = [...rankedSupported].sort((a, b) =>
        (supportedDanbooruCount(b) - supportedDanbooruCount(a)) ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );
    } else if (state.supportedSort === "danbooru-asc") {
      rankedSupported = [...rankedSupported].sort((a, b) => {
        const av = supportedDanbooruCount(a);
        const bv = supportedDanbooruCount(b);

        if (!av && bv) return 1;
        if (av && !bv) return -1;

        return (av - bv) ||
          a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      });
    }

    state.supportedFiltered = rankedSupported;

    el.resultCount.textContent = `${prettyNumber(state.supportedFiltered.length)} ${t("matches")}`;
    const rawFilterLabel = supportedFilterLabel(state.supportedFilter);
    const filterLabel = rawFilterLabel ? ` / ${rawFilterLabel}` : "";
    const supportedSortLabel =
      state.supportedSort === "danbooru-desc"
        ? " / DANBOORU ↓"
        : state.supportedSort === "danbooru-asc"
          ? " / DANBOORU ↑"
          : "";
    el.supportedStatusLine.textContent = queryNorm
      ? `${t("supportedSearch")}${filterLabel}${supportedSortLabel} / ${prettyNumber(state.supportedFiltered.length)}`
      : state.supportedLetter === "all"
        ? `${t("supportedIndex")}${filterLabel}${supportedSortLabel} / ${prettyNumber(state.supportedFiltered.length)}`
        : `${state.supportedLetter}${filterLabel}${supportedSortLabel} / ${prettyNumber(state.supportedFiltered.length)}`;

    if (reset) {
      state.supportedRendered = 0;
      state.supportedLastLetter = "";
      el.supportedList.innerHTML = "";
    }

    if (el.supportedEmptyState) el.supportedEmptyState.hidden = state.supportedFiltered.length !== 0;
    renderSupportedMore();
  }

  function renderSupportedMore() {
    if (state.mode !== "supported" || state.supportedRendered >= state.supportedFiltered.length) return;

    const start = state.supportedRendered;
    const slice = state.supportedFiltered.slice(start, start + SUPPORTED_PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    slice.forEach((entry, localIndex) => {
      const letter = entry.letter;
      if (state.supportedSort === "az" && letter !== state.supportedLastLetter) {
        const heading = document.createElement("div");
        heading.className = "supported-letter";
        heading.textContent = letter;
        fragment.appendChild(heading);
        state.supportedLastLetter = letter;
      }

      const wrap = document.createElement("div");
      wrap.innerHTML = supportedRowHtml(entry.name, start + localIndex + 1, true).trim();
      fragment.appendChild(wrap.firstElementChild);
    });

    el.supportedList.appendChild(fragment);
    state.supportedRendered += slice.length;
    updateVisibleTrayButtons();
  }

  async function setMode(mode) {
    if (mode !== "visual" && mode !== "supported") return;
    state.mode = mode;

    el.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
    el.visualShell.hidden = mode !== "visual";
    el.supportedShell.hidden = mode !== "supported";
    el.visualFilters.hidden = mode !== "visual";
    el.supportedTools.hidden = mode !== "supported";

    if (mode === "visual") {
      applyVisualFilters(true);
      return;
    }

    el.supportedStatusLine.textContent = t("loadingSupportedIndex");
    if (el.supportedErrorState) el.supportedErrorState.hidden = true;
    try {
      await loadSupported();
      buildAlphabet();
      buildSupportedFilters();
      syncSupportedSortControls();
      applySupportedFilters(true);
    } catch {
      el.supportedStatusLine.textContent = t("dataError");
      if (el.supportedEmptyState) el.supportedEmptyState.hidden = true;
      if (el.supportedErrorState) el.supportedErrorState.hidden = false;
    }
  }

  function openViewer(style) {
    if (!style) return;
    state.viewerStyle = style;
    state.viewerMediaIndex = 0;
    addRecent(style.id);
    document.body.classList.add("viewer-open");
    if (!el.viewer.open) el.viewer.showModal();
    renderViewer();
  }

  function closeViewer() {
    if (el.viewer.open) el.viewer.close();
    state.viewerStyle = null;
    el.viewerImage.removeAttribute("src");
    el.viewerImage.alt = "";
    document.body.classList.remove("viewer-open");
  }

  function relatedStyles(style) {
    if (state.relatedCache.has(style.id)) return state.relatedCache.get(style.id);
    const presets = new Set((style.presets || []).map(normalize));
    const candidates = state.styles.filter((other) => {
      if (other.id === style.id || normalizeStyleName(other.name) === normalizeStyleName(style.name)) return false;
      return (other.presets || []).some((preset) => presets.has(normalize(preset)));
    });
    candidates.sort((a, b) => hashString(`${style.id}:${a.id}`) - hashString(`${style.id}:${b.id}`));
    const result = candidates.slice(0, 4);
    state.relatedCache.set(style.id, result);
    return result;
  }

  function renderViewerRelated(style) {
    const related = relatedStyles(style);
    if (!related.length) {
      el.viewerRelated.hidden = true;
      el.viewerRelatedList.innerHTML = "";
      return;
    }
    el.viewerRelated.hidden = false;
    el.viewerRelatedList.innerHTML = related
      .map((item) => `<button class="viewer-related-item" data-related-id="${escapeAttr(item.id)}" type="button">${escapeHtml(item.name)}</button>`)
      .join("");
  }

  function renderViewer() {
    const style = state.viewerStyle;
    if (!style) return;

    const mediaIds = style.media || [];
    const index = Math.min(state.viewerMediaIndex, Math.max(0, mediaIds.length - 1));
    state.viewerMediaIndex = index;

    const media = state.media[mediaIds[index]] || {};
    const src = toLocalPath(media.src || media.thumb || "");
    const archiveIndex = (state.archiveOrder.get(style.id) || 0) + 1;

    el.viewerIndex.textContent = `#${pad(archiveIndex)} / ${pad(state.styles.length)}`;
    el.viewerImage.src = src;
    el.viewerImage.alt = style.name || t("styleAlt");
    el.viewerName.textContent = style.name || t("untitled");
    el.viewerPreset.textContent = (style.presets || []).join(" / ").toUpperCase();
    el.viewerDate.textContent = compactDate(style.published_at);
    el.viewerImageCount.textContent = mediaIds.length ? `${previewCountLabel(mediaIds.length)}${mediaIds.length > 1 ? ` · ${index + 1}/${mediaIds.length}` : ""}` : "";

    const multiple = mediaIds.length > 1;
    el.prevMedia.hidden = !multiple;
    el.nextMedia.hidden = !multiple;
    updateViewerActions();
    renderViewerRelated(style);
  }

  function updateViewerActions() {
    const style = state.viewerStyle;
    if (!style) return;

    const saved = state.saved.has(style.id);
    el.viewerSave.classList.toggle("saved", saved);
    el.viewerSave.textContent = saved ? t("savedState") : t("save");

    const name = style.copy_value || style.name || "";
    const added = isInTray(name);
    el.viewerTray.classList.toggle("added", added);
    el.viewerTray.textContent = added ? t("added") : t("add");
  }

  function shiftViewerMedia(delta) {
    const style = state.viewerStyle;
    if (!style) return;
    const count = (style.media || []).length;
    if (count < 2) return;
    state.viewerMediaIndex = (state.viewerMediaIndex + delta + count) % count;
    renderViewer();
  }

  function randomPool(mode) {
    if (mode === "main") return state.styles.filter((style) => (style.presets || []).map(normalize).includes("main"));
    if (mode === "alt") return state.styles.filter((style) => (style.presets || []).map(normalize).includes("alt"));
    if (mode === "saved") return state.styles.filter((style) => state.saved.has(style.id));
    return state.styles;
  }

  function randomStyle(mode = "any") {
    const pool = randomPool(mode);
    if (!pool.length) {
      showToast(t("empty"));
      return;
    }
    openViewer(pool[Math.floor(Math.random() * pool.length)]);
  }

  async function discoverStyles() {
    if (state.mode !== "visual") await setMode("visual");
    const pool = [...state.styles];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    state.discoveryStyles = pool.slice(0, 12);
    state.savedOnly = false;
    state.activePreset = "all";
    state.visualSort = "archive";
    el.searchInput.value = "";
    syncVisualControls();
    applyVisualFilters(true);
    window.scrollTo({ top: el.visualShell.offsetTop - 150, behavior: "smooth" });
  }

  function syncVisualControls() {
    if (!state.savedOnly && (state.visualSort === "saved-newest" || state.visualSort === "saved-oldest")) {
      state.visualSort = "archive";
    }

    el.filterList.querySelectorAll("[data-preset]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.preset === state.activePreset);
    });

    el.sortList.querySelectorAll(".saved-sort-chip").forEach((chip) => {
      chip.hidden = !state.savedOnly;
    });

    el.sortList.querySelectorAll("[data-sort]").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.sort === state.visualSort);
    });
  }

  function clearVisualFilters() {
    el.searchInput.value = "";
    state.activePreset = "all";
    state.visualSort = "archive";
    state.danbooruMin = 0;
    state.danbooruPresence = "all";
    state.savedOnly = false;
    state.discoveryStyles = null;
    syncVisualControls();
    applyVisualFilters(true);
  }

  function clearSupportedFilters() {
    el.searchInput.value = "";
    state.supportedLetter = "all";
    state.supportedFilter = "all";
    state.supportedSort = "az";
    state.supportedDanbooruPresence = "all";
    syncSupportedSortControls();
    buildAlphabet();
    buildSupportedFilters();
    applySupportedFilters(true);
  }

  function openDrawer(tab = "tray") {
    state.drawerTab = tab;
    el.utilityDrawer.hidden = false;
    el.drawerBackdrop.hidden = false;
    document.body.classList.add("drawer-open");
    renderDrawer();
  }

  function closeDrawer() {
    el.utilityDrawer.hidden = true;
    el.drawerBackdrop.hidden = true;
    document.body.classList.remove("drawer-open");
  }

  function renderDrawer() {
    el.drawerTabs.forEach((button) => button.classList.toggle("active", button.dataset.drawerTab === state.drawerTab));
    el.trayPanel.hidden = state.drawerTab !== "tray";
    el.recentPanel.hidden = state.drawerTab !== "recent";
    if (state.drawerTab === "tray") renderTray();
    else renderRecent();
  }

  function drawerPresetText(meta) {
    if (!meta) return t("supportedGeneric");
    const labels = [...meta.presets.values()].map((value) => String(value).toUpperCase());
    return labels.length ? labels.join(" / ") : t("preview");
  }

  function renderTray() {
    if (!state.tray.length) {
      el.trayList.innerHTML = `<div class="drawer-empty">${escapeHtml(t("trayEmpty"))}</div>`;
      return;
    }

    el.trayList.innerHTML = state.tray.map((name, index) => {
      const meta = previewMetaForName(name);
      const preview = meta?.style;
      return `
        <div class="drawer-row${preview ? " has-preview" : ""}">
          <span class="drawer-index">${pad(index + 1, 2)}</span>
          <div class="drawer-row-main">
            <button class="drawer-name" data-drawer-copy="${escapeAttr(name)}" type="button">${escapeHtml(name)}</button>
            <span class="drawer-meta">${escapeHtml(drawerPresetText(meta))}${meta ? ` · ${escapeHtml(previewCountLabel(meta.mediaIds.size))}` : ""}</span>
          </div>
          <div class="drawer-row-actions">
            ${preview ? `<button data-drawer-preview="${escapeAttr(preview.id)}" type="button">${t("preview")}</button>` : ""}
            <button data-tray-remove="${escapeAttr(name)}" type="button">×</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderRecent() {
    const rows = state.recent.map(findStyle).filter(Boolean);
    if (!rows.length) {
      el.recentList.innerHTML = `<div class="drawer-empty">${escapeHtml(t("recentEmpty"))}</div>`;
      return;
    }

    el.recentList.innerHTML = rows.map((style, index) => {
      const firstMedia = state.media[(style.media || [])[0]] || {};
      const thumb = toLocalPath(firstMedia.thumb || firstMedia.src || "");
      const name = style.copy_value || style.name || "";
      return `
        <div class="recent-row">
          <button class="recent-thumb" data-drawer-preview="${escapeAttr(style.id)}" type="button">
            ${thumb ? `<img src="${escapeAttr(thumb)}" loading="lazy" decoding="async" alt="">` : ""}
          </button>
          <div class="drawer-row-main">
            <button class="drawer-name" data-drawer-copy="${escapeAttr(name)}" type="button">${escapeHtml(style.name || name)}</button>
            <span class="drawer-meta">${escapeHtml((style.presets || []).join(" / ").toUpperCase())}</span>
          </div>
          <div class="drawer-row-actions">
            <button class="${isInTray(name) ? "added" : ""}" data-tray-name="${escapeAttr(name)}" type="button">${isInTray(name) ? t("added") : t("add")}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function bindSupportedListEvents(node) {
    node.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-preview-id]");
      if (preview) {
        openViewer(findStyle(preview.dataset.previewId));
        return;
      }

      const tray = event.target.closest("[data-tray-name]");
      if (tray) {
        toggleTray(tray.dataset.trayName);
        return;
      }

      const copy = event.target.closest("[data-supported-copy]");
      if (copy) copyValue(copy.dataset.supportedCopy);
    });
  }

  function bindEvents() {
    let searchTimer;

    el.searchInput.addEventListener("input", () => {
      state.discoveryStyles = null;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        if (state.mode === "visual") applyVisualFilters(true);
        else {
          state.supportedLetter = "all";
          buildAlphabet();
          applySupportedFilters(true);
        }
      }, 110);
    });

    el.filterList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-preset]");
      if (!button) return;
      state.discoveryStyles = null;
      state.activePreset = button.dataset.preset;
      state.savedOnly = false;
      syncVisualControls();
      applyVisualFilters(true);
    });

    el.sortList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sort]");
      if (!button) return;
      state.visualSort = button.dataset.sort;
      if (state.visualSort === "random") state.randomSortSeed = Date.now() + Math.random();
      syncVisualControls();
      applyVisualFilters(true);
    });

    el.supportedFilterList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-supported-filter]");
      if (!button || !state.supportedIndex) return;
      state.supportedFilter = button.dataset.supportedFilter;
      buildSupportedFilters();
      applySupportedFilters(true);
    });

    el.supportedSortList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-supported-sort]");
      if (!button || button.disabled || !state.supportedIndex) return;

      state.supportedSort = button.dataset.supportedSort;
      syncSupportedSortControls();
      applySupportedFilters(true);
    });

    el.alphabet.addEventListener("click", (event) => {
      const button = event.target.closest("[data-letter]");
      if (!button || !state.supportedIndex) return;
      state.supportedLetter = button.dataset.letter;
      el.alphabet.querySelectorAll(".alphabet-button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      applySupportedFilters(true);
      window.scrollTo({ top: el.supportedShell.offsetTop - 150, behavior: "smooth" });
    });

    el.modeTabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

    el.gallery.addEventListener("click", (event) => {
      const copy = event.target.closest("[data-copy-id]");
      if (copy) {
        copyStyle(findStyle(copy.dataset.copyId));
        return;
      }

      const tray = event.target.closest("[data-tray-name]");
      if (tray) {
        toggleTray(tray.dataset.trayName);
        return;
      }

      const save = event.target.closest("[data-save-id]");
      if (save) {
        toggleSaved(save.dataset.saveId);
        return;
      }

      const open = event.target.closest("[data-open-id]");
      if (open) openViewer(findStyle(open.dataset.openId));
    });

    bindSupportedListEvents(el.supportedList);
    bindSupportedListEvents(el.searchSupportedList);

    el.clearButton.addEventListener("click", clearVisualFilters);
    el.supportedClearButton.addEventListener("click", clearSupportedFilters);
    el.visualEmptyReset?.addEventListener("click", clearVisualFilters);
    el.supportedEmptyReset?.addEventListener("click", clearSupportedFilters);
    el.retryArchiveButton?.addEventListener("click", () => window.location.reload());
    el.retrySupportedButton?.addEventListener("click", async () => {
      state.supported = null;
      state.supportedIndex = null;
      state.supportedPromise = null;
      if (el.supportedErrorState) el.supportedErrorState.hidden = true;
      await setMode("supported");
    });

    el.randomButton.addEventListener("click", (event) => {
      event.stopPropagation();
      el.randomMenu.hidden = !el.randomMenu.hidden;
    });
    el.randomMenu.addEventListener("click", (event) => {
      const button = event.target.closest("[data-random-mode]");
      if (!button) return;
      el.randomMenu.hidden = true;
      randomStyle(button.dataset.randomMode);
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".random-wrap")) el.randomMenu.hidden = true;
    });

    el.themeButton?.addEventListener("click", toggleTheme);
    el.languageButton?.addEventListener("click", () => {
      setLanguage(state.lang === "ru" ? "en" : "ru");
    });

    el.discoverButton?.addEventListener("click", discoverStyles);

    el.infoButton?.addEventListener("click", () => {
      if (el.infoVisualCount) el.infoVisualCount.textContent = el.visualStat?.textContent || "—";
      if (el.infoSupportedCount) el.infoSupportedCount.textContent = el.supportedStat?.textContent || "—";
      el.infoDialog?.showModal();
    });
    el.closeInfo?.addEventListener("click", () => el.infoDialog?.close());
    el.infoDialog?.addEventListener("click", (event) => {
      if (event.target === el.infoDialog) el.infoDialog.close();
    });

    el.trayButton.addEventListener("click", () => openDrawer("tray"));
    el.recentButton.addEventListener("click", () => openDrawer("recent"));

    el.savedButton.addEventListener("click", async () => {
      if (state.mode !== "visual") await setMode("visual");
      state.discoveryStyles = null;

      const enteringSaved = !state.savedOnly;
      state.savedOnly = enteringSaved;
      state.activePreset = "all";

      if (enteringSaved) {
        state.visualSort = "saved-newest";
      } else if (state.visualSort === "saved-newest" || state.visualSort === "saved-oldest") {
        state.visualSort = "archive";
      }

      syncVisualControls();
      applyVisualFilters(true);
    });

    el.showAllSupportedResults.addEventListener("click", async () => {
      await setMode("supported");
      window.scrollTo({ top: el.supportedShell.offsetTop - 150, behavior: "smooth" });
    });

    el.drawerTabs.forEach((button) => button.addEventListener("click", () => {
      state.drawerTab = button.dataset.drawerTab;
      renderDrawer();
    }));
    el.closeDrawer.addEventListener("click", closeDrawer);
    el.drawerBackdrop.addEventListener("click", closeDrawer);
    el.copyTrayButton.addEventListener("click", () => {
      if (!state.tray.length) {
        showToast(t("trayEmptyToast"));
        return;
      }
      copyValue(state.tray.join(", "), t("allCopied"));
    });
    el.clearTrayButton.addEventListener("click", () => {
      state.tray = [];
      savePersistentState();
      updateVisibleTrayButtons();
      renderTray();
      updateViewerActions();
      showToast(t("cleared"));
    });
    el.clearRecentButton.addEventListener("click", () => {
      state.recent = [];
      savePersistentState();
      renderRecent();
      showToast(t("cleared"));
    });

    el.utilityDrawer.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-drawer-preview]");
      if (preview) {
        openViewer(findStyle(preview.dataset.drawerPreview));
        return;
      }
      const copy = event.target.closest("[data-drawer-copy]");
      if (copy) {
        copyValue(copy.dataset.drawerCopy);
        return;
      }
      const remove = event.target.closest("[data-tray-remove]");
      if (remove) {
        removeFromTray(remove.dataset.trayRemove);
        return;
      }
      const tray = event.target.closest("[data-tray-name]");
      if (tray) toggleTray(tray.dataset.trayName);
    });

    el.closeViewer.addEventListener("click", closeViewer);
    el.viewer.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeViewer();
    });
    el.viewer.addEventListener("click", (event) => {
      if (event.target === el.viewer) closeViewer();
    });
    el.viewerName.addEventListener("click", () => copyStyle(state.viewerStyle));
    el.viewerSave.addEventListener("click", () => {
      if (state.viewerStyle) toggleSaved(state.viewerStyle.id);
    });
    el.viewerTray.addEventListener("click", () => {
      const style = state.viewerStyle;
      if (style) toggleTray(style.copy_value || style.name || "");
    });
    el.prevMedia.addEventListener("click", () => shiftViewerMedia(-1));
    el.nextMedia.addEventListener("click", () => shiftViewerMedia(1));
    el.viewerRelatedList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-related-id]");
      if (button) openViewer(findStyle(button.dataset.relatedId));
    });

    document.addEventListener("keydown", (event) => {
      const activeTag = document.activeElement?.tagName || "";
      const typing = /INPUT|TEXTAREA|SELECT/.test(activeTag) || document.activeElement?.isContentEditable;

      if (event.key === "Escape") {
        el.randomMenu.hidden = true;
        if (el.infoDialog?.open) {
          event.preventDefault();
          el.infoDialog.close();
          return;
        }
        if (!el.utilityDrawer.hidden) {
          event.preventDefault();
          closeDrawer();
          return;
        }
        if (el.viewer.open) {
          event.preventDefault();
          closeViewer();
          return;
        }
      }

      if (typing) return;

      if (event.key === "/") {
        event.preventDefault();
        el.searchInput.focus();
        return;
      }

      if ((event.key === "r" || event.key === "R") && !el.viewer.open && !el.infoDialog?.open && el.utilityDrawer.hidden) {
        event.preventDefault();
        randomStyle("any");
        return;
      }

      if (el.viewer.open) {
        if (event.key === "ArrowLeft") { event.preventDefault(); shiftViewerMedia(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); shiftViewerMedia(1); }
        if (event.key === "c" || event.key === "C") { event.preventDefault(); copyStyle(state.viewerStyle); }
      }
    });

    const visualObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) renderVisualMore();
    }, { rootMargin: "700px 0px" });
    visualObserver.observe(el.sentinel);

    const supportedObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) renderSupportedMore();
    }, { rootMargin: "900px 0px" });
    supportedObserver.observe(el.supportedSentinel);

    let resizeTimer;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const nextCount = getColumnCount();
        if (nextCount === state.columnCount || state.mode !== "visual") return;

        const keepRendered = state.rendered;
        state.rendered = 0;
        setupGalleryColumns(true);
        while (state.rendered < keepRendered && state.rendered < state.filtered.length) renderVisualMore();
      }, 160);
    });
  }

  async function init() {
    applyTheme(state.theme, false);
    applyStaticLocale();
    if (el.archiveSkeleton) el.archiveSkeleton.hidden = false;
    if (el.archiveErrorState) el.archiveErrorState.hidden = true;
    if (el.visualEmptyState) el.visualEmptyState.hidden = true;

    try {
      const [stylesResponse, mediaResponse] = await Promise.all([
        fetch("./data/styles.json"),
        fetch("./data/media.json"),
      ]);

      if (!stylesResponse.ok || !mediaResponse.ok) throw new Error("Could not load archive data");

      state.styles = await stylesResponse.json();
      state.media = await mediaResponse.json();
      if (el.archiveSkeleton) el.archiveSkeleton.hidden = true;
      buildVisualLookup();
      state.recent = state.recent.filter((id) => state.styleById.has(id)).slice(0, RECENT_LIMIT);

      const visualCount = state.styles.length;
      el.brandVisualCount.textContent = pad(visualCount);
      el.visualStat.textContent = prettyNumber(visualCount);
      el.brandSupportedCount.textContent = pad(SUPPORTED_TOTAL_FALLBACK);
      el.supportedStat.textContent = prettyNumber(SUPPORTED_TOTAL_FALLBACK);

      buildFilters();
      buildAlphabet();
      bindEvents();
      updateUtilityCounts();
      savePersistentState();
      syncVisualControls();
      applyVisualFilters(true);
    } catch (error) {
      console.error(error);
      if (el.archiveSkeleton) el.archiveSkeleton.hidden = true;
      if (el.visualEmptyState) el.visualEmptyState.hidden = true;
      if (el.archiveErrorState) el.archiveErrorState.hidden = false;
      el.statusLine.textContent = t("archiveDataError");
      el.gallery.innerHTML = "";
    }
  }

  window.STYLE_ARCHIVE_V003 = {
    state,
    applyVisualFilters,
    applySupportedFilters,
    syncVisualControls,
    syncSupportedSortControls
  };

  // V003_DANBOORU_UI
  // V003_SUPPORTED_DANBOORU_SORT
  init();
})();
