"""Общие функции для эмбеддингов стилей (только numpy и Pillow, без torch)."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
EMB_DIR = ROOT / "embeddings"


def match_key(name: str) -> str:
    """Один художник = одна группа: как склейка названий на сайте, плюс «_» == пробел."""
    value = unicodedata.normalize("NFKC", name or "").lower().replace("ё", "е").strip()
    return re.sub(r"\s+", " ", value).replace("_", " ")


def load_archive(root: Path, key: str) -> tuple[list[dict], dict]:
    cfg = json.loads((root / "data" / "archives.json").read_text(encoding="utf-8"))["archives"][key]
    styles = json.loads((root / cfg["styles"].lstrip("./")).read_text(encoding="utf-8"))
    media = json.loads((root / cfg["media"].lstrip("./")).read_text(encoding="utf-8"))
    return styles, media


def media_file(root: Path, media: dict, media_id: str, kind: str = "src") -> Path:
    return root / media[media_id][kind].lstrip("/")


def emb_path(model: str, archive: str, root: Path = ROOT) -> Path:
    return root / "embeddings" / f"{archive}.{model}.npz"


def save_embeddings(path: Path, ids: list[str], vecs: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(path, ids=np.array(ids), vecs=vecs.astype(np.float16))


def load_embeddings(path: Path) -> dict[str, np.ndarray]:
    data = np.load(path, allow_pickle=False)
    return dict(zip(data["ids"].tolist(), data["vecs"].astype(np.float32)))


def normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-12)


def group_styles(styles: list[dict], emb: dict[str, np.ndarray]) -> list[dict]:
    """Группы стилей (одно название) с картинками, у которых есть вектор. reference_media не берём:
    это общая картинка поста, а не превью стиля."""
    groups: dict[str, dict] = {}
    for s in styles:
        ids = [m for m in s.get("media", []) if m in emb]
        if not ids:
            continue
        g = groups.setdefault(match_key(s["name"]), {"name": s["name"], "ids": [], "records": []})
        g["ids"].extend(i for i in ids if i not in g["ids"])
        g["records"].append(s["id"])
    return list(groups.values())


def style_matrix(groups: list[dict], emb: dict[str, np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    """(сумма векторов по группе, нормированное среднее): сумма нужна для leave-one-out."""
    sums = np.stack([np.sum([emb[i] for i in g["ids"]], axis=0) for g in groups])
    return sums, normalize(sums)


def nearest(matrix: np.ndarray, index: int, k: int) -> list[tuple[int, float]]:
    sims = matrix @ matrix[index]
    sims[index] = -np.inf
    top = np.argpartition(-sims, min(k, len(sims) - 1))[:k]
    top = top[np.argsort(-sims[top])]
    return [(int(i), float(sims[i])) for i in top]


def leave_one_out(groups: list[dict], emb: dict[str, np.ndarray], ks=(1, 5, 10)) -> dict:
    """Насколько вектор отдельной картинки находит СВОЙ стиль среди всех.

    Для стилей с двумя и более превью: запрос = первая картинка, у своего стиля она исключается из среднего.
    Превью одного художника рисуют разных персонажей, поэтому высокий результат значит, что модель
    ловит стиль, а не содержание (позу, персонажа, фон). Случайный выбор даёт примерно k / число стилей.
    """
    sums, normed = style_matrix(groups, emb)
    rows = [i for i, g in enumerate(groups) if len(g["ids"]) >= 2]
    if not rows:
        return {"queries": 0}
    q = np.stack([emb[groups[i]["ids"][0]] for i in rows])
    q = normalize(q)
    sims = q @ normed.T
    own = np.array([float(q[n] @ normalize(sums[i] - emb[groups[i]["ids"][0]])) for n, i in enumerate(rows)])
    sims[np.arange(len(rows)), rows] = own
    rank = (sims > own[:, None]).sum(axis=1)  # сколько стилей оказалось ближе своего
    out = {"queries": len(rows), "styles": len(groups), "mrr": float(np.mean(1.0 / (rank + 1)))}
    for k in ks:
        out[f"hit@{k}"] = float(np.mean(rank < k))
    out["random@10"] = min(1.0, 10 / len(groups))
    return out
