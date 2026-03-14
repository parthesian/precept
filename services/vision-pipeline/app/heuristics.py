from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def average_hash(image: Image.Image) -> int:
    small = image.convert("L").resize((8, 8))
    arr = np.asarray(small, dtype=np.float32)
    mean = arr.mean()
    bits = (arr >= mean).flatten()
    value = 0
    for idx, bit in enumerate(bits):
        if bit:
            value |= 1 << idx
    return value


def hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def entropy(gray: np.ndarray) -> float:
    hist, _ = np.histogram(gray, bins=256, range=(0, 255), density=True)
    hist = hist[hist > 0]
    return float(-np.sum(hist * np.log2(hist)))


def blur_score(image: Image.Image) -> float:
    gray = image.convert("L")
    lap = gray.filter(ImageFilter.FIND_EDGES)
    arr = np.asarray(lap, dtype=np.float32)
    return float(arr.var())


def frame_features(path: str) -> dict[str, float | int]:
    img = Image.open(path)
    gray_arr = np.asarray(img.convert("L"), dtype=np.float32)
    return {
        "entropy": entropy(gray_arr),
        "sharpness": blur_score(img),
        "hash": average_hash(img),
    }


def normalize_vector(values: np.ndarray, target_dim: int = 512) -> list[float]:
    if values.size == 0:
        return [0.0] * target_dim
    if values.size < target_dim:
        repeats = int(math.ceil(target_dim / values.size))
        values = np.tile(values, repeats)
    values = values[:target_dim]
    norm = float(np.linalg.norm(values))
    if norm > 0:
        values = values / norm
    return [float(x) for x in values]


def embedding_from_image(path: str) -> list[float]:
    img = Image.open(path).convert("RGB").resize((64, 64))
    arr = np.asarray(img, dtype=np.float32)
    hist_r, _ = np.histogram(arr[:, :, 0], bins=64, range=(0, 255), density=True)
    hist_g, _ = np.histogram(arr[:, :, 1], bins=64, range=(0, 255), density=True)
    hist_b, _ = np.histogram(arr[:, :, 2], bins=64, range=(0, 255), density=True)
    gray = np.asarray(img.convert("L"), dtype=np.float32)
    gx = np.diff(gray, axis=1).flatten()
    gy = np.diff(gray, axis=0).flatten()
    stat = np.array(
        [
            gray.mean(),
            gray.std(),
            gray.min(),
            gray.max(),
            np.percentile(gray, 25),
            np.percentile(gray, 50),
            np.percentile(gray, 75),
        ],
        dtype=np.float32,
    )
    base = np.concatenate([hist_r, hist_g, hist_b, gx[:96], gy[:96], stat])
    return normalize_vector(base, 512)


def ensure_paths_exist(paths: list[str]) -> None:
    missing = [path for path in paths if not Path(path).exists()]
    if missing:
        raise FileNotFoundError(f"Missing frame files: {missing[:3]}")
