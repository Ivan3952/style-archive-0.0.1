/*
 * Ссылка на конкретный стиль: ?style=<id>.
 *  - открытие вьюера по ссылке при загрузке и по кнопкам «назад/вперёд»;
 *  - адрес обновляется, когда стиль открывают и закрывают;
 *  - кнопка «COPY STYLE LINK» внутри вьюера.
 */
import "../css/features/style-links.css";
import { copyText, replaceUrl, whenAppReady, onDomReady } from "../utils.js";

let app = null;
let copyLinkButton = null;

function styleFromId(id) {
  if (!id || !app?.state) return null;
  return (
    app.state.styleById?.get?.(id) ||
    app.state.styles?.find((style) => String(style.id) === String(id)) ||
    null
  );
}

function setStyleInUrl(id) {
  replaceUrl((params) => {
    if (id) params.set("style", String(id));
    else params.delete("style");
  });
}

function openStyleFromUrl() {
  const id = new URL(window.location.href).searchParams.get("style");
  if (!id) return;

  const style = styleFromId(id);
  if (!style) return;
  if (app.state.viewerStyle && String(app.state.viewerStyle.id) === String(id)) return;

  app.openViewer(style);
}

/* ---------- адрес следует за вьюером ---------- */

function syncUrlFromCardClick(event) {
  const open = event.target.closest("[data-open-id]");
  if (open) setStyleInUrl(open.dataset.openId);
}

function installDialogCloseSync() {
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      window.setTimeout(() => {
        if (!app?.state?.viewerStyle) setStyleInUrl(null);
      }, 0);
    });
  });
}

function installHistorySync() {
  window.addEventListener("popstate", () => {
    const id = new URL(window.location.href).searchParams.get("style");
    if (id) openStyleFromUrl();
    else if (app?.state?.viewerStyle) app.closeViewer?.();
  });
}

/* ---------- кнопка «скопировать ссылку» ---------- */

function installCopyButton() {
  if (document.querySelector("#styleDeepLinkCopyV004")) return;

  copyLinkButton = document.createElement("button");
  copyLinkButton.id = "styleDeepLinkCopyV004";
  copyLinkButton.className = "style-link-copy-v004";
  copyLinkButton.type = "button";
  copyLinkButton.textContent = "COPY STYLE LINK";

  copyLinkButton.addEventListener("click", async () => {
    const style = app?.state?.viewerStyle;
    if (!style) return;

    setStyleInUrl(style.id);
    await copyText(window.location.href);

    const label = copyLinkButton.textContent;
    copyLinkButton.textContent = "LINK COPIED";
    window.setTimeout(() => {
      copyLinkButton.textContent = label;
    }, 1200);
  });

  document.body.appendChild(copyLinkButton);
}

/** Открытый вьюер: диалог с картинкой (но не окно Info). */
function viewerDialog() {
  const dialogs = [...document.querySelectorAll("dialog[open]")].filter(
    (d) => d.id !== "infoDialog"
  );
  return dialogs.find((dialog) => dialog.querySelector("img")) || dialogs[0] || null;
}

/** Переносит кнопку в панель действий открытого вьюера. */
function placeCopyButton() {
  if (!app?.state?.viewerStyle || !copyLinkButton) return;

  const dialog = viewerDialog();
  if (!dialog) return;
  dialog.classList.add("viewer-deeplink-host-v004");

  const actions = dialog.querySelector(".viewer-actions");
  if (actions && copyLinkButton.parentElement !== actions) {
    actions.appendChild(copyLinkButton);
  }
}

function watchViewer() {
  // app.js открывает вьюер в том же событии click, поэтому ждём чуть-чуть
  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("[data-open-id], [data-related-id], [data-preview-id]")) {
        window.setTimeout(placeCopyButton, 20);
      }
    },
    true
  );
  // вьюер, открытый по ссылке при загрузке страницы
  window.setTimeout(placeCopyButton, 250);
  window.setTimeout(placeCopyButton, 700);
}

function init(readyApp) {
  app = readyApp;
  document.addEventListener("click", syncUrlFromCardClick, true);
  installDialogCloseSync();
  installCopyButton();
  installHistorySync();
  openStyleFromUrl();
  watchViewer();
}

onDomReady(() => whenAppReady(init, { label: "ссылки на стили", methods: ["openViewer"] }));
