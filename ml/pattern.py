from __future__ import annotations

from dataclasses import asdict
from datetime import timezone

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_distances

from .assets import AssetConfig
from .features import FEATURE_COLUMNS

HORIZONS = {"1h": 1, "24h": 24, "72h": 72, "168h": 168}


def find_similar_windows(
    features: pd.DataFrame,
    asset: AssetConfig,
    window_hours: int = 24,
    k: int = 10,
    zscore_hours: int = 24 * 30,
) -> dict:
    if len(features) < window_hours * 2:
        return _empty_result(features, asset, k)

    normalized = _rolling_zscore(features, FEATURE_COLUMNS, zscore_hours)
    # Carry the raw close alongside the z-scored features so forward returns are computed in price space.
    normalized = normalized.assign(raw_close=features["close"].to_numpy())
    normalized = normalized.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
    if len(normalized) < window_hours * 2:
        return _empty_result(features, asset, k)

    current = normalized.iloc[-window_hours:][FEATURE_COLUMNS].to_numpy().reshape(1, -1)
    candidates: list[tuple[int, np.ndarray]] = []
    last_allowed_start = len(normalized) - window_hours - max(HORIZONS.values())
    for start in range(0, max(last_allowed_start + 1, 0)):
        window = normalized.iloc[start : start + window_hours][FEATURE_COLUMNS].to_numpy()
        if window.shape[0] == window_hours:
            candidates.append((start, window.reshape(-1)))

    if not candidates:
        return _empty_result(features, asset, k)

    matrix = np.vstack([candidate[1] for candidate in candidates])
    distances = cosine_distances(current, matrix)[0]
    top_indices = np.argsort(distances)[:k]
    matches = []
    for rank in top_indices:
        start = candidates[int(rank)][0]
        end = start + window_hours - 1
        base_close = float(normalized.iloc[end]["raw_close"])
        if base_close <= 0:
            continue
        forward_returns = {}
        for label, offset in HORIZONS.items():
            forward_close = float(normalized.iloc[end + offset]["raw_close"])
            forward_returns[label] = (forward_close / base_close) - 1
        matches.append(
            {
                "match_start": _iso(normalized.iloc[start]["open_time"]),
                "distance": round(float(distances[int(rank)]), 6),
                "forward_returns": forward_returns,
            }
        )

    return {
        "asset": asset.id,
        "as_of": _iso(features.iloc[-1]["open_time"]),
        "k": len(matches),
        "matches": matches,
        "summary": _summarize(matches),
        "asset_config": asdict(asset),
    }


def _rolling_zscore(frame: pd.DataFrame, columns: list[str], zscore_hours: int) -> pd.DataFrame:
    normalized = frame.copy()
    for column in columns:
        mean = normalized[column].rolling(window=zscore_hours, min_periods=min(48, zscore_hours)).mean()
        std = normalized[column].rolling(window=zscore_hours, min_periods=min(48, zscore_hours)).std()
        normalized[column] = (normalized[column] - mean) / std.replace(0, np.nan)
    return normalized.replace([np.inf, -np.inf], np.nan)


def _summarize(matches: list[dict]) -> dict:
    summary = {}
    for label in HORIZONS:
        values = np.array([match["forward_returns"][label] for match in matches], dtype=float)
        if len(values) == 0:
            continue
        summary[f"horizon_{label}"] = {
            "mean": float(np.mean(values)),
            "median": float(np.median(values)),
            "p10": float(np.percentile(values, 10)),
            "p90": float(np.percentile(values, 90)),
            "n_positive": int(np.sum(values > 0)),
        }
    return summary


def _empty_result(features: pd.DataFrame, asset: AssetConfig, k: int) -> dict:
    as_of = _iso(features.iloc[-1]["open_time"]) if len(features) else None
    return {"asset": asset.id, "as_of": as_of, "k": k, "matches": [], "summary": {}, "asset_config": asdict(asset)}


def _iso(value: pd.Timestamp) -> str:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize(timezone.utc)
    return timestamp.isoformat().replace("+00:00", "Z")
