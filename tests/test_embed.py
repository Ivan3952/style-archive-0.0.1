#!/usr/bin/env python3
"""Проверка tools/embed_lib.py и embed_eval.py на синтетических векторах (torch не нужен)."""
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import embed_eval  # noqa: E402
import embed_lib as lib  # noqa: E402
import embed_styles  # noqa: E402


def main():
    rng = np.random.default_rng(0)
    d, n_styles = 32, 60
    tmp = Path(tempfile.mkdtemp(prefix="emb_test_"))
    (tmp / "data").mkdir()
    (tmp / "media" / "thumb").mkdir(parents=True)
    styles, media, emb = [], {}, {}
    pid = 0
    for s in range(n_styles):
        centre = rng.normal(size=d)
        count = 1 + (s % 3)  # 1, 2 или 3 превью
        ids = []
        for _ in range(count):
            pid += 1
            mid = f"p{pid:06d}"
            vec = lib.normalize(centre + 0.35 * rng.normal(size=d))
            emb[mid], ids = vec, ids + [mid]
            media[mid] = {"src": f"/media/web/{mid}.webp", "thumb": f"/media/thumb/{mid}.webp"}
            Image.new("RGB", (80, 120), (s * 4 % 255, 90, 90)).save(tmp / "media" / "thumb" / f"{mid}.webp")
        styles.append({"id": str(s), "name": f"@artist {s}", "media": ids, "reference_media": []})
    # дубль художника под другим написанием: должен слиться с группой, а не стать «чужим» соседом
    styles.append({"id": "dup", "name": "@ARTIST_1", "media": [], "reference_media": []})

    (tmp / "data" / "styles.json").write_text(json.dumps(styles))
    (tmp / "data" / "media.json").write_text(json.dumps(media))
    (tmp / "data" / "archives.json").write_text(json.dumps({"archives": {"am": {"styles": "./data/styles.json", "media": "./data/media.json"}}}))

    groups = lib.group_styles(styles, emb)
    assert len(groups) == n_styles, len(groups)
    sums, normed = lib.style_matrix(groups, emb)
    assert np.allclose(np.linalg.norm(normed, axis=1), 1, atol=1e-5)

    loo = lib.leave_one_out(groups, emb)
    assert loo["queries"] == 40 and loo["hit@10"] > 0.9 and loo["hit@10"] > 5 * loo["random@10"] - 1, loo
    shuffled = {k: lib.normalize(rng.normal(size=d)) for k in emb}  # шум вместо стиля: метрика обязана упасть
    bad = lib.leave_one_out(groups, shuffled)
    assert bad["hit@1"] < 0.2, bad

    top = lib.nearest(normed, 0, 5)
    assert len(top) == 5 and all(i != 0 for i, _ in top)

    path = lib.emb_path("fake", "am", tmp)
    lib.save_embeddings(path, list(emb), np.stack(list(emb.values())))
    back = lib.load_embeddings(path)
    assert set(back) == set(emb) and np.allclose(back["p000001"], emb["p000001"], atol=1e-2)
    assert embed_styles.missing_ids(["a", "b", "c"], {"b": 1}) == ["a", "c"]

    assert embed_eval.main(["--archive", "am", "--models", "fake", "--samples", "3", "--root", str(tmp)]) == 0
    assert (tmp / "reports" / "embed" / "am.fake.png").exists()
    print("OK: embed")


if __name__ == "__main__":
    main()
