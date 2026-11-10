#!/usr/bin/env python3
"""Считает эмбеддинги превью стилей на видеокарте и кладёт их в embeddings/ (в git не попадают).

Запуск (Windows, PowerShell, из корня репозитория):
  py -m pip install -r requirements-embed.txt        # torch ставится отдельно, см. docs/INTELLIGENCE.md
  py tools\\embed_styles.py --archive am --model siglip2
  py tools\\embed_styles.py --archive all --model dinov2

Модели (подгружаются с Hugging Face при первом запуске):
  siglip2  google/siglip2-so400m-patch14-384   ~1152 мерности, понимает текст (нужен для умного поиска)
  clip     openai/clip-vit-large-patch14       768, запасной вариант
  dinov2   facebook/dinov2-base                768, чисто визуальный, текста не знает

Файл embeddings/<архив>.<модель>.npz хранит id картинок и нормированные векторы (float16).
Повторный запуск досчитывает только недостающие картинки, можно прерывать и продолжать.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from embed_lib import ROOT, emb_path, load_archive, load_embeddings, media_file, normalize, save_embeddings  # noqa: E402

MODELS = {
    "siglip2": "google/siglip2-so400m-patch14-384",
    "clip": "openai/clip-vit-large-patch14",
    "dinov2": "facebook/dinov2-base",
}


def missing_ids(wanted: list[str], existing: dict) -> list[str]:
    return [i for i in wanted if i not in existing]


def referenced_media(styles: list[dict]) -> list[str]:
    seen, out = set(), []
    for s in styles:
        for m in s.get("media", []):
            if m not in seen:
                seen.add(m)
                out.append(m)
    return out


def build_model(name: str, device: str):
    import torch
    from transformers import AutoImageProcessor, AutoModel

    repo = MODELS[name]
    processor = AutoImageProcessor.from_pretrained(repo)
    model = AutoModel.from_pretrained(repo, torch_dtype=torch.float16 if device == "cuda" else torch.float32)
    model.to(device).eval()

    def encode(pixel_values):
        with torch.no_grad():
            pv = pixel_values.to(device, dtype=model.dtype)
            if name == "dinov2":
                out = model(pixel_values=pv).last_hidden_state[:, 0]  # CLS-токен
            else:
                out = model.get_image_features(pixel_values=pv)
            return out.float().cpu().numpy()

    return processor, encode


def run(archive: str, model_name: str, batch: int, workers: int, limit: int | None) -> None:
    import torch
    from PIL import Image

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        print("ВНИМАНИЕ: CUDA недоступна, считаем на процессоре: это будет очень медленно.", file=sys.stderr)
    styles, media = load_archive(ROOT, archive)
    wanted = [m for m in referenced_media(styles) if m in media]
    path = emb_path(model_name, archive)
    existing = load_embeddings(path) if path.exists() else {}
    todo = missing_ids(wanted, existing)
    if limit:
        todo = todo[:limit]
    print(f"{archive}/{model_name}: картинок {len(wanted)}, уже есть {len(existing)}, считаем {len(todo)}, устройство {device}")
    if not todo:
        return

    processor, encode = build_model(model_name, device)

    class DS(torch.utils.data.Dataset):
        def __len__(self):
            return len(todo)

        def __getitem__(self, i):
            with Image.open(media_file(ROOT, media, todo[i], "src")) as im:
                return processor(images=im.convert("RGB"), return_tensors="pt")["pixel_values"][0]

    loader = torch.utils.data.DataLoader(DS(), batch_size=batch, num_workers=workers, shuffle=False)
    ids_done, chunks, started, since_save = list(existing), [np.stack(list(existing.values()))] if existing else [], time.time(), 0
    n = 0
    try:
        for pv in loader:
            vec = normalize(encode(pv))
            chunks.append(vec)
            ids_done.extend(todo[n : n + len(vec)])
            n += len(vec)
            since_save += len(vec)
            if since_save >= 2000:
                save_embeddings(path, ids_done, np.concatenate(chunks))
                since_save = 0
            rate = n / max(1e-6, time.time() - started)
            print(f"\r{n}/{len(todo)}  {rate:.1f} картинок/с", end="", flush=True)
    finally:
        if chunks:
            save_embeddings(path, ids_done, np.concatenate(chunks))
    print(f"\nГотово: {path} ({len(ids_done)} векторов, {time.time() - started:.0f} с)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--archive", default="am", choices=["am", "opus", "sky", "all"])
    ap.add_argument("--model", default="siglip2", choices=sorted(MODELS))
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--limit", type=int, help="посчитать только первые N недостающих (для пробы скорости)")
    args = ap.parse_args()
    for archive in (["am", "opus", "sky"] if args.archive == "all" else [args.archive]):
        run(archive, args.model, args.batch, args.workers, args.limit)
    return 0


if __name__ == "__main__":
    sys.exit(main())
