(() => {
  "use strict";

  const RELEASE = __APP_RELEASE__;

  let app = null;
  let dialog = null;
  let shell = null;

  const isRu = () =>
    String(document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("ru");

  const tr = (ru, en) => (isRu() ? ru : en);

  const fmt = (value) => Number(value || 0).toLocaleString(isRu() ? "ru-RU" : "en-US");

  function archiveState() {
    const api = window.STYLE_ARCHIVE_ARCHIVES_V004;
    const key = api?.currentKey || "";

    const current = api?.current;

    return {
      key,
      label: current?.label || "",
      visual: Array.isArray(app?.state?.styles)
        ? app.state.styles.length
        : current?.styleCount || 0,
      supported: current?.supportedCount ?? null,
    };
  }

  // Карточки архивов строятся из data/archives.json (через src/archives.js)
  function stylesWordRu(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "стиль с превью";
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "стиля с превью";
    return "стилей с превью";
  }

  function archivesHtml() {
    const archives = Object.values(window.STYLE_ARCHIVE_ARCHIVES_V004?.archives || {});
    return archives
      .map((archive) => {
        const visual = Number(archive.styleCount || 0);
        const supported =
          archive.supportedCount == null
            ? tr("Списка Supported для этого архива нет.", "This archive has no Supported list.")
            : tr(
                `Supported: ${fmt(archive.supportedCount)}.`,
                `Supported: ${fmt(archive.supportedCount)}.`
              );
        return `
          <article>
            <strong>${archive.label}</strong>
            <p>${tr(`${fmt(visual)} ${stylesWordRu(visual)}.`, `${fmt(visual)} styles with previews.`)} ${supported}</p>
          </article>`;
      })
      .join("");
  }

  function infoHtml() {
    const archive = archiveState();
    const savedCount = app?.state?.saved?.size || 0;

    const supportedValue = archive.supported == null ? "—" : fmt(archive.supported);

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
          "Каталог стилей с превью: найти стиль, посмотреть, как он рисует, скопировать тег.",
          "A catalogue of styles with previews: find a style, see how it draws, copy the tag."
        )}
      </div>

      <div class="info-v004-stats">
        <div>
          <span>${tr("ТЕКУЩИЙ АРХИВ", "CURRENT ARCHIVE")}</span>
          <strong>${archive.label}</strong>
        </div>

        <div>
          <span>${tr("С ПРЕВЬЮ", "WITH PREVIEWS")}</span>
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
        <h3>${tr("ПОИСК И ПОДБОРКИ", "SEARCH & PICKS")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>SMART / WORD / CONTAINS</b>
            <span>
              ${tr(
                "Три режима: умный (по релевантности), по словам и по части названия.",
                "Three modes: smart (ranked), whole words, part of a name."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ПОДСКАЗКИ", "SUGGESTIONS")}</b>
            <span>
              ${tr(
                "Опечатку сайт постарается угадать и предложит похожий стиль.",
                "A typo gets a suggestion for the closest style."
              )}
            </span>
          </div>

          <div>
            <b>${tr("НЕДАВНИЕ ЗАПРОСЫ", "RECENT QUERIES")}</b>
            <span>
              ${tr(
                "Прошлые запросы лежат под строкой поиска. Хранятся только в этом браузере.",
                "Past searches show up under the search box and stay in this browser."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ПРЯМЫЕ ССЫЛКИ", "DEEP LINKS")}</b>
            <span>
              ${tr(
                "Можно скопировать ссылку на стиль или на поиск. Архив записан в адрес.",
                "You can copy a link to a style or a search. The archive is part of the address."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ПОДБОРКИ ПО 12", "DISCOVER 12")}</b>
            <span>
              ${tr(
                "Двенадцать стилей за раз: случайные, новые, ещё не открытые или с несколькими превью.",
                "Twelve styles at a time: random, new, not opened yet, or with several previews."
              )}
            </span>
          </div>

          <div>
            <b>${tr("НИЧЕГО НЕ НАШЛОСЬ", "NOTHING FOUND")}</b>
            <span>
              ${tr(
                "Если совпадений нет, можно очистить поиск или поискать в другом архиве.",
                "If nothing matches, clear the search or try another archive."
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
              ${tr("Только стили, у которых есть превью.", "Only styles that have previews.")}
            </span>
          </div>

          <div>
            <b>${tr("ВСЕ ПОДДЕРЖИВАЕМЫЕ", "ALL SUPPORTED")}</b>
            <span>
              ${tr(
                "Все теги стилей, которые знает модель. Превью есть не у всех.",
                "Every style tag the model knows. Not all of them have previews."
              )}
            </span>
          </div>

          <div>
            <b>MAIN / ALT</b>
            <span>
              ${tr(
                "Фильтр по пресету, на котором сделано превью.",
                "Filter by the preset a preview was made with."
              )}
            </span>
          </div>

          <div>
            <b>${tr("СОРТИРОВКА", "SORTING")}</b>
            <span>
              ${tr(
                "Как в архиве, новые, старые, A–Z, случайно. В избранном ещё по времени добавления.",
                "Archive order, newest, oldest, A–Z, random. In Saved, also by time added."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section">
        <h3>${tr("СО СТИЛЯМИ", "WITH STYLES")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("ИЗБРАННОЕ", "SAVED")}</b>
            <span>
              ${tr(
                "Хранится в браузере. Открывается в новой вкладке, поэтому место в архиве не теряется.",
                "Kept in the browser. Opens in a new tab, so you do not lose your place."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ДОБАВЛЕННЫЕ", "ADDED")}</b>
            <span>
              ${tr(
                "Временный список: набрать стили и скопировать одной строкой.",
                "A scratch list: gather styles and copy them as one line."
              )}
            </span>
          </div>

          <div>
            <b>${tr("НЕДАВНИЕ", "RECENT")}</b>
            <span>
              ${tr(
                "Последние открытые стили, чтобы вернуться к ним.",
                "Styles you opened recently, to get back to them."
              )}
            </span>
          </div>

          <div>
            <b>${tr("КОПИРОВАНИЕ", "COPY")}</b>
            <span>
              ${tr(
                "Клик по названию копирует тег. В просмотре есть ещё ссылка на стиль.",
                "Click a name to copy the tag. The viewer also has a link to the style."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section">
        <h3>${tr("ПРОСМОТР", "VIEWER")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("ПОЛНЫЙ ЭКРАН", "FULL SCREEN")}</b>
            <span>
              ${tr(
                "Картинка открывается крупно. Если превью несколько, листать стрелками.",
                "The image opens large. If there are several previews, flip through with the arrows."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ДЕЙСТВИЯ", "ACTIONS")}</b>
            <span>
              ${tr(
                "В просмотре можно сохранить стиль, добавить его в список и скопировать ссылку.",
                "In the viewer you can save a style, add it to the list, and copy a link."
              )}
            </span>
          </div>
        </div>
      </section>

      <section class="info-v004-section info-v004-last">
        <h3>${tr("ИНТЕРФЕЙС", "INTERFACE")}</h3>

        <div class="info-v004-feature-list">
          <div>
            <b>${tr("ВИД И ФИЛЬТРЫ", "VIEW & FILTERS")}</b>
            <span>
              ${tr(
                "Размер и форма карточек, режим поиска и фильтры Danbooru лежат под кнопкой «Фильтры».",
                "Card size and shape, the search mode and the Danbooru filters are under the Filters button."
              )}
            </span>
          </div>

          <div>
            <b>RU / EN · LIGHT / DARK</b>
            <span>
              ${tr(
                "Язык и тема запоминаются в браузере.",
                "Language and theme are remembered by the browser."
              )}
            </span>
          </div>

          <div>
            <b>${tr("КЛАВИАТУРА", "KEYBOARD")}</b>
            <span>
              ${tr(
                "Горячих клавиш нет, кроме Esc: он закрывает окна и меню.",
                "No shortcuts except Esc, which closes windows and menus."
              )}
            </span>
          </div>

          <div>
            <b>${tr("ГДЕ ХРАНИТСЯ", "WHERE IT IS STORED")}</b>
            <span>
              ${tr(
                "Избранное, список, недавние, история поиска, язык и тема лежат только в этом браузере. Аккаунтов нет.",
                "Saved, the list, recent, search history, language and theme live only in this browser. There are no accounts."
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

    document.addEventListener(
      "click",
      (event) => {
        if (event.target.closest("#infoButton, #languageButton")) {
          window.setTimeout(render, 20);
        }
      },
      true
    );

    new MutationObserver(() => render()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang", "data-archive-v004"],
    });

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

    if (window.STYLE_ARCHIVE_V003?.state && document.querySelector("#infoDialog")) {
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
