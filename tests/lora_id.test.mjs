/*
 * Тесты поиска LoRA по ID (src/loras/id-search.js) без браузера.
 * Запуск: node tests/lora_id.test.mjs
 */
import assert from "node:assert/strict";
import { extractLoraRef } from "../src/loras/id-search.js";

const id = (q) => extractLoraRef(q)?.id ?? null;
assert.equal(id("2560840"), "2560840", "голый ID");
assert.equal(id("  #2560840 "), "2560840", "ID с решёткой и пробелами");
assert.equal(id("<lora:2560840:0.8>"), "2560840", "строка из промпта");
assert.equal(id("<lora:2560840>"), "2560840", "без веса");
assert.equal(id("lora:2560840:1"), "2560840", "без скобок");
assert.equal(id("https://civitai.com/models/2560840?modelVersionId=2979642"), "2560840", "ссылка на модель");
assert.equal(id("https://civitai.com/models/14365/anima-turbo"), "14365", "ссылка со слагом");
assert.equal(id("2024"), null, "короткое число — это текст, а не ID");
assert.equal(id("1girl"), null, "тег");
assert.equal(id("anima 2560840"), null, "ID внутри текста — обычный поиск");
assert.equal(id(""), null, "пусто");
assert.equal(id(null), null, "null");
console.log("ok: поиск LoRA по ID");
