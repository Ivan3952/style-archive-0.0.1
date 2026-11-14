/*
 * Разбор промпта 0.1.2.
 * Вставляешь промпт целиком (свой или чужой) и видишь все стили из него: превью, вес,
 * есть ли стиль в архиве. Найденное одной кнопкой уходит в микс или в избранное.
 *
 * Понимает три записи стилей Anima / Stable Waifu:
 *   @artist, @other            — через запятую
 *   (@artist:0.8)              — с весом
 *   @[a|b|c]                   — смесь
 * Экранированные скобки \( \) снимаются, в именах допускаются двоеточия (@re:rin) и скобки.
 */
(() => {
  "use strict";

  const WAIT_ATTEMPTS = 120;
  const MAX_FUZZY = 30;
  const MIN_PASTE_TAGS = 2;

  const tr = (ru, en) => (document.documentElement.lang === "en" ? en : ru);

  /* ---------- разбор текста (без DOM, проверяется тестами) ---------- */

  const WEIGHTED = /\(\s*(@[^()]*?(?:\([^()]*\)[^()]*?)*)\s*:\s*(\d+(?:\.\d+)?)\s*\)/g;
  const BLEND = /@\[([^\]]*)\]/g;

  const cleanName = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const withAt = (value) => {
    const name = cleanName(value).replace(/^@+/, "");
    return name ? `@${name}` : "";
  };

  function parsePrompt(input) {
    const text = String(input || "").replace(/\\([()[\]])/g, "$1");
    const items = [];
    const used = [];

    const isFree = (start, end) => used.every(([a, b]) => end <= a || start >= b);
    const mark = (start, end) => used.push([start, end]);

    /* 1. смеси @[a|b|c] */
    for (const match of text.matchAll(BLEND)) {
      const start = match.index;
      const end = start + match[0].length;
      mark(start, end);
      match[1].split("|").forEach((part, order) => {
        const name = withAt(part);
        if (name) items.push({ raw: part.trim(), name, weight: 1, blend: true, start, order });
      });
    }

    /* 2. с весом (@name:0.8) */
    for (const match of text.matchAll(WEIGHTED)) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isFree(start, end)) continue;
      mark(start, end);
      const name = withAt(match[1]);
      if (name) {
        items.push({
          raw: match[0],
          name,
          weight: Number(match[2]),
          weightRaw: match[2],
          blend: false,
          start,
          order: 0,
        });
      }
    }

    /* 3. остальное: части через запятую или перевод строки, начинающиеся с @ */
    /* маскируем по UTF-16, как и индексы matchAll, иначе эмодзи сдвигают позиции */
    const maskUsed = () =>
      text
        .split("")
        .map((char, index) => (used.some(([a, b]) => index >= a && index < b) ? "," : char))
        .join("");
    const rest = maskUsed();

    let offset = 0;
    rest.split(/([,\n])/).forEach((chunk) => {
      const start = offset;
      offset += chunk.length;
      if (chunk === "," || chunk === "\n") return;

      let token = chunk.trim();
      const wrapped = token.match(/^\(+\s*(@[^]*?)\s*\)+$/);
      if (
        wrapped &&
        (wrapped[1].match(/\(/g) || []).length === (wrapped[1].match(/\)/g) || []).length
      ) {
        token = wrapped[1];
      }
      /* «art by @name»: берём часть от @ */
      if (!token.startsWith("@")) {
        const inner = token.match(/(?:^|\s)(@\S.*)$/);
        if (!inner) return;
        token = inner[1];
      }

      const name = withAt(token);
      if (!name) return;

      const at = chunk.indexOf(token.replace(/^\(+/, ""));
      const from = start + Math.max(0, at);
      mark(from, from + chunk.length - Math.max(0, at));
      items.push({ raw: token, name, weight: 1, blend: false, start: from, order: 0 });
    });

    items.sort((a, b) => a.start - b.start || a.order - b.order);

    /* остаток промпта без стилей, для поля «промпт перед стилями» */
    const leftover = maskUsed()
      .split(/[,\n]/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(", ");

    return {
      items: items.map(({ raw, name, weight, weightRaw, blend }) => ({
        raw,
        name,
        weight,
        weightRaw,
        blend,
      })),
      leftover,
    };
  }

  function looksLikePrompt(text) {
    const value = String(text || "");
    if (/@\[[^\]]*\|/.test(value) || /\(\s*@[^()]+:\s*\d/.test(value)) return true;
    return (value.match(/(^|[,\n(|]\s*)@\S/g) || []).length >= MIN_PASTE_TAGS;
  }

  function levenshtein(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      const row = [i];
      let best = row[0];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
        if (row[j] < best) best = row[j];
      }
      if (best > limit) return limit + 1;
      prev = row;
    }
    return prev[b.length];
  }

  window.STYLE_ARCHIVE_PROMPT_V007 = { parsePrompt, looksLikePrompt, levenshtein };

  /* ---------- сопоставление с архивом ---------- */

  let app = null;
  let supportedByKey = null;
  let supportedPromise = null;
  let visualCompact = null;
  let supportedCompact = null;
  let compactStylesKey = null;

  function currentArchiveHasSupported() {
    const archives = window.STYLE_ARCHIVE_ARCHIVES_V004;
    return Boolean(archives?.current?.supported);
  }

  function ensureSupported() {
    if (supportedByKey || supportedPromise || !currentArchiveHasSupported())
      return supportedPromise;
    supportedPromise = Promise.resolve(app.loadSupported())
      .then((rows) => {
        supportedByKey = new Map();
        supportedCompact = new Map();
        (rows || []).forEach((name) => {
          supportedByKey.set(app.normalizeStyleName(name), name);
          const compact = app.compactSearch(name);
          if (compact && !supportedCompact.has(compact)) supportedCompact.set(compact, name);
        });
      })
      .catch(() => {
        supportedByKey = new Map();
        supportedCompact = new Map();
      })
      .finally(() => {
        supportedPromise = null;
        renderResults();
      });
    return supportedPromise;
  }

  function ensureVisualCompact() {
    const styles = app.state.styles;
    if (visualCompact && compactStylesKey === styles) return;
    compactStylesKey = styles;
    visualCompact = new Map();
    styles.forEach((style) => {
      const compact = app.compactSearch(style.copy_value || style.name || "");
      if (compact && !visualCompact.has(compact)) visualCompact.set(compact, style);
    });
  }

  function lookup(name) {
    const meta = app.previewMetaForName(name);
    if (meta?.style) {
      return { status: "visual", style: meta.style, canonical: meta.style.copy_value || name };
    }
    const key = app.normalizeStyleName(name);
    if (supportedByKey?.has(key)) {
      return { status: "supported", style: null, canonical: supportedByKey.get(key) };
    }
    return null;
  }

  function nearest(name) {
    const compact = app.compactSearch(name);
    if (!compact) return null;
    const limit = compact.length <= 5 ? 1 : 2;
    let best = null;

    const scan = (entries, status) => {
      for (const [key, value] of entries) {
        const distance = levenshtein(compact, key, limit);
        if (distance > limit) continue;
        if (!best || distance < best.distance) {
          best = {
            distance,
            status,
            style: status === "visual" ? value : null,
            canonical: status === "visual" ? value.copy_value || value.name : value,
          };
          if (distance === 0) return;
        }
      }
    };

    scan(visualCompact, "visual");
    if ((!best || best.distance > 0) && supportedCompact) scan(supportedCompact, "supported");
    return best;
  }

  function resolve(item, fuzzyBudget) {
    const direct = lookup(item.name);
    if (direct) return { ...item, ...direct, fixed: false };

    /* @7:08 без веса легко принять за (@7:08) — проверяем имя вместе с «весом» */
    if (item.weightRaw) {
      const joined = lookup(`${item.name}:${item.weightRaw}`);
      if (joined) return { ...item, ...joined, weight: 1, fixed: false };
    }

    const underscores = item.name.includes("_") ? lookup(item.name.replace(/_/g, " ")) : null;
    if (underscores) return { ...item, ...underscores, fixed: true };

    const compact = app.compactSearch(item.name);
    const visual = visualCompact.get(compact);
    if (visual) {
      return {
        ...item,
        status: "visual",
        style: visual,
        canonical: visual.copy_value || visual.name,
        fixed: true,
      };
    }
    if (supportedCompact?.has(compact)) {
      return {
        ...item,
        status: "supported",
        style: null,
        canonical: supportedCompact.get(compact),
        fixed: true,
      };
    }

    const suggestion = fuzzyBudget.left-- > 0 ? nearest(item.name) : null;
    return { ...item, status: "missing", style: null, canonical: null, suggestion };
  }

  /* ---------- окно ---------- */

  let dialog = null;
  let input = null;
  let results = [];
  let leftover = "";
  let overrides = new Map();
  let renderTimer = null;
  let moveLeftover = true;

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );

  function buildDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "prompt-parse-v007";
    dialog.id = "promptParseDialog";
    dialog.innerHTML = `
      <div class="pp-shell-v007">
        <header class="pp-header-v007">
          <div>
            <span class="section-kicker pp-kicker-v007"></span>
            <h2 class="pp-title-v007"></h2>
          </div>
          <button class="text-button pp-close-v007" type="button"></button>
        </header>
        <p class="pp-lead-v007"></p>
        <textarea class="pp-input-v007" rows="4" spellcheck="false" autocomplete="off"></textarea>
        <div class="pp-summary-v007" aria-live="polite"></div>
        <div class="pp-actions-v007"></div>
        <ul class="pp-list-v007"></ul>
      </div>
    `;
    document.body.appendChild(dialog);

    input = dialog.querySelector(".pp-input-v007");
    input.addEventListener("input", () => {
      window.clearTimeout(renderTimer);
      renderTimer = window.setTimeout(() => {
        overrides = new Map();
        renderResults();
      }, 160);
    });

    dialog.querySelector(".pp-close-v007").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("click", onDialogClick);
    dialog.addEventListener("change", (event) => {
      if (event.target.matches(".pp-leftover-v007 input")) moveLeftover = event.target.checked;
    });
  }

  function syncStaticText() {
    dialog.querySelector(".pp-kicker-v007").textContent = "STYLE / ARCHIVE";
    dialog.querySelector(".pp-title-v007").textContent = tr("РАЗОБРАТЬ ПРОМПТ", "READ A PROMPT");
    dialog.querySelector(".pp-close-v007").textContent = tr("ЗАКРЫТЬ", "CLOSE");
    dialog.querySelector(".pp-lead-v007").textContent = tr(
      "Вставь промпт целиком: найдём в нём стили и покажем, как они выглядят. Понимает @стиль, (@стиль:0.8) и @[a|b|c].",
      "Paste a whole prompt: we find the styles in it and show what they look like. Reads @style, (@style:0.8) and @[a|b|c]."
    );
    input.placeholder = tr(
      "1girl, @стиль один, (@стиль два:0.8), @[a|b], sketch, ...",
      "1girl, @style one, (@style two:0.8), @[a|b], sketch, ..."
    );
  }

  function compute() {
    ensureVisualCompact();
    ensureSupported();

    const parsed = parsePrompt(input.value);
    leftover = parsed.leftover;

    const budget = { left: MAX_FUZZY };
    const seen = new Set();
    results = [];

    parsed.items.forEach((item) => {
      const override = overrides.get(app.normalizeStyleName(item.name));
      const resolved = override
        ? { ...item, ...override, fixed: true, suggestion: null }
        : resolve(item, budget);
      const key = app.normalizeStyleName(resolved.canonical || resolved.name);
      if (seen.has(key)) return;
      seen.add(key);
      results.push(resolved);
    });
  }

  const found = () => results.filter((item) => item.status !== "missing");

  function weightLabel(item) {
    if (item.blend) return tr("в смеси", "in a blend");
    if (item.weight !== 1) return `${tr("вес", "weight")} ${item.weight}`;
    return "";
  }

  function statusChip(item) {
    if (item.status === "visual")
      return `<span class="pp-chip-v007 ok">${tr("ЕСТЬ ПРЕВЬЮ", "PREVIEW")}</span>`;
    if (item.status === "supported")
      return `<span class="pp-chip-v007">${tr("БЕЗ ПРЕВЬЮ", "NO PREVIEW")}</span>`;
    return `<span class="pp-chip-v007 bad">${tr("НЕ НАЙДЕН", "NOT FOUND")}</span>`;
  }

  function thumbHtml(item) {
    const style = item.style;
    const media = style ? app.state.media[(style.media || [])[0]] : null;
    const src = media ? app.toLocalPath(media.thumb || media.src || "") : "";
    if (!src) return `<span class="pp-thumb-v007 empty" aria-hidden="true">@</span>`;
    return `<button class="pp-thumb-v007" type="button" data-pp-open="${esc(style.id)}" aria-label="${esc(
      tr("Открыть превью", "Open preview")
    )}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></button>`;
  }

  function rowHtml(item, index) {
    const name = item.canonical || item.name;
    const inTray = item.canonical ? app.isInTray(item.canonical) : false;
    const saved = item.style ? app.state.saved.has(item.style.id) : false;
    const note = [];

    if (item.fixed && item.canonical && item.canonical !== item.name) {
      note.push(`${tr("в промпте", "in prompt")}: ${esc(item.name)}`);
    }
    const weight = weightLabel(item);
    if (weight) note.push(esc(weight));
    if (item.status === "supported") {
      note.push(
        tr("модель знает стиль, превью в архиве пока нет", "the model knows it, no preview yet")
      );
    }

    const suggestion = item.suggestion
      ? `<button class="pp-suggest-v007" type="button" data-pp-suggest="${index}">${tr("может, это", "maybe")}: ${esc(
          item.suggestion.canonical
        )}</button>`
      : item.status === "missing"
        ? `<span class="pp-note-v007">${tr("нет ни в архиве, ни в списке модели", "not in the archive or the model list")}</span>`
        : "";

    const actions =
      item.status === "missing"
        ? ""
        : `
          <button class="pp-btn-v007${inTray ? " on" : ""}" type="button" data-pp-tray="${index}">${
            inTray ? tr("В МИКСЕ ✓", "IN MIX ✓") : tr("В МИКС", "TO MIX")
          }</button>
          ${
            item.style
              ? `<button class="pp-btn-v007${saved ? " on" : ""}" type="button" data-pp-save="${index}">${
                  saved ? tr("СОХРАНЕНО ✓", "SAVED ✓") : tr("СОХРАНИТЬ", "SAVE")
                }</button>`
              : ""
          }`;

    return `
      <li class="pp-row-v007 ${item.status}">
        ${thumbHtml(item)}
        <div class="pp-body-v007">
          <div class="pp-name-line-v007">
            <span class="pp-name-v007">${esc(name)}</span>
            ${statusChip(item)}
          </div>
          ${note.length ? `<div class="pp-note-v007">${note.join(" · ")}</div>` : ""}
          ${suggestion}
        </div>
        <div class="pp-row-actions-v007">${actions}</div>
      </li>
    `;
  }

  function renderResults() {
    if (!dialog || !dialog.open || !app) return;

    compute();

    const list = dialog.querySelector(".pp-list-v007");
    const summary = dialog.querySelector(".pp-summary-v007");
    const actions = dialog.querySelector(".pp-actions-v007");

    if (!input.value.trim()) {
      summary.textContent = "";
      actions.innerHTML = "";
      list.innerHTML = "";
      return;
    }

    const visual = results.filter((item) => item.status === "visual").length;
    const supported = results.filter((item) => item.status === "supported").length;
    const missing = results.filter((item) => item.status === "missing").length;

    if (!results.length) {
      summary.textContent = tr(
        "Стилей не нашли. Артистов пишут с @: @имя, (@имя:0.8) или @[a|b].",
        "No styles found. Artists start with @: @name, (@name:0.8) or @[a|b]."
      );
    } else {
      const parts = [`${tr("стилей", "styles")}: ${results.length}`];
      if (visual) parts.push(`${tr("с превью", "with preview")}: ${visual}`);
      if (supported) parts.push(`${tr("без превью", "no preview")}: ${supported}`);
      if (missing) parts.push(`${tr("не найдено", "not found")}: ${missing}`);
      if (supportedPromise) parts.push(tr("проверяю список модели…", "checking the model list…"));
      summary.textContent = parts.join(" · ");
    }

    const canMix = found().length > 0;
    const unsaved = results.filter(
      (item) => item.style && !app.state.saved.has(item.style.id)
    ).length;

    actions.innerHTML = canMix
      ? `
        <button class="pp-btn-v007 primary" type="button" data-pp-act="replace">${tr("ЗАМЕНИТЬ МИКС", "REPLACE MIX")}</button>
        <button class="pp-btn-v007" type="button" data-pp-act="add">${tr("ДОБАВИТЬ В МИКС", "ADD TO MIX")}</button>
        ${
          unsaved
            ? `<button class="pp-btn-v007" type="button" data-pp-act="save">${tr("СОХРАНИТЬ С ПРЕВЬЮ", "SAVE WITH PREVIEW")} · ${unsaved}</button>`
            : ""
        }
        ${
          leftover
            ? `<label class="pp-leftover-v007"><input type="checkbox" ${moveLeftover ? "checked" : ""}> ${tr(
                "остальной текст промпта → в поле «перед стилями»",
                "rest of the prompt → the “before styles” field"
              )}</label>`
            : ""
        }
      `
      : "";

    const blendCount = found().filter((item) => item.blend).length;
    if (blendCount && blendCount < found().length) {
      actions.insertAdjacentHTML(
        "beforeend",
        `<p class="pp-note-v007 pp-mixed-v007">${tr(
          "В промпте есть и смесь @[…], и обычные стили. У микса один формат на всё, поэтому смесь перенесётся как обычный список.",
          "The prompt mixes a blend @[…] with plain styles. The mix has one format, so the blend comes over as a plain list."
        )}</p>`
      );
    }

    list.innerHTML = results.map(rowHtml).join("");
    /* превью могло не загрузиться (нет файла) — убираем «битую картинку» */
    list.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => img.remove(), { once: true });
    });
  }

  function applyWeights(items) {
    const mix = window.STYLE_ARCHIVE_MIX_V006;
    if (!mix) return;
    const map = {};
    items.forEach((item) => {
      if (!item.blend) map[item.canonical] = item.weight;
    });
    mix.setWeights(map);
  }

  function replaceMix() {
    const items = found();
    const mix = window.STYLE_ARCHIVE_MIX_V006;
    app.setTray(
      items.map((item) => item.canonical),
      tr("МИКС ЗАМЕНЁН", "MIX REPLACED")
    );
    applyWeights(items);

    const allBlend = items.length >= 2 && items.every((item) => item.blend);
    mix?.setFormat(allBlend ? "blend" : "list");
    if (leftover && moveLeftover) mix?.setBase(leftover);

    dialog.close();
    mix?.open();
  }

  function addToMix() {
    const items = found().filter((item) => !app.isInTray(item.canonical));
    if (!items.length) {
      app.showToast(tr("ВСЁ УЖЕ В МИКСЕ", "ALREADY IN THE MIX"));
      return;
    }
    app.setTray(
      [...app.state.tray, ...items.map((item) => item.canonical)],
      `${tr("ДОБАВЛЕНО В МИКС", "ADDED TO MIX")}: ${items.length}`
    );
    applyWeights(items);
    renderResults();
  }

  function saveAll() {
    const items = results.filter((item) => item.style && !app.state.saved.has(item.style.id));
    items.forEach((item) => app.toggleSaved(item.style.id));
    app.showToast(`${tr("СОХРАНЕНО", "SAVED")}: ${items.length}`);
    renderResults();
  }

  function onDialogClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const open = target.closest("[data-pp-open]");
    if (open) {
      const style = app.state.styleById.get(open.dataset.ppOpen);
      if (style) app.openViewer(style);
      return;
    }

    const act = target.closest("[data-pp-act]")?.dataset.ppAct;
    if (act === "replace") return replaceMix();
    if (act === "add") return addToMix();
    if (act === "save") return saveAll();

    const trayButton = target.closest("[data-pp-tray]");
    if (trayButton) {
      const item = results[Number(trayButton.dataset.ppTray)];
      if (!item?.canonical) return;
      const adding = !app.isInTray(item.canonical);
      app.toggleTray(item.canonical);
      if (adding) applyWeights([item]);
      renderResults();
      return;
    }

    const saveButton = target.closest("[data-pp-save]");
    if (saveButton) {
      const item = results[Number(saveButton.dataset.ppSave)];
      if (item?.style) app.toggleSaved(item.style.id);
      renderResults();
      return;
    }

    const suggest = target.closest("[data-pp-suggest]");
    if (suggest) {
      const item = results[Number(suggest.dataset.ppSuggest)];
      if (!item?.suggestion) return;
      const { status, style, canonical } = item.suggestion;
      overrides.set(app.normalizeStyleName(item.name), { status, style, canonical });
      renderResults();
    }
  }

  function openDialog(text = null) {
    if (!app) return;
    if (!dialog) buildDialog();
    syncStaticText();
    if (text !== null) {
      input.value = text;
      overrides = new Map();
    }
    if (!dialog.open) dialog.showModal();
    renderResults();
    if (text === null) input.focus();
  }

  /* ---------- входы: кнопка в панели поиска и вставка промпта в поиск ---------- */

  let button = null;

  function placeButton() {
    const bar = document.querySelector(".toolbar-bar-v005");
    if (!bar) return false;
    if (button?.isConnected) return true;

    button = document.createElement("button");
    button.type = "button";
    button.id = "promptParseButton";
    button.className = "filters-toggle-v005 prompt-parse-button-v007";
    button.addEventListener("click", () => openDialog());

    const toggle = bar.querySelector("#filtersToggle");
    if (toggle) bar.insertBefore(button, toggle);
    else bar.appendChild(button);
    syncButton();
    return true;
  }

  function syncButton() {
    if (!button) return;
    const text = tr("ПРОМПТ", "PROMPT");
    if (button.textContent !== text) button.textContent = text;
    button.title = tr("Разобрать промпт на стили", "Read a prompt into styles");
  }

  function watchPaste() {
    const search = document.querySelector("#searchInput");
    if (!search) return;
    search.addEventListener("paste", (event) => {
      const text = event.clipboardData?.getData("text") || "";
      if (!looksLikePrompt(text)) return;
      event.preventDefault();
      openDialog(text);
    });
  }

  function start(candidate) {
    app = candidate;
    watchPaste();

    let tries = 0;
    const place = () => {
      if (placeButton() || tries++ > 60) return;
      window.setTimeout(place, 150);
    };
    place();

    window.addEventListener("style-archive:state", () => {
      if (dialog?.open) renderResults();
    });
    new MutationObserver(() => {
      syncButton();
      if (dialog?.open) {
        syncStaticText();
        renderResults();
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    window.STYLE_ARCHIVE_PROMPT_V007.open = openDialog;
  }

  let attempts = 0;

  function waitForApp() {
    const candidate = window.STYLE_ARCHIVE_V003;
    const ready =
      candidate?.state &&
      candidate.state.styles?.length > 0 &&
      typeof candidate.previewMetaForName === "function";

    if (ready) {
      start(candidate);
      return;
    }

    attempts += 1;
    if (attempts < WAIT_ATTEMPTS) window.setTimeout(waitForApp, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForApp, { once: true });
  } else {
    waitForApp();
  }
})();
