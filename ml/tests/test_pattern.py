import numpy as np
import pandas as pd

from ml.assets import AssetConfig
from ml.features import build_features
from ml.pattern import find_similar_windows


def _synthetic_asset() -> AssetConfig:
    return AssetConfig(
        id="TEST-USD",
        binance_symbol="TESTUSDT",
        yahoo_symbol="TEST-USD",
        display_name="Test Asset",
        accent_color="#000000",
        enabled=True,
    )


def _synthetic_frame(periods: int = 420) -> pd.DataFrame:
    closes = [100 + np.sin(i / 3) * 4 + (i * 0.05) for i in range(periods)]
    return pd.DataFrame(
        {
            "open_time": pd.date_range("2026-01-01", periods=periods, freq="h", tz="UTC"),
            "open": closes,
            "high": [c + 1 for c in closes],
            "low": [c - 1 for c in closes],
            "close": closes,
            "volume": [1000 + np.cos(i / 5) * 100 + (i % 12) * 15 for i in range(periods)],
            "close_time": pd.date_range("2026-01-01 00:59:59", periods=periods, freq="h", tz="UTC"),
        }
    )


def test_find_similar_windows_returns_range_summary():
    features = build_features(_synthetic_frame())
    result = find_similar_windows(features, _synthetic_asset(), window_hours=24, k=3, zscore_hours=48)

    assert result["k"] == 3
    assert len(result["matches"]) == 3
    assert "p10" in result["summary"]["horizon_72h"]
    assert "p90" in result["summary"]["horizon_72h"]


def test_forward_returns_are_in_price_space_not_zscore_space():
    """Regression guard: forward returns must be computed from raw close prices.

    The synthetic price series rises ~5 cents/hour around a mean of ~110, so any 168h forward
    return is well under 10%. If forward returns were computed from z-scored close values
    (the prior bug), the magnitudes would explode past 100%.
    """
    features = build_features(_synthetic_frame())
    result = find_similar_windows(features, _synthetic_asset(), window_hours=24, k=5, zscore_hours=48)

    for match in result["matches"]:
        for horizon, ret in match["forward_returns"].items():
            assert -0.5 < ret < 0.5, f"forward return for {horizon} out of range: {ret}"

    for horizon_key, stats in result["summary"].items():
        for stat_name in ("mean", "median", "p10", "p90"):
            assert -0.5 < stats[stat_name] < 0.5, (
                f"{horizon_key}.{stat_name} out of range: {stats[stat_name]}"
            )
