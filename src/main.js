/*
 * Точка входа сайта. Пока подключает прежний код по порядку, в котором
 * его раньше грузил index.html: порядок важен, поздние слои дополняют ранние.
 * Дальше слои сливаются в нормальные модули (см. docs/CLEAN-SLATE.md).
 */

// Шрифты (самохостинг через npm, только нужные начертания; подмножества подгружаются по кириллице/латинице)
import "@fontsource-variable/geologica/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

// Стили (порядок каскада сохранён)
import "./css/style.css";
import "./css/archives-v004.css";
import "./css/archive-polish-v004.css";
import "./css/search-discovery-v004.css";
import "./css/search-quality-lite-v004.css";
import "./css/grid-density-v004.css";
import "./css/command-search-v004.css";
import "./css/mobile.css";
import "./css/info-v004.css";
import "./css/usability-v005.css";
import "./css/winter-v005.css";
import "./css/mix-dock-v006.css";
import "./css/workspace-v006.css";
import "./css/prompt-parse-v007.css";
import "./css/scroll-lock-v009.css";
import "./css/section-switch-v008.css";

// Скрипты
import "./legacy/grid-density-v004.js";
import "./archives.js";
import "./legacy/fresh-v006.js";
import "./legacy/app.js";
import "./legacy/danbooru-v003.js";
import "./legacy/qol-v003.js";
import "./legacy/search-v004.js";
import "./legacy/search-discovery-v004.js";
import "./legacy/search-quality-lite-v004.js";
import "./legacy/command-search-v004.js";
import "./features/style-links.js";
import "./features/zero-results.js";
import "./features/discover.js";
import "./legacy/saved-new-tab-v004.js";
import "./legacy/locale-ru-v004.js";
import "./legacy/info-v004.js";
import "./legacy/usability-v005.js";
import "./legacy/mix-dock-v006.js";
import "./legacy/restore-v006.js";
import "./legacy/prompt-parse-v007.js";
import "./legacy/scroll-lock-v009.js";
