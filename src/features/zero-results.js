/*
 * Пустой результат поиска: подсказки «возможно, вы имели в виду» и переход в другой архив.
 */
import "../css/features/zero-results.css";
import { escapeHtml, onDomReady, whenAppReady } from "../utils.js";

let app = null;
let searchInput = null;
let panel = null;

const clean = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

function archivesApi() {
  return window.STYLE_ARCHIVE_ARCHIVES_V004;
}

function setSearchQuery(value) {
  const discovery = window.STYLE_ARCHIVE_DISCOVERY_V004;
  if (discovery && typeof discovery.setQuery === "function") {
    discovery.setQuery(value);
    return;
  }
  if (!searchInput) return;
  searchInput.value = value;
  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Переход в другой архив с сохранением строки поиска (в отличие от обычной кнопки архива). */
function openInArchive(archive) {
  const url = new URL(window.location.href);
  url.searchParams.set("archive", archive);
  url.searchParams.delete("style");
  if (searchInput?.value?.trim()) url.searchParams.set("q", searchInput.value.trim());
  window.location.href = url.href;
}

function similarStyles(query) {
  const api = window.STYLE_ARCHIVE_SEARCH_LITE_V004;
  if (!api || typeof api.didYouMean !== "function") return [];
  try {
    return (api.didYouMean(query) || []).slice(0, 3);
  } catch {
    return [];
  }
}

function render() {
  if (!panel || !searchInput || !app?.state) return;

  const query = clean(searchInput.value);
  const isZero =
    Boolean(query) &&
    app.state.mode === "visual" &&
    Array.isArray(app.state.filtered) &&
    app.state.filtered.length === 0;

  if (!isZero) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  const suggestions = similarStyles(query);
  const otherArchives = Object.values(archivesApi()?.archives || {}).filter(
    ({ key }) => key !== archivesApi()?.currentKey
  );

  let html = `
    <div class="zero-result-title-v004">NO EXACT RESULTS</div>
    <div class="zero-result-query-v004">"${escapeHtml(query)}"</div>
  `;

  if (suggestions.length) {
    html += `
      <div class="zero-result-label-v004">MAYBE YOU MEANT</div>
      <div class="zero-result-actions-v004">
        ${suggestions
          .map(
            (name) =>
              `<button type="button" data-zero-query="${escapeHtml(name)}">${escapeHtml(name)}</button>`
          )
          .join("")}
      </div>
    `;
  }

  html += `
    <div class="zero-result-label-v004">TRY ANOTHER ARCHIVE</div>
    <div class="zero-result-actions-v004">
      ${otherArchives
        .map(
          ({ key, label }) =>
            `<button type="button" data-zero-archive="${key}">${escapeHtml(label)}</button>`
        )
        .join("")}
      <button type="button" data-zero-clear>CLEAR SEARCH</button>
    </div>
  `;

  panel.innerHTML = html;
  panel.hidden = false;
}

function init(readyApp) {
  app = readyApp;
  searchInput = document.querySelector("#searchInput");
  const emptyState = document.querySelector("#visualEmptyState");
  if (!emptyState) return;

  panel = document.createElement("div");
  panel.className = "zero-result-polish-v004";
  panel.hidden = true;
  emptyState.appendChild(panel);

  panel.addEventListener("click", (event) => {
    const queryButton = event.target.closest("[data-zero-query]");
    if (queryButton) return setSearchQuery(queryButton.dataset.zeroQuery);

    const archiveButton = event.target.closest("[data-zero-archive]");
    if (archiveButton) return openInArchive(archiveButton.dataset.zeroArchive);

    if (event.target.closest("[data-zero-clear]")) setSearchQuery("");
  });

  searchInput?.addEventListener("input", () => window.setTimeout(render, 0));
  render();

  window.STYLE_ARCHIVE_FINAL_POLISH_V004 = {
    ...(window.STYLE_ARCHIVE_FINAL_POLISH_V004 || {}),
    syncZeroResult: render,
  };
}

onDomReady(() => whenAppReady(init, { label: "пустой результат поиска", methods: ["openViewer"] }));
