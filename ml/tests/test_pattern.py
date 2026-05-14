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
            "open_time": pd.date_range(
                "2026-01-01", periods=periods, freq="h", tz="UTC"
            ),
            "open": closes,
            "high": [c + 1 for c in closes],
            "low": [c - 1 for c in closes],
            "close": closes,
            "volume": [
                1000 + np.cos(i / 5) * 100 + (i % 12) * 15 for i in range(periods)
            ],
            "close_time": pd.date_range(
                "2026-01-01 00:59:59", periods=periods, freq="h", tz="UTC"
            ),
        }
    )


def test_find_similar_windows_returns_range_summary():
    features = build_features(_synthetic_frame())
    result = find_similar_windows(
        features, _synthetic_asset(), window_hours=24, k=3, zscore_hours=48
    )

    assert result["k"] == 3
    assert result["window_rows"] == 24
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
    result = find_similar_windows(
        features, _synthetic_asset(), window_hours=24, k=5, zscore_hours=48
    )

    for match in result["matches"]:
        for horizon, ret in match["forward_returns"].items():
            assert -0.5 < ret < 0.5, f"forward return for {horizon} out of range: {ret}"

    for horizon_key, stats in result["summary"].items():
        for stat_name in ("mean", "median", "p10", "p90"):
            assert -0.5 < stats[stat_name] < 0.5, (
                f"{horizon_key}.{stat_name} out of range: {stats[stat_name]}"
            )


def test_match_and_current_series_are_normalized_to_window_start():
    features = build_features(_synthetic_frame())
    result = find_similar_windows(
        features, _synthetic_asset(), window_hours=24, k=3, zscore_hours=48
    )

    assert len(result["current_series"]) == 24
    assert result["current_series"][0]["pct_change_from_start"] == 0.0
    for point in result["current_series"]:
        assert -0.5 < point["pct_change_from_start"] < 0.5
        assert "t" in point

    for match in result["matches"]:
        assert len(match["match_series"]) == 24
        assert match["match_series"][0]["pct_change_from_start"] == 0.0
        for point in match["match_series"]:
            assert -0.5 < point["pct_change_from_start"] < 0.5


def test_daily_window_forward_returns_are_in_price_space():
    frame = _synthetic_frame(periods=520)
    frame["open_time"] = pd.date_range(
        "2024-01-01", periods=len(frame), freq="D", tz="UTC"
    )
    frame["close_time"] = (
        frame["open_time"] + pd.Timedelta(days=1) - pd.Timedelta(milliseconds=1)
    )
    features = build_features(frame)

    result = find_similar_windows(
        features, _synthetic_asset(), window_hours=168, k=3, zscore_hours=24 * 30
    )

    assert result["window_rows"] == 7
    assert result["source_interval_hours"] == 24
    assert set(result["horizons"]) == {"1d", "3d", "7d", "30d"}
    first_match = result["matches"][0]
    start = features.index[
        features["open_time"].eq(pd.Timestamp(first_match["match_start"]))
    ][0]
    base_close = features.iloc[start + 6]["close"]
    forward_close = features.iloc[start + 6 + 30]["close"]
    recomputed = (forward_close / base_close) - 1

    assert abs(first_match["forward_returns"]["30d"] - recomputed) < 1e-12
    assert -0.5 < first_match["forward_returns"]["30d"] < 0.5
