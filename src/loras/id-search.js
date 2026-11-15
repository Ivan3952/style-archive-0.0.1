/*
 * Поиск LoRA по ID. В строку поиска можно вставить:
 *   - сам ID модели CivitAI (5–8 цифр): 2560840;
 *   - строку из промпта: <lora:2560840:0.8>;
 *   - ссылку на модель: https://civitai.com/models/2560840?modelVersionId=2979642.
 * Всё остальное — обычный текстовый поиск (null). Короткие числа («1», «2024») ID не считаем:
 * они бывают в названиях и тегах.
 */
export function extractLoraRef(raw) {
  const q = String(raw || "").trim();
  if (!q) return null;
  const link = q.match(/civitai\.com\/models\/(\d{1,9})/i);
  if (link) return { id: link[1] };
  const tag = q.match(/^<?\s*lora\s*:\s*(\d{1,9})(?:\s*:\s*-?[\d.]+)?\s*>?$/i);
  if (tag) return { id: tag[1] };
  const plain = q.match(/^#?(\d{5,9})$/);
  if (plain) return { id: plain[1] };
  return null;
}
