import pandas as pd

from ml.features import FEATURE_COLUMNS, build_features


def test_build_features_returns_complete_feature_rows():
    frame = pd.DataFrame(
        {
            "open_time": pd.date_range("2026-01-01", periods=80, freq="h", tz="UTC"),
            "open": range(80),
            "high": range(1, 81),
            "low": range(80),
            "close": [100 + i + ((-1) ** i) for i in range(80)],
            "volume": [1000 + (i % 9) * 10 for i in range(80)],
            "close_time": pd.date_range("2026-01-01 00:59:59", periods=80, freq="h", tz="UTC"),
        }
    )

    features = build_features(frame)

    assert len(features) > 0
    assert set(FEATURE_COLUMNS).issubset(features.columns)
    assert features[FEATURE_COLUMNS].isna().sum().sum() == 0
