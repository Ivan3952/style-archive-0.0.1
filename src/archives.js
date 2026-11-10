/*
 * Архивы (AM / OPUS / SKY): список, переключатель и маршрутизация запросов данных.
 *
 * Единственный источник правды: data/archives.json. Здесь нет ни одного
 * жёстко прописанного архива или счётчика; добавить архив = добавить запись в JSON.
 *
 * Старый код сайта запрашивает ./data/styles.json, ./data/media.json и
 * ./data/supported.json. fetch перехватывается и перенаправляется на файлы
 * выбранного архива. Публичный API для остальных модулей: window.STYLE_ARCHIVE_ARCHIVES_V004.
 */
import config from "../data/archives.json";

const STORAGE_KEY = "style-archive:archive-v004";

const ARCHIVES = Object.fromEntries(
  Object.entries(config.archives).map(([key, archive]) => [
    key,
    {
      key,
      label: archive.label,
      styles: archive.styles,
      media: archive.media,
      supported: archive.supported ?? null,
      recordCount: archive.visualCount ?? null, // записей в файле стилей
      styleCount: archive.uniqueCount ?? archive.visualCount ?? null, // стилей, которые видит посетитель
      supportedCount: archive.supportedCount ?? null,
    },
  ])
);

const isArchive = (value) => Boolean(value) && Object.hasOwn(ARCHIVES, value);

/* ---------- какой архив открыт: ?archive=, затем localStorage, затем по умолчанию ---------- */

let stored = null;
try {
  stored = localStorage.getItem(STORAGE_KEY);
} catch {}

const fromUrl = new URL(window.location.href).searchParams.get("archive");
const currentKey = [fromUrl, stored, config.defaultArchive].find(isArchive);
const current = ARCHIVES[currentKey];

try {
  localStorage.setItem(STORAGE_KEY, currentKey);
} catch {}
document.documentElement.dataset.archiveV004 = currentKey;

/* ---------- маршрутизация запросов данных ---------- */

const nativeFetch = window.fetch.bind(window);

const DATA_ROUTES = [
  ["/data/styles.json", "styles"],
  ["/data/media.json", "media"],
  ["/data/supported.json", "supported"],
];

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return typeof input?.url === "string" ? input.url : "";
}

function pathnameOf(value) {
  try {
    return new URL(value, window.location.href).pathname;
  } catch {
    return "";
  }
}

window.fetch = function archiveFetch(input, init) {
  const pathname = pathnameOf(requestUrl(input));
  const route = DATA_ROUTES.find(([suffix]) => pathname.endsWith(suffix));
  if (!route) return nativeFetch(input, init);

  const target = current[route[1]];

  // У архива нет списка Supported (SKY): отвечаем пустым списком, чтобы код поиска не падал.
  if (!target) {
    return Promise.resolve(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      })
    );
  }
  return nativeFetch(target, init);
};

/* ---------- интерфейс ---------- */

function switchArchive(nextKey) {
  if (!isArchive(nextKey) || nextKey === currentKey) return;

  try {
    localStorage.setItem(STORAGE_KEY, nextKey);
  } catch {}

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("archive", nextKey);

  // Намеренная полная перезагрузка: у каждого архива чистое состояние приложения
  // (индексы поиска, вьювер, пул случайных, фильтры).
  window.location.assign(nextUrl.href);
}

function mountSelector() {
  if (document.querySelector(".archive-selector-v004")) return;

  const modeSwitch = document.querySelector(".mode-switch");
  if (!modeSwitch) return;

  const buttons = Object.values(ARCHIVES)
    .map(
      ({ key, label }) => `
        <button
          class="archive-v004-button${key === currentKey ? " active" : ""}"
          data-archive-v004="${key}"
          type="button"
          aria-pressed="${key === currentKey}"
        >
          <span>${label}</span>
        </button>`
    )
    .join("");

  const section = document.createElement("section");
  section.className = "archive-selector-v004";
  section.setAttribute("aria-label", "Archive model");
  section.innerHTML = `
    <div class="archive-v004-label">ARCHIVE</div>
    <div class="archive-v004-buttons">${buttons}</div>
  `;
  modeSwitch.before(section);

  section.addEventListener("click", (event) => {
    const button = event.target.closest("[data-archive-v004]");
    if (button) switchArchive(button.dataset.archiveV004);
  });
}

function syncSupportedAvailability() {
  const tab = document.querySelector('.mode-tab[data-mode="supported"]');
  if (!tab) return;

  const available = Boolean(current.supported);
  tab.hidden = !available;
  tab.disabled = !available;
  document
    .querySelector(".mode-switch")
    ?.classList.toggle("archive-v004-no-supported", !available);
}

function syncArchiveHeading() {
  const eyebrow = document.querySelector(".eyebrow");
  if (!eyebrow) return;

  const russian = String(document.documentElement.lang || "")
    .toLowerCase()
    .startsWith("ru");
  eyebrow.textContent = russian
    ? `${current.label} / ИНДЕКС СТИЛЕЙ`
    : `${current.label} / STYLE INDEX`;
}

function mount() {
  document.body?.setAttribute("data-archive-v004", currentKey);

  mountSelector();
  syncSupportedAvailability();
  syncArchiveHeading();

  // app.js может перезаписать заголовок при смене языка
  new MutationObserver(syncArchiveHeading).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}

/* ---------- публичный API для остальных модулей ---------- */

window.STYLE_ARCHIVE_ARCHIVES_V004 = {
  currentKey,
  current,
  archives: ARCHIVES,
  switchArchive,
};
