from __future__ import annotations

from dataclasses import asdict
from datetime import timezone

import numpy as np
import pandas as pd

from .assets import AssetConfig
from .features import FEATURE_COLUMNS

DEFAULT_ZSCORE_HOURS = 24 * 30
PATTERN_HORIZONS = {
    12: {"1h": 1, "6h": 6, "12h": 12, "24h": 24},
    24: {"1h": 1, "12h": 12, "24h": 24, "72h": 72},
    72: {"6h": 6, "24h": 24, "72h": 72, "168h": 168},
    168: {"1d": 24, "3d": 72, "7d": 168, "30d": 24 * 30},
}


def find_similar_windows(
    source_frame: pd.DataFrame,
    asset: AssetConfig,
    window_hours: int = 24,
    k: int = 10,
    zscore_hours: int = DEFAULT_ZSCORE_HOURS,
) -> dict:
    row_interval_hours = _infer_row_interval_hours(source_frame)
    window_rows = _hours_to_rows(window_hours, row_interval_hours)
    zscore_rows = _hours_to_rows(zscore_hours, row_interval_hours)
    horizons = PATTERN_HORIZONS.get(window_hours, PATTERN_HORIZONS[24])
    horizon_offsets = {
        label: _hours_to_rows(hours, row_interval_hours)
        for label, hours in horizons.items()
    }

    if len(source_frame) < window_rows * 2:
        return _empty_result(
            source_frame,
            asset,
            k,
            window_hours,
            window_rows,
            row_interval_hours,
            horizons,
        )

    normalized = _rolling_zscore(source_frame, FEATURE_COLUMNS, zscore_rows)
    normalized = normalized.assign(raw_close=source_frame["close"].to_numpy())
    normalized = normalized.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
    if len(normalized) < window_rows * 2:
        return _empty_result(
            source_frame,
            asset,
            k,
            window_hours,
            window_rows,
            row_interval_hours,
            horizons,
        )

    values = normalized[FEATURE_COLUMNS].to_numpy(dtype=float)
    current = values[-window_rows:].reshape(-1)
    last_allowed_start = len(normalized) - window_rows - max(horizon_offsets.values())
    candidate_starts = np.arange(0, max(last_allowed_start + 1, 0), dtype=int)

    if len(candidate_starts) == 0:
        return _empty_result(
            source_frame,
            asset,
            k,
            window_hours,
            window_rows,
            row_interval_hours,
            horizons,
        )

    distances = _cosine_distances(current, values, candidate_starts, window_rows)
    top_indices = np.argsort(distances)[:k]
    matches = []
    for rank in top_indices:
        start = int(candidate_starts[int(rank)])
        end = start + window_rows - 1
        base_close = float(normalized.iloc[end]["raw_close"])
        if base_close <= 0:
            continue
        forward_returns = {}
        for label, offset in horizon_offsets.items():
            forward_close = float(normalized.iloc[end + offset]["raw_close"])
            forward_returns[label] = (forward_close / base_close) - 1
        matches.append(
            {
                "match_start": _iso(normalized.iloc[start]["open_time"]),
                "distance": round(float(distances[int(rank)]), 6),
                "forward_returns": forward_returns,
                "match_series": _window_series(normalized, start, window_rows),
            }
        )

    current_start = len(normalized) - window_rows
    current_series = _window_series(normalized, current_start, window_rows)

    return {
        "asset": asset.id,
        "as_of": _iso(source_frame.iloc[-1]["open_time"]),
        "window_hours": window_hours,
        "window_rows": window_rows,
        "source_interval_hours": row_interval_hours,
        "horizons": list(horizons.keys()),
        "k": len(matches),
        "current_series": current_series,
        "matches": matches,
        "summary": _summarize(matches, horizons),
        "asset_config": asdict(asset),
    }


def _window_series(
    normalized: pd.DataFrame, start: int, window_rows: int
) -> list[dict]:
    base = float(normalized.iloc[start]["raw_close"])
    if base <= 0:
        return []
    closes = normalized.iloc[start : start + window_rows]["raw_close"].to_numpy(
        dtype=float
    )
    return [
        {"t": int(i), "pct_change_from_start": float(c / base - 1)}
        for i, c in enumerate(closes)
    ]


def _rolling_zscore(
    frame: pd.DataFrame, columns: list[str], zscore_rows: int
) -> pd.DataFrame:
    normalized = frame.copy()
    for column in columns:
        mean = (
            normalized[column]
            .rolling(window=zscore_rows, min_periods=min(48, zscore_rows))
            .mean()
        )
        std = (
            normalized[column]
            .rolling(window=zscore_rows, min_periods=min(48, zscore_rows))
            .std()
        )
        zscored = (normalized[column] - mean) / std.replace(0, np.nan)
        normalized[column] = zscored.mask(std == 0, 0)
    return normalized.replace([np.inf, -np.inf], np.nan)


def _summarize(matches: list[dict], horizons: dict[str, int]) -> dict:
    summary = {}
    for label in horizons:
        values = np.array(
            [match["forward_returns"][label] for match in matches], dtype=float
        )
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


def _cosine_distances(
    current: np.ndarray,
    values: np.ndarray,
    candidate_starts: np.ndarray,
    window_rows: int,
    chunk_size: int = 2048,
) -> np.ndarray:
    distances = np.empty(len(candidate_starts), dtype=float)
    current_norm = np.linalg.norm(current)
    for offset in range(0, len(candidate_starts), chunk_size):
        starts = candidate_starts[offset : offset + chunk_size]
        matrix = np.stack(
            [values[start : start + window_rows].reshape(-1) for start in starts]
        )
        norms = np.linalg.norm(matrix, axis=1)
        denominator = norms * current_norm
        similarity = np.divide(
            matrix @ current,
            denominator,
            out=np.zeros_like(norms),
            where=denominator != 0,
        )
        distances[offset : offset + len(starts)] = 1 - np.clip(similarity, -1, 1)
    return distances


def _empty_result(
    source_frame: pd.DataFrame,
    asset: AssetConfig,
    k: int,
    window_hours: int,
    window_rows: int,
    row_interval_hours: int,
    horizons: dict[str, int],
) -> dict:
    as_of = _iso(source_frame.iloc[-1]["open_time"]) if len(source_frame) else None
    return {
        "asset": asset.id,
        "as_of": as_of,
        "window_hours": window_hours,
        "window_rows": window_rows,
        "source_interval_hours": row_interval_hours,
        "horizons": list(horizons.keys()),
        "k": k,
        "current_series": [],
        "matches": [],
        "summary": {},
        "asset_config": asdict(asset),
    }


def _infer_row_interval_hours(frame: pd.DataFrame) -> int:
    if len(frame) < 2:
        return 1
    ordered = pd.to_datetime(frame["open_time"], utc=True).sort_values()
    median_seconds = ordered.diff().dropna().dt.total_seconds().median()
    if pd.isna(median_seconds) or median_seconds <= 0:
        return 1
    return max(1, int(round(median_seconds / 3600)))


def _hours_to_rows(hours: int, row_interval_hours: int) -> int:
    return max(1, int(round(hours / row_interval_hours)))


def _iso(value: pd.Timestamp) -> str:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize(timezone.utc)
    return timestamp.isoformat().replace("+00:00", "Z")
