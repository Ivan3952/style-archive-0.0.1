import { defineConfig } from "vite";
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [copyRuntimeData()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
  },
});
