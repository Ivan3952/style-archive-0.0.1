/* Общие мелочи для модулей сайта. */

/** Экранирование текста для вставки в HTML. */
export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Копирует текст в буфер обмена (с запасным способом для http и старых браузеров). */
export function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(value);
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
  return Promise.resolve();
}

/** Меняет параметры адресной строки без перезагрузки и без новой записи в истории. */
export function replaceUrl(mutate) {
  const url = new URL(window.location.href);
  mutate(url.searchParams);
  history.replaceState(history.state, "", url);
}

/** Ждёт, пока ядро сайта (window.STYLE_ARCHIVE_V003) загрузит стили, и вызывает init(app). */
export function whenAppReady(init, { label, methods = [], intervalMs = 100, maxTries = 150 } = {}) {
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    const app = window.STYLE_ARCHIVE_V003;
    const ready =
      app &&
      Array.isArray(app.state?.styles) &&
      app.state.styles.length &&
      methods.every((name) => typeof app[name] === "function");
    if (ready) {
      window.clearInterval(timer);
      init(app);
    } else if (tries >= maxTries) {
      window.clearInterval(timer);
      console.warn(`[style-archive] ${label || "модуль"}: ядро сайта не загрузилось`);
    }
  }, intervalMs);
}

/** Запускает fn, когда DOM готов. */
export function onDomReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

/** Случайная перестановка (Фишер-Йейтс), исходный массив не меняется. */
export function shuffle(rows) {
  const result = [...rows];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
