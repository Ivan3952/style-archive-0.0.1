(() => {
  "use strict";

  const STORAGE_KEY = "style-archive:grid-density-v004";

  const MODES = new Set(["compact", "normal", "large"]);

  /* Форма карточек: "even" (ровная сетка, один формат 2:3) или "original" (как есть, masonry). */
  const SHAPE_KEY = "style-archive:grid-shape-v004";
  const SHAPES = new Set(["even", "original"]);

  function readStored(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  let mode = readStored(STORAGE_KEY, "normal");

  if (!MODES.has(mode)) {
    mode = "normal";
  }

  let shape = readStored(SHAPE_KEY, "even");

  if (!SHAPES.has(shape)) {
    shape = "even";
  }

  /* ======================================================
     APPLY EARLY
     ====================================================== */

  function applyRootMode() {
    document.documentElement.dataset.gridDensityV004 = mode;
    document.documentElement.dataset.gridShapeV004 = shape;
  }

  applyRootMode();

  /* ======================================================
     BUTTONS
     ====================================================== */

  function updateButtons() {
    document.querySelectorAll("button[data-grid-density-v004]").forEach((button) => {
      const active = button.dataset.gridDensityV004 === mode;

      button.classList.toggle("active", active);

      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    document.querySelectorAll("button[data-grid-shape-v004]").forEach((button) => {
      const active = button.dataset.gridShapeV004 === shape;

      button.classList.toggle("active", active);

      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  /* ======================================================
     REBUILD VISUAL GALLERY
     ====================================================== */

  function rebuildGallery() {
    const app = window.STYLE_ARCHIVE_V003;

    if (app?.state?.mode === "visual" && typeof app.applyVisualFilters === "function") {
      window.requestAnimationFrame(() => {
        app.applyVisualFilters(true);
      });

      return;
    }

    /*
      Fallback. app.js already listens
      for resize and rebuilds masonry
      if column count changed.
    */
    window.dispatchEvent(new Event("resize"));
  }

  /* ======================================================
     SET MODE
     ====================================================== */

  function setMode(next) {
    if (!MODES.has(next) || next === mode) {
      return;
    }

    mode = next;

    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}

    applyRootMode();

    updateButtons();

    rebuildGallery();
  }

  function setShape(next) {
    if (!SHAPES.has(next) || next === shape) {
      return;
    }

    shape = next;

    try {
      localStorage.setItem(SHAPE_KEY, shape);
    } catch {}

    applyRootMode();

    updateButtons();

    /* высоты карточек поменялись, раскладка по колонкам считается заново */
    rebuildGallery();
  }

  /* ======================================================
     UI
     ====================================================== */

  function mount() {
    if (document.querySelector(".grid-density-v004")) {
      updateButtons();

      return;
    }

    const sortList = document.querySelector("#sortList");

    if (!sortList) {
      return;
    }

    const density = document.createElement("div");

    density.className = "grid-density-v004";

    density.innerHTML = `
      <span
        class="grid-density-label-v004"
      >
        SIZE
      </span>

      <button
        type="button"
        data-grid-density-v004="compact"
        aria-pressed="false"
      >
        COMPACT
      </button>

      <button
        type="button"
        data-grid-density-v004="normal"
        aria-pressed="false"
      >
        NORMAL
      </button>

      <button
        type="button"
        data-grid-density-v004="large"
        aria-pressed="false"
      >
        LARGE
      </button>

      <span
        class="grid-density-label-v004 grid-shape-label-v004"
      >
        SHAPE
      </span>

      <button
        type="button"
        data-grid-shape-v004="even"
        aria-pressed="false"
      >
        EVEN
      </button>

      <button
        type="button"
        data-grid-shape-v004="original"
        aria-pressed="false"
      >
        ORIGINAL
      </button>
    `;

    sortList.insertAdjacentElement("afterend", density);

    density.addEventListener("click", (event) => {
      const shapeButton = event.target.closest("button[data-grid-shape-v004]");

      if (shapeButton) {
        setShape(shapeButton.dataset.gridShapeV004);

        return;
      }

      const button = event.target.closest("button[data-grid-density-v004]");

      if (!button) {
        return;
      }

      setMode(button.dataset.gridDensityV004);
    });

    updateButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, {
      once: true,
    });
  } else {
    mount();
  }

  window.STYLE_ARCHIVE_GRID_DENSITY_V004 = {
    getMode() {
      return mode;
    },

    setMode,

    getShape() {
      return shape;
    },

    setShape,
  };
})();
