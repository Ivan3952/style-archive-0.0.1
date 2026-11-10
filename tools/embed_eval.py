#!/usr/bin/env python3
"""Оценка эмбеддингов: цифры и контактные листы «стиль и его ближайшие соседи».

  py tools\\embed_eval.py --archive am --models siglip2,dinov2
  py tools\\embed_eval.py --archive am --models siglip2 --names "@pecopecosupipi,@wang-xi" --samples 10

Пишет в reports/embed/: <архив>.<модель>.png (листы) и <архив>.txt (метрики). Эти два файла и нужно прислать.

Метрика hit@k считается автоматически: у художников с несколькими превью берётся одно, и проверяется, найдёт ли
оно по сходству СВОЙ стиль среди тысяч других (остальные превью этого стиля в запрос не входят). Превью одного
художника рисуют разных персонажей, поэтому высокий hit@k = модель ловит манеру, а не содержание.
Листы нужны, чтобы проверить глазами то, что цифры не видят.
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from embed_lib import (  # noqa: E402
    ROOT, emb_path, group_styles, leave_one_out, load_archive, load_embeddings, media_file, nearest, style_matrix,
)

THUMB_H = 220
LABEL_H = 38


def font(size: int):
    for name in ("DejaVuSans.ttf", "arial.ttf", "Arial.ttf", "NotoSans-Regular.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def tile(root: Path, media: dict, media_id: str, label: str, sim: float | None, highlight: bool) -> Image.Image:
    with Image.open(media_file(root, media, media_id, "thumb")) as im:
        im = im.convert("RGB")
    w = max(60, round(im.width * THUMB_H / im.height))
    canvas = Image.new("RGB", (w, THUMB_H + LABEL_H), (28, 28, 28))
    canvas.paste(im.resize((w, THUMB_H)), (0, 0))
    d = ImageDraw.Draw(canvas)
    f = font(13)
    d.text((4, THUMB_H + 3), label[: max(8, w // 8)], fill=(255, 255, 255), font=f)
    if sim is not None:
        d.text((4, THUMB_H + 20), f"{sim:.3f}", fill=(190, 255, 80), font=f)
    if highlight:
        d.rectangle((0, 0, w - 1, THUMB_H + LABEL_H - 1), outline=(190, 255, 80), width=3)
    return canvas


def contact_sheet(root, media, groups, normed, query_idx, k=8) -> Image.Image:
    rows = []
    for qi in query_idx:
        tiles = [tile(root, media, groups[qi]["ids"][0], groups[qi]["name"], None, True)]
        for j, sim in nearest(normed, qi, k):
            tiles.append(tile(root, media, groups[j]["ids"][0], groups[j]["name"], sim, False))
        rows.append(tiles)
    width = max(sum(t.width + 6 for t in r) for r in rows)
    height = sum(THUMB_H + LABEL_H + 10 for _ in rows)
    sheet = Image.new("RGB", (width, height), (12, 12, 12))
    y = 0
    for r in rows:
        x = 0
        for t in r:
            sheet.paste(t, (x, y))
            x += t.width + 6
        y += THUMB_H + LABEL_H + 10
    return sheet


def pick_queries(groups, names: list[str], samples: int, seed: int) -> list[int]:
    from embed_lib import match_key

    index = {match_key(g["name"]): i for i, g in enumerate(groups)}
    chosen = [index[match_key(n)] for n in names if match_key(n) in index]
    missing = [n for n in names if match_key(n) not in index]
    if missing:
        print("Не найдены (нет векторов или названия):", ", ".join(missing), file=sys.stderr)
    rng = random.Random(seed)
    rest = [i for i in range(len(groups)) if i not in chosen]
    return chosen + rng.sample(rest, min(samples, len(rest)))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--archive", default="am", choices=["am", "opus", "sky"])
    ap.add_argument("--models", default="siglip2,dinov2")
    ap.add_argument("--samples", type=int, default=12)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--names", default="", help="названия стилей через запятую, которые обязательно показать")
    ap.add_argument("--root", type=Path, default=ROOT, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)

    root: Path = args.root
    styles, media = load_archive(root, args.archive)
    out_dir = root / "reports" / "embed"
    out_dir.mkdir(parents=True, exist_ok=True)
    names = [n.strip() for n in args.names.split(",") if n.strip()]
    lines = [f"Архив {args.archive}"]
    for model in [m.strip() for m in args.models.split(",") if m.strip()]:
        path = emb_path(model, args.archive, root)
        if not path.exists():
            print(f"Нет {path}: сначала tools/embed_styles.py --model {model}", file=sys.stderr)
            continue
        emb = load_embeddings(path)
        groups = group_styles(styles, emb)
        _, normed = style_matrix(groups, emb)
        loo = leave_one_out(groups, emb)
        lines.append(f"\n[{model}] векторов картинок {len(emb)}, стилей (групп) {len(groups)}, размерность {normed.shape[1]}")
        if loo.get("queries"):
            lines.append(
                f"  поиск своего стиля по одной картинке ({loo['queries']} запросов): "
                f"hit@1 {loo['hit@1']:.1%}, hit@5 {loo['hit@5']:.1%}, hit@10 {loo['hit@10']:.1%}, MRR {loo['mrr']:.3f}; "
                f"случайно hit@10 ≈ {loo['random@10']:.2%}"
            )
        queries = pick_queries(groups, names, args.samples, args.seed)
        sheet_path = out_dir / f"{args.archive}.{model}.png"
        contact_sheet(root, media, groups, normed, queries).save(sheet_path)
        lines.append(f"  лист: {sheet_path.relative_to(root)}")
    text = "\n".join(lines)
    (out_dir / f"{args.archive}.txt").write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
