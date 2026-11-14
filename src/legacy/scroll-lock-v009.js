/*
 * Блокировка прокрутки под окнами 0.1.3.
 * <dialog>.showModal() не мешает странице под ним прокручиваться: под открытым просмотрщиком,
 * окном «Промпт» или «Инфо» колесо и свайп листали архив. Пока открыто любое модальное окно,
 * у <html> стоит класс scroll-locked-v009, а CSS снимает прокрутку страницы.
 */
(() => {
  "use strict";

  const root = document.documentElement;

  function sync() {
    const open = [...document.querySelectorAll("dialog")].some((dialog) => dialog.open);
    root.classList.toggle("scroll-locked-v009", open);
  }

  /* окна есть и в разметке, и создаются модулями позже (окно «Промпт»), поэтому следим за всем документом */
  new MutationObserver((records) => {
    if (records.some((record) => record.target instanceof HTMLDialogElement)) sync();
  }).observe(root, { subtree: true, attributes: true, attributeFilter: ["open"] });
})();
