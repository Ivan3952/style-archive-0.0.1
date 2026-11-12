import { defineConfig } from "vite";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
const CODENAME = "Clean Slate";

/* Дата релиза = день сборки (по Москве); «проверенные стили до» = самая поздняя дата публикации в данных. */
const BUILD_DATE = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date());

function dataDate() {
  const root = process.cwd();
  const config = JSON.parse(readFileSync(resolve(root, "data/archives.json"), "utf8"));
  let latest = "";
  for (const archive of Object.values(config.archives)) {
    if (!archive.styles) continue;
    const styles = JSON.parse(readFileSync(resolve(root, archive.styles), "utf8"));
    for (const style of styles) {
      const day = String(style.published_at || "").slice(0, 10);
      if (day > latest) latest = day;
    }
  }
  const [y, m, d] = latest.split("-");
  return latest ? `${d}.${m}.${y}` : BUILD_DATE;
}

const DATA_DATE = dataDate();

/*
 * Сайт читает данные запросами (fetch), поэтому JSON лежит в dist/data как есть.
 * Копируем только то, что реально нужно в браузере: список берём из data/archives.json,
 * чтобы он оставался единственным источником правды. Тяжёлый data/danbooru.json
 * (полная версия для скриптов) на сайт не попадает.
 */
function copyRuntimeData() {
  return {
    name: "copy-runtime-data",
    apply: "build",
    closeBundle() {
      const root = process.cwd();
      const config = JSON.parse(readFileSync(resolve(root, "data/archives.json"), "utf8"));
      const files = new Set(["./data/archives.json", "./data/danbooru.min.json"]);
      for (const archive of Object.values(config.archives)) {
        for (const key of ["styles", "media", "supported"]) {
          if (archive[key]) files.add(archive[key]);
        }
      }
      /* персонажи Stable Waifu (0.1.3): файл появляется после первого импорта */
      if (existsSync(resolve(root, "data/characters.json"))) files.add("./data/characters.json");
      for (const rel of files) {
        const from = resolve(root, rel);
        const to = resolve(root, "dist", rel);
        mkdirSync(dirname(to), { recursive: true });
        cpSync(from, to);
      }
      console.log(`copy-runtime-data: ${files.size} файлов данных в dist/data`);
    },
  };
}

function injectVersion() {
  return {
    name: "inject-version",
    transformIndexHtml: (html) =>
      html
        .replaceAll("%APP_VERSION%", pkg.version)
        .replaceAll("%BUILD_DATE%", BUILD_DATE)
        .replaceAll("%DATA_DATE%", DATA_DATE),
  };
}

export default defineConfig({
  base: "./",
  publicDir: "public",
  define: {
    // единственный источник версии: поле version в package.json
    __APP_RELEASE__: JSON.stringify(`v${pkg.version} · ${CODENAME}`),
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [injectVersion(), copyRuntimeData()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        characters: resolve(process.cwd(), "characters.html"),
      },
    },
  },
});
