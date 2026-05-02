from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

import joblib
import pandas as pd

from .assets import AssetConfig
from .features import FEATURE_COLUMNS


def score_latest(
    features: pd.DataFrame, asset: AssetConfig, repo_root: Path | None = None
) -> dict:
    root = repo_root or Path(__file__).resolve().parents[1]
    model_path = root / "ml" / "models" / asset.id / "svm.joblib"
    as_of = (
        pd.Timestamp(features.iloc[-1]["open_time"]).isoformat().replace("+00:00", "Z")
        if len(features)
        else None
    )
    regime = _regime(features)

    if not model_path.exists() or features.empty:
        return {
            "asset": asset.id,
            "as_of": as_of,
            "model": "stub",
            "direction": "unavailable",
            "probability_up": None,
            "regime": regime,
            "test_f1": None,
            "asset_config": asdict(asset),
        }

    model = joblib.load(model_path)
    latest = features.iloc[[-1]][FEATURE_COLUMNS]
    probability_up = (
        float(model.predict_proba(latest)[0][1])
        if hasattr(model, "predict_proba")
        else None
    )
    direction = "up" if probability_up is not None and probability_up >= 0.5 else "down"
    return {
        "asset": asset.id,
        "as_of": as_of,
        "model": "svm_rbf",
        "direction": direction,
        "probability_up": probability_up,
        "regime": regime,
        "test_f1": _scorecard_f1(root, asset),
        "asset_config": asdict(asset),
    }


def _scorecard_f1(root: Path, asset: AssetConfig) -> float | None:
    scorecard = root / "ml" / "models" / asset.id / "scorecard.json"
    if not scorecard.exists():
        return None
    import json

    with scorecard.open(encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("test_f1")
    return float(value) if value is not None else None


def _regime(features: pd.DataFrame) -> dict:
    window_hours = 24
    if features.empty:
        return {
            "label": "unclassified",
            "trend_label": "unavailable",
            "volatility_percentile": None,
            "window_hours": window_hours,
        }

    latest = features.iloc[-1]
    volatility = features["rolling_std_24h"].dropna()
    current_volatility = float(latest["rolling_std_24h"])
    percentile = (
        float((volatility <= current_volatility).mean()) if len(volatility) else None
    )
    distance = float(latest["dist_from_ma_24h"])
    trend_label = _trend_label(distance)
    label = _regime_label(percentile, distance)
    return {
        "label": label,
        "trend_label": trend_label,
        "volatility_percentile": percentile,
        "window_hours": window_hours,
    }


def _trend_label(distance_from_ma: float) -> str:
    if distance_from_ma >= 0.5:
        return "above its 24h average"
    if distance_from_ma <= -0.5:
        return "below its 24h average"
    return "near its 24h average"


def _regime_label(percentile: float | None, distance_from_ma: float) -> str:
    volatility_label = (
        "mixed-volatility"
        if percentile is None
        else "high-volatility"
        if percentile >= 0.75
        else "low-volatility"
        if percentile <= 0.25
        else "mid-volatility"
    )
    trend_label = (
        "upward-tilted"
        if distance_from_ma >= 0.5
        else "downward-tilted"
        if distance_from_ma <= -0.5
        else "range-bound"
    )
    return f"{volatility_label}, {trend_label}"
