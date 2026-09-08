import pandas as pd

from ml.refresh import MAX_LOOKBACK_HOURS, _lookback_to_cover_gap


def _write_hourly(tmp_path, latest):
    path = tmp_path / "hourly.parquet"
    frame = pd.DataFrame(
        {
            "open_time": pd.date_range(end=latest, periods=48, freq="h", tz="UTC"),
            "open": 1.0,
            "high": 1.0,
            "low": 1.0,
            "close": 1.0,
            "volume": 1.0,
        }
    )
    frame["close_time"] = frame["open_time"] + pd.Timedelta(minutes=59)
    frame.to_parquet(path, index=False)
    return path


def test_fresh_store_keeps_default_lookback(tmp_path):
    latest = pd.Timestamp.now(tz="UTC").floor("h") - pd.Timedelta(hours=2)
    path = _write_hourly(tmp_path, latest)

    assert _lookback_to_cover_gap(path, 720) == 720


def test_stale_store_widens_lookback_past_the_gap(tmp_path):
    latest = pd.Timestamp.now(tz="UTC").floor("h") - pd.Timedelta(days=86)
    path = _write_hourly(tmp_path, latest)

    lookback = _lookback_to_cover_gap(path, 720)

    # 86 days plus a day of overlap, give or take the current partial hour.
    assert 86 * 24 + 24 <= lookback <= 86 * 24 + 25
    assert lookback <= MAX_LOOKBACK_HOURS


def test_ancient_store_is_capped(tmp_path):
    latest = pd.Timestamp.now(tz="UTC").floor("h") - pd.Timedelta(days=900)
    path = _write_hourly(tmp_path, latest)

    assert _lookback_to_cover_gap(path, 720) == MAX_LOOKBACK_HOURS


def test_missing_store_uses_default(tmp_path):
    assert _lookback_to_cover_gap(tmp_path / "missing.parquet", 720) == 720
