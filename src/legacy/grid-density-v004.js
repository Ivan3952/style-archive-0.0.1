(() => {
  "use strict";

  const STORAGE_KEY = "style-archive:grid-density-v004";

  const MODES = new Set(["compact", "normal", "large"]);

  let mode = localStorage.getItem(STORAGE_KEY) || "normal";

  if (!MODES.has(mode)) {
    mode = "normal";
  }

  /* ======================================================
     APPLY EARLY
     ====================================================== */

  function applyRootMode() {
    document.documentElement.dataset.gridDensityV004 = mode;
  }

  applyRootMode();

  /* ======================================================
     BUTTONS
     ====================================================== */

  function updateButtons() {
    document.querySelectorAll("[data-grid-density-v004]").forEach((button) => {
      const active = button.dataset.gridDensityV004 === mode;

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
    `;

    sortList.insertAdjacentElement("afterend", density);

    density.addEventListener("click", (event) => {
      const button = event.target.closest("[data-grid-density-v004]");

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
  };
})();
