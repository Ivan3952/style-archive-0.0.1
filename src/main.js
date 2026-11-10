/*
 * Точка входа сайта. Пока подключает прежний код по порядку, в котором
 * его раньше грузил index.html: порядок важен, поздние слои дополняют ранние.
 * Дальше слои сливаются в нормальные модули (см. docs/CLEAN-SLATE.md).
 */

// Стили (порядок каскада сохранён)
import "./css/style.css";
import "./css/archives-v004.css";
import "./css/archive-polish-v004.css";
import "./css/search-discovery-v004.css";
import "./css/search-quality-lite-v004.css";
import "./css/grid-density-v004.css";
import "./css/command-search-v004.css";
import "./css/final-polish-v004.css";
import "./css/final-polish-fix-v004.css";
import "./css/info-v004.css";

// Скрипты
import "./legacy/grid-density-v004.js";
import "./archives.js";
import "./legacy/app.js";
import "./legacy/danbooru-v003.js";
import "./legacy/qol-v003.js";
import "./legacy/search-v004.js";
import "./legacy/search-discovery-v004.js";
import "./legacy/search-quality-lite-v004.js";
import "./legacy/command-search-v004.js";
import "./legacy/final-polish-v004.js";
import "./legacy/final-polish-fix-v004.js";
import "./legacy/saved-new-tab-v004.js";
import "./legacy/locale-ru-v004.js";
import "./legacy/info-v004.js";
