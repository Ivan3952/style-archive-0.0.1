(() => {
  "use strict";

  const RELEASE = "v0.0.4 · RC1 · 07.10.2026";

  let app = null;
  let dialog = null;
  let shell = null;

  const isRu = () =>
    String(document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("ru");

  const tr = (ru, en) => (isRu() ? ru : en);

  const fmt = (value) =>
    Number(value || 0).toLocaleString(isRu() ? "ru-RU" : "en-US");

  function archiveState() {
    const api = window.STYLE_ARCHIVE_ARCHIVES_V004;
    const key = api?.currentKey || "";

    const current = api?.current;

    return {
      key,
      label: current?.label || "",
      visual:
        Array.isArray(app?.state?.styles)
          ? app.state.styles.length
          : current?.styleCount || 0,
      supported:
        current?.supportedCount ?? null,
    };
  }

  // Карточки архивов строятся из data/archives.json (через src/archives.js)
  function stylesWordRu(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "визуальный стиль";
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "визуальных стиля";
    return "визуальных стилей";
  }

  function archivesHtml() {
    const archives = Object.values(window.STYLE_ARCHIVE_ARCHIVES_V004?.archives || {});
    return archives
      .map((archive) => {
        const visual = Number(archive.styleCount || 0);
        const supported =
          archive.supportedCount == null
            ? tr("Отдельный список Supported пока не подключён.", "A separate Supported index is not connected yet.")
            : tr(`Список Supported: ${fmt(archive.supportedCount)}.`, `Supported index: ${fmt(archive.supportedCount)}.`);
        return `
          <article>
            <strong>${archive.label}</strong>
            <p>${tr(`${fmt(visual)} ${stylesWordRu(visual)}.`, `${fmt(visual)} visual styles.`)} ${supported}</p>
          </article>`;
      })
      .join("");
  }

  function infoHtml() {
    const archive = archiveState();
    const savedCount = app?.state?.saved?.size || 0;

    const supportedValue =
      archive.supported == null ? "—" : fmt(archive.supported);

    return `
      <div class="info-v004-top">
        <div>
          <div class="info-v004-kicker">STYLE / ARCHIVE</div>
          <h2>${tr("О ПРОЕКТЕ", "ABOUT")}</h2>
          <div class="info-v004-version">${RELEASE}</div>
        </div>

        <button
          type="button"
          class="info-v004-close"
          data-info-v004-close
        >
          ESC / ${tr("ЗАКРЫТЬ", "CLOSE")}
        </button>
      </div>

      <div class="info-v004-intro">
        ${tr(
          "STYLE / ARCHIVE — локальный каталог style-тегов с визуальными превью, отдельными архивами моделей и быстрым поиском. Здесь можно найти стиль, проверить доступные примеры и сразу скопировать нужный идентификатор.",
          "STYLE / ARCHIVE is a local catalogue of style tags with visual previews, model-specific archives, and fast search. Find a style, inspect available examples, and copy the identifier immediately."
        )}
      </div>

      <div class="info-v004-stats">
        <div>
          <span>${tr("ТЕКУЩИЙ АРХИВ", "CURRENT ARCHIVE")}</span>
          <strong>${archive.label}</strong>
        </div>

        <div>
          <span>${tr("ВИЗУАЛЬНЫХ СТИЛЕЙ", "VISUAL STYLES")}</span>
          <strong>${fmt(archive.visual)}</strong>
        </div>

        <div>
          <span>${tr("ПОДДЕРЖИВАЕТСЯ", "SUPPORTED")}</span>
          <strong>${supportedValue}</strong>
        </div>

        <div>
          <span>${tr("В ИЗБРАННОМ", "SAVED")}</span>
          <strong>${fmt(savedCount)}</strong>
        </div>
      </div>

      <section class="info-v004-section">
        <h3>${tr("АРХИВЫ", "ARCHIVES")}</h3>

        <div class="info-v004-grid">${archivesHtml()}</div>
      </section>

      <section class="info-v004-section">
        <h3>${tr("ПОИСК И ПОДБОРКИ", "SEARCH & DISCOVERY")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>SMART / WORD / CONTAINS</b>
            <span>
              ${tr(
                "Три режима поиска: ранжированный умный поиск, поиск по словам и прямое совпадение с частью названия.",
                "Three search modes: ranked smart search, word matching, and direct substring matching."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ПОДСКАЗКИ", "SUGGESTIONS")}</b>
            <span>
              ${tr(
                "При опечатках сайт может предложить близкий визуальный стиль через «Возможно?».",
                "Typos can produce a close visual-style suggestion through “Did you mean?”."
              )}
            </span>
          </div>

          <div>
            <b>${tr("НЕДАВНИЕ ЗАПРОСЫ", "RECENT QUERIES")}</b>
            <span>
              ${tr(
                "Последние поисковые запросы сохраняются локально и доступны прямо из поиска.",
                "Recent search queries are stored locally and are available directly from search."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ПРЯМЫЕ ССЫЛКИ", "DEEP LINKS")}</b>
            <span>
              ${tr(
                "Можно скопировать ссылку на конкретный стиль или поисковый запрос; нужный архив сохраняется в URL.",
                "Copy a direct link to a style or search query; the archive is preserved in the URL."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ПОДБОРКИ ПО 12", "DISCOVER 12")}</b>
            <span>
              ${tr(
                "Случайные, новые, непросмотренные и стили с несколькими изображениями.",
                "Random, newest, unseen, and multi-image style sets."
              )}
            </span>
          </div>

          <div>
            <b>${tr("НУЛЕВЫЕ РЕЗУЛЬТАТЫ", "ZERO RESULTS")}</b>
            <span>
              ${tr(
                "Если точного результата нет, интерфейс предлагает очистить поиск или проверить другой архив.",
                "When there is no exact result, the interface can clear the query or point you to another archive."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section">
        <h3>${tr("КАТАЛОГ", "CATALOGUE")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("ВИЗУАЛЬНЫЙ АРХИВ", "VISUAL ARCHIVE")}</b>
            <span>
              ${tr(
                "Показывает только стили, для которых уже есть изображения-превью.",
                "Shows only styles that already have image previews."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ВСЕ ПОДДЕРЖИВАЕМЫЕ", "ALL SUPPORTED")}</b>
            <span>
              ${tr(
                "Отдельный индекс поддерживаемых style-тегов модели. Наличие в Supported не означает наличие превью.",
                "A separate index of model-supported style tags. Being Supported does not imply that a preview exists."
              )}
            </span>
          </div>

          <div>
            <b>MAIN / ALT</b>
            <span>
              ${tr(
                "Фильтры по пресетам, в которых были получены визуальные примеры.",
                "Filters for the presets used to produce visual examples."
              )}
            </span>
          </div>

          <div>
            <b>${tr("СОРТИРОВКА", "SORTING")}</b>
            <span>
              ${tr(
                "Архивный порядок, новые, старые, A–Z, случайный порядок и сортировка сохранённых по времени добавления.",
                "Archive order, newest, oldest, A–Z, random order, and Saved sorting by time added."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section">
        <h3>${tr("ИНСТРУМЕНТЫ СТИЛЕЙ", "STYLE TOOLS")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("ИЗБРАННОЕ", "SAVED")}</b>
            <span>
              ${tr(
                "Постоянный локальный список. Избранное открывается в отдельной вкладке, поэтому текущая позиция в архиве не теряется.",
                "A persistent local list. Saved opens in a separate tab, so your current archive position is preserved."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ДОБАВЛЕННЫЕ", "ADDED")}</b>
            <span>
              ${tr(
                "Временный рабочий список стилей, который можно скопировать одной строкой.",
                "A temporary working list of styles that can be copied in one line."
              )}
            </span>
          </div>

          <div>
            <b>${tr("НЕДАВНИЕ", "RECENT")}</b>
            <span>
              ${tr(
                "Последние просмотренные стили с превью для быстрого возврата.",
                "Recently viewed preview styles for quick return."
              )}
            </span>
          </div>

          <div>
            <b>${tr("КОПИРОВАНИЕ", "COPY")}</b>
            <span>
              ${tr(
                "Название стиля копируется одним нажатием. В просмотрщике также доступна отдельная ссылка на стиль.",
                "A style name copies with one click. The viewer also provides a direct style link."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section">
        <h3>${tr("ПРОСМОТРЩИК", "VIEWER")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("ПОЛНЫЙ ЭКРАН", "FULL SCREEN")}</b>
            <span>
              ${tr(
                "Изображение открывается в максимально доступном размере; несколько превью переключаются стрелками интерфейса.",
                "Images open at the maximum available size; multiple previews use the on-screen arrows."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ДЕЙСТВИЯ", "ACTIONS")}</b>
            <span>
              ${tr(
                "Из просмотрщика можно сохранить стиль, добавить его во временный список и скопировать прямую ссылку.",
                "From the viewer you can save a style, add it to the temporary list, and copy a direct link."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section info-v004-last">
        <h3>${tr("ИНТЕРФЕЙС И УПРАВЛЕНИЕ", "INTERFACE & CONTROLS")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("РАЗМЕР СЕТКИ", "GRID SIZE")}</b>
            <span>
              ${tr(
                "Компактный, обычный и крупный режимы карточек.",
                "Compact, Normal, and Large card layouts."
              )}
            </span>
          </div>

          <div>
            <b>RU / EN · LIGHT / DARK</b>
            <span>
              ${tr(
                "Язык и тема сохраняются локально в браузере.",
                "Language and theme preferences are stored locally in the browser."
              )}
            </span>
          </div>

          <div>
            <b>${tr("КЛАВИАТУРА", "KEYBOARD")}</b>
            <span>
              ${tr(
                "Глобальные горячие клавиши отключены. Единственная специальная клавиша — Esc: она закрывает открытые окна и меню.",
                "Global keyboard shortcuts are disabled. Esc is the only special key and closes open dialogs and menus."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ЛОКАЛЬНЫЕ ДАННЫЕ", "LOCAL DATA")}</b>
            <span>
              ${tr(
                "Избранное, Добавленные, Недавние, поисковая история, язык и тема хранятся только в вашем браузере.",
                "Saved, Added, Recent, search history, language, and theme are stored only in your browser."
              )}
            </span>
          </div>
        </div>
      </section>

      <div class="info-v004-footer">
        STYLE / ARCHIVE · ${RELEASE}
      </div>
    `;
  }

  function render() {
    if (!shell) return;
    shell.innerHTML = infoHtml();
  }

  function mount() {
    app = window.STYLE_ARCHIVE_V003;
    dialog = document.querySelector("#infoDialog");

    if (!dialog) {
      console.warn("[v0.0.4] info: #infoDialog not found");
      return;
    }

    dialog.classList.add("info-v004-active");

    shell = dialog.querySelector(".info-v004-shell");

    if (!shell) {
      shell = document.createElement("div");
      shell.className = "info-v004-shell";
      dialog.appendChild(shell);
    }

    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-info-v004-close]")) {
        dialog.close();
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("#infoButton, #languageButton")) {
        window.setTimeout(render, 20);
      }
    }, true);

    new MutationObserver(() => render()).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ["lang", "data-archive-v004"] }
    );

    render();

    window.STYLE_ARCHIVE_INFO_V004 = {
      render,
      version: RELEASE,
    };

    console.info("[v0.0.4] modern INFO loaded");
  }

  let tries = 0;

  const timer = window.setInterval(() => {
    tries += 1;

    if (
      window.STYLE_ARCHIVE_V003?.state &&
      document.querySelector("#infoDialog")
    ) {
      window.clearInterval(timer);
      mount();
      return;
    }

    if (tries >= 150) {
      window.clearInterval(timer);
      console.warn("[v0.0.4] info: app not ready");
    }
  }, 100);
})();
