/*
 * Панель микса 0.1.2.
 * Лоток («ADDED») превращается в микс: всегда видна нижняя полоса с готовой строкой промпта,
 * у каждого стиля есть вес и замок, формат копирования выбирается.
 * Состав микса по-прежнему хранится в state.tray (массив строк), поэтому старые данные,
 * кнопки «ADD» на карточках и окно «Миксы» работают как раньше.
 * Веса, замки и формат лежат отдельно: style-archive:mix-v006.
 */
(() => {
  "use strict";

  const STORE_KEY = "style-archive:mix-v006";
  const WEIGHT_MIN = 0.5;
  const WEIGHT_MAX = 1.2;
  const WEIGHT_STEP = 0.1;
  const BLEND_MIN = 2;
  const BLEND_MAX = 5;
  const WAIT_ATTEMPTS = 100;

  const tr = (ru, en) => (document.documentElement.lang === "en" ? en : ru);

  let app = null;
  let store = readStore();

  function readStore() {
    const fallback = { weights: {}, locks: [], format: "list", base: "", open: false };

    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return fallback;

      const weights = {};
      Object.entries(parsed.weights || {}).forEach(([key, value]) => {
        const number = Number(value);
        if (Number.isFinite(number)) weights[key] = clampWeight(number);
      });

      return {
        weights,
        locks: Array.isArray(parsed.locks) ? parsed.locks.filter((v) => typeof v === "string") : [],
        format: parsed.format === "blend" ? "blend" : "list",
        base: typeof parsed.base === "string" ? parsed.base.replace(/\s+/g, " ").slice(0, 600) : "",
        open: parsed.open === true,
      };
    } catch {
      return fallback;
    }
  }

  function writeStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {}
  }

  function clampWeight(value) {
    const clamped = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, value));
    return Math.round(clamped * 10) / 10;
  }

  const keyOf = (name) => app.trayKey(name);
  const weightOf = (name) => store.weights[keyOf(name)] ?? 1;
  const isLocked = (name) => store.locks.includes(keyOf(name));

  /*
   * Убирает из хранилища веса и замки стилей, которых уже нет в миксе.
   * Убранное несколько секунд помнится: если стиль вернули кнопкой «Отменить»,
   * его вес и замок возвращаются вместе с ним.
   */
  const UNDO_WINDOW = 8000;
  const removed = new Map();

  function pruneStore() {
    const keys = new Set(app.state.tray.map(keyOf));
    const now = Date.now();
    let changed = false;

    keys.forEach((key) => {
      const memo = removed.get(key);
      if (!memo) return;
      removed.delete(key);
      if (now - memo.at > UNDO_WINDOW) return;
      if (memo.weight !== undefined && store.weights[key] === undefined) {
        store.weights[key] = memo.weight;
        changed = true;
      }
      if (memo.locked && !store.locks.includes(key)) {
        store.locks.push(key);
        changed = true;
      }
    });

    const gone = new Set(
      [...Object.keys(store.weights), ...store.locks].filter((key) => !keys.has(key))
    );

    gone.forEach((key) => {
      removed.set(key, { weight: store.weights[key], locked: store.locks.includes(key), at: now });
      delete store.weights[key];
      changed = true;
    });

    if (gone.size) store.locks = store.locks.filter((key) => keys.has(key));
    if (changed) writeStore();
  }

  /* ---------- строка промпта ---------- */

  const bare = (name) => String(name).replace(/^@/, "");

  function weighted(name) {
    const weight = weightOf(name);
    return weight === 1 ? name : `(${name}:${weight.toFixed(1)})`;
  }

  function stylesText() {
    const names = app.state.tray;
    if (!names.length) return "";

    if (store.format === "blend" && names.length >= BLEND_MIN) {
      return `@[${names.map(bare).join("|")}]`;
    }

    return names.map(weighted).join(", ");
  }

  function promptText() {
    const styles = stylesText();
    const base = store.base.trim();
    if (!styles) return "";
    return base ? `${base}, ${styles}` : styles;
  }

  /* предупреждения: что именно пользователь получит не так, как ожидает */
  function notes() {
    const list = [];
    const count = app.state.tray.length;
    const hasWeights = app.state.tray.some((name) => weightOf(name) !== 1);

    if (store.format === "blend") {
      if (count < BLEND_MIN) {
        list.push(
          tr(
            "Смесь нужна от 2 стилей, пока копируется обычная строка.",
            "A blend needs 2+ styles; a plain line is copied for now."
          )
        );
      } else if (count > BLEND_MAX) {
        list.push(
          tr(
            `Смесь рассчитана на 2–${BLEND_MAX} стилей, у тебя ${count}.`,
            `A blend is meant for 2–${BLEND_MAX} styles, you have ${count}.`
          )
        );
      }
      if (hasWeights && count >= BLEND_MIN) {
        list.push(
          tr(
            "В смеси веса не используются: они применятся только в формате «Через запятую».",
            "Weights are ignored in a blend; they apply only to the comma list."
          )
        );
      }
    } else if (hasWeights) {
      list.push(
        tr(
          "Модель резко реагирует на веса, лучше не уводить их далеко от 1.",
          "The model reacts sharply to weights; keep them close to 1."
        )
      );
    }

    return list;
  }

  /* ---------- DOM ---------- */

  const dock = document.createElement("section");
  dock.className = "mix-dock-v006";
  dock.id = "mixDock";
  dock.hidden = true;
  dock.setAttribute("aria-label", "Микс");

  const lockIcon = (locked) =>
    locked
      ? `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
      : `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 7V5a3 3 0 0 1 5.6-1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );

  function render() {
    if (!app) return;

    pruneStore();

    const names = app.state.tray;
    const empty = names.length === 0;

    dock.hidden = empty;
    document.documentElement.classList.toggle("mix-dock-on-v006", !empty);
    document.documentElement.classList.toggle("mix-dock-open-v006", !empty && store.open);
    if (empty) return;

    const text = promptText();
    const open = store.open;

    dock.classList.toggle("open", open);

    dock.innerHTML = `
      <div class="mix-dock-bar-v006">
        <button class="mix-dock-toggle-v006" type="button" aria-expanded="${open}" aria-controls="mixDockPanel">
          <span class="mix-dock-title-v006">${tr("МИКС", "MIX")}</span>
          <span class="mix-dock-count-v006">${names.length}</span>
          <span class="mix-dock-chevron-v006" aria-hidden="true"></span>
        </button>
        <code class="mix-dock-line-v006" title="${esc(text)}">${esc(text)}</code>
        <button class="mix-dock-copy-v006" type="button">${tr("КОПИРОВАТЬ", "COPY")}</button>
      </div>
      <div class="mix-dock-panel-v006" id="mixDockPanel" ${open ? "" : "hidden"}>
        <div class="mix-dock-controls-v006">
          <div class="mix-dock-seg-v006" role="group" aria-label="${tr("Формат", "Format")}">
            <button type="button" data-format="list" class="${store.format === "list" ? "active" : ""}">${tr("ЧЕРЕЗ ЗАПЯТУЮ", "COMMA LIST")}</button>
            <button type="button" data-format="blend" class="${store.format === "blend" ? "active" : ""}">${tr("СМЕСЬ @[a|b]", "BLEND @[a|b]")}</button>
          </div>
          <button class="mix-dock-action-v006" type="button" data-act="shuffle" title="${esc(
            tr(
              "Заменить незафиксированные стили случайными из избранного",
              "Replace unlocked styles with random ones from Saved"
            )
          )}">${tr("ЗАМЕНИТЬ СЛУЧАЙНЫМИ", "SHUFFLE UNLOCKED")}</button>
          <button class="mix-dock-action-v006 mix-dock-clear-v006" type="button" data-act="clear">${tr("ОЧИСТИТЬ", "CLEAR")}</button>
        </div>
        <label class="mix-dock-base-v006">
          <span>${tr("ПРОМПТ ПЕРЕД СТИЛЯМИ", "PROMPT BEFORE STYLES")}</span>
          <input type="text" value="${esc(store.base)}" maxlength="600" autocomplete="off" spellcheck="false" placeholder="${esc(
            tr("необязательно: 1girl, sketch, ...", "optional: 1girl, sketch, ...")
          )}" />
        </label>
        <ul class="mix-dock-items-v006">
          ${names
            .map((name, index) => {
              const weight = weightOf(name);
              const lock = isLocked(name);
              return `
            <li class="${lock ? "locked" : ""}" data-index="${index}">
              <button class="mix-dock-lock-v006" type="button" data-act="lock" aria-pressed="${lock}" title="${esc(
                lock
                  ? tr("Снять замок", "Unlock")
                  : tr("Зафиксировать: не заменять", "Lock: keep when shuffling")
              )}">${lockIcon(lock)}</button>
              <span class="mix-dock-name-v006" title="${esc(name)}">${esc(name)}</span>
              <span class="mix-dock-weight-v006${weight !== 1 ? " changed" : ""}">
                <button type="button" data-act="weight-down" aria-label="${tr("Вес меньше", "Lower weight")}" ${weight <= WEIGHT_MIN ? "disabled" : ""}>−</button>
                <output>${weight.toFixed(1)}</output>
                <button type="button" data-act="weight-up" aria-label="${tr("Вес больше", "Raise weight")}" ${weight >= WEIGHT_MAX ? "disabled" : ""}>+</button>
              </span>
              <button class="mix-dock-remove-v006" type="button" data-act="remove" aria-label="${tr("Убрать из микса", "Remove from mix")}">×</button>
            </li>`;
            })
            .join("")}
        </ul>
        ${notes()
          .map((line) => `<p class="mix-dock-note-v006">${esc(line)}</p>`)
          .join("")}
      </div>
    `;
  }

  /* ---------- действия ---------- */

  function setOpen(value) {
    store.open = value;
    writeStore();
    render();
  }

  function changeWeight(name, delta) {
    const key = keyOf(name);
    const next = clampWeight((store.weights[key] ?? 1) + delta);

    if (next === 1) delete store.weights[key];
    else store.weights[key] = next;

    writeStore();
    render();
  }

  function toggleLock(name) {
    const key = keyOf(name);
    store.locks = isLocked(name)
      ? store.locks.filter((item) => item !== key)
      : [...store.locks, key];
    writeStore();
    render();
  }

  function removeName(name) {
    app.setTray(
      app.state.tray.filter((item) => keyOf(item) !== keyOf(name)),
      app.t("removedToast")
    );
  }

  /* заменяет незафиксированные стили случайными: сначала из избранного, потом из всего архива */
  function shuffleUnlocked() {
    const state = app.state;
    const current = state.tray;
    const free = current.filter((name) => !isLocked(name));

    if (!free.length) {
      app.showToast(tr("ВСЕ СТИЛИ ЗАФИКСИРОВАНЫ", "ALL STYLES ARE LOCKED"));
      return;
    }

    const taken = new Set(current.map(keyOf));
    const nameOf = (style) => style.copy_value || style.name || "";
    const pick = (list) => list.filter((name) => name && !taken.has(keyOf(name)));

    const fromSaved = pick(
      [...state.saved]
        .map((id) => state.styleById.get(id))
        .filter(Boolean)
        .map(nameOf)
    );
    const fromAll = pick(state.styles.map(nameOf));

    const shuffled = (list) => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const usedKeys = new Set();
    const chosen = [];
    for (const name of [...shuffled(fromSaved), ...shuffled(fromAll)]) {
      const key = keyOf(name);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      chosen.push(name);
      if (chosen.length === free.length) break;
    }

    if (chosen.length < free.length) {
      app.showToast(tr("НЕ ИЗ ЧЕГО ВЫБИРАТЬ", "NOTHING TO PICK FROM"));
      return;
    }

    let cursor = 0;
    const next = current.map((name) => (isLocked(name) ? name : chosen[cursor++]));

    /* веса заменённых стилей сбрасываются вместе с ними (pruneStore) */
    app.setTray(
      next,
      fromSaved.length >= free.length
        ? tr("ЗАМЕНЕНО ИЗ ИЗБРАННОГО", "SHUFFLED FROM SAVED")
        : tr("ЗАМЕНЕНО: ЧАСТЬ ИЗ АРХИВА", "SHUFFLED: SOME FROM ARCHIVE")
    );
  }

  function clearMix() {
    app.setTray([], app.t("cleared"));
  }

  dock.addEventListener("click", (event) => {
    if (!app) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".mix-dock-toggle-v006")) {
      setOpen(!store.open);
      return;
    }

    if (target.closest(".mix-dock-copy-v006")) {
      const text = promptText();
      if (text) app.copyValue(text, app.t("allCopied"));
      return;
    }

    const format = target.closest("[data-format]");
    if (format) {
      store.format = format.dataset.format === "blend" ? "blend" : "list";
      writeStore();
      render();
      return;
    }

    const actionButton = target.closest("[data-act]");
    if (!actionButton) return;

    const act = actionButton.dataset.act;
    const row = actionButton.closest("li");
    const name = row ? app.state.tray[Number(row.dataset.index)] : null;

    if (act === "shuffle") shuffleUnlocked();
    else if (act === "clear") clearMix();
    else if (name && act === "lock") toggleLock(name);
    else if (name && act === "weight-down") changeWeight(name, -WEIGHT_STEP);
    else if (name && act === "weight-up") changeWeight(name, WEIGHT_STEP);
    else if (name && act === "remove") removeName(name);
  });

  /* поле «промпт перед стилями» обновляет строку, не перерисовывая панель (иначе теряется фокус) */
  dock.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.closest(".mix-dock-base-v006")) return;

    store.base = input.value.replace(/\s+/g, " ").slice(0, 600);
    writeStore();

    const line = dock.querySelector(".mix-dock-line-v006");
    if (line) {
      const text = promptText();
      line.textContent = text;
      line.title = text;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      store.open &&
      !dock.hidden &&
      dock.contains(document.activeElement)
    ) {
      setOpen(false);
    }
  });

  /* ---------- запуск ---------- */

  /* для других модулей (разбор промпта): веса, формат и текст перед стилями */
  window.STYLE_ARCHIVE_MIX_V006 = {
    setWeights(map) {
      Object.entries(map).forEach(([name, weight]) => {
        const key = keyOf(name);
        const value = clampWeight(Number(weight) || 1);
        if (value === 1) delete store.weights[key];
        else store.weights[key] = value;
      });
      writeStore();
      render();
    },
    setFormat(format) {
      store.format = format === "blend" ? "blend" : "list";
      writeStore();
      render();
    },
    setBase(text) {
      store.base = String(text || "")
        .replace(/\s+/g, " ")
        .slice(0, 600);
      writeStore();
      render();
    },
    open() {
      if (!store.open) setOpen(true);
    },
    get state() {
      return { format: store.format, base: store.base };
    },
  };

  function start(candidate) {
    app = candidate;
    document.body.appendChild(dock);
    window.addEventListener("style-archive:state", render);
    new MutationObserver(render).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    render();
  }

  let attempts = 0;

  function waitForApp() {
    const candidate = window.STYLE_ARCHIVE_V003;
    const ready =
      candidate &&
      candidate.state &&
      Array.isArray(candidate.state.styles) &&
      typeof candidate.setTray === "function";

    if (ready) {
      start(candidate);
      return;
    }

    attempts += 1;
    if (attempts < WAIT_ATTEMPTS) window.setTimeout(waitForApp, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForApp, { once: true });
  } else {
    waitForApp();
  }
})();
