/*
 * Тесты разбора промптов (src/legacy/prompt-parse-v007.js) без браузера.
 * Запуск: node tests/prompt_parse.test.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

globalThis.window = {};
globalThis.document = {
  readyState: "loading",
  documentElement: { lang: "ru" },
  addEventListener() {},
};

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
require(path.join(root, "src/legacy/prompt-parse-v007.js"));

const { parsePrompt, looksLikePrompt, levenshtein } = window.STYLE_ARCHIVE_PROMPT_V007;

const names = (text) => parsePrompt(text).items.map((item) => [item.name, item.weight, item.blend]);

let passed = 0;
const check = (title, fn) => {
  fn();
  passed += 1;
  console.log(`ok  ${title}`);
};

check("через запятую, вес, смесь и остаток", () => {
  const result = parsePrompt("1girl, @mikami saka, (@nama udon:0.8), @[a|@b|c d], sketch");
  assert.deepEqual(
    result.items.map((item) => [item.name, item.weight, item.blend]),
    [
      ["@mikami saka", 1, false],
      ["@nama udon", 0.8, false],
      ["@a", 1, true],
      ["@b", 1, true],
      ["@c d", 1, true],
    ]
  );
  assert.equal(result.leftover, "1girl, sketch");
});

check("скобки и двоеточия в именах", () => {
  assert.deepEqual(names("@hiten \\(hitenkei\\), (@re:rin:0.7), @rib:y(uhki)"), [
    ["@hiten (hitenkei)", 1, false],
    ["@re:rin", 0.7, false],
    ["@rib:y(uhki)", 1, false],
  ]);
  assert.deepEqual(names("(@hiten (hitenkei):1.1), ((@solo_tag))"), [
    ["@hiten (hitenkei)", 1.1, false],
    ["@solo_tag", 1, false],
  ]);
});

check("переводы строк и «by @name»", () => {
  const result = parsePrompt("girl on the left\n@one\nart by @two, blue theme");
  assert.deepEqual(
    result.items.map((item) => item.name),
    ["@one", "@two"]
  );
  assert.equal(result.leftover, "girl on the left, art by, blue theme");
});

check("эмодзи не сдвигают позиции", () => {
  const result = parsePrompt("😀😀, (@x:0.9), tail");
  assert.deepEqual(
    result.items.map((item) => [item.name, item.weight]),
    [["@x", 0.9]]
  );
  assert.equal(result.leftover, "😀😀, tail");
});

check("распознавание промпта при вставке", () => {
  assert.equal(looksLikePrompt("@one"), false);
  assert.equal(looksLikePrompt("@one, @two"), true);
  assert.equal(looksLikePrompt("(@one:0.8)"), true);
  assert.equal(looksLikePrompt("@[a|b]"), true);
  assert.equal(looksLikePrompt("mail@x.com, foo@bar"), false);
});

check("расстояние Левенштейна с порогом", () => {
  assert.equal(levenshtein("megrocks", "megrockax", 2), 2);
  assert.equal(levenshtein("abc", "abc", 2), 0);
  assert.ok(levenshtein("short", "completely different", 2) > 2);
});

console.log(`\n${passed} проверок пройдено`);
