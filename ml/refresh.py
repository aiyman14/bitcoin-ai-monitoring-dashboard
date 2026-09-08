from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    current_dir = Path(__file__).resolve().parent
    sys.path = [path for path in sys.path if Path(path or ".").resolve() != current_dir]
    sys.path.insert(0, str(current_dir.parent))
    __package__ = "ml"

import pandas as pd

from .assets import AssetConfig, enabled_assets
from .data_fetch import fetch_daily, fetch_klines
from .features import build_features
from .pattern import find_similar_windows
from .signal import score_latest

PATTERN_WINDOWS = {
    "12h": {"source": "hourly", "window_hours": 12},
    "24h": {"source": "hourly", "window_hours": 24},
    "72h": {"source": "hourly", "window_hours": 72},
    "168h": {"source": "daily", "window_hours": 168},
}


def refresh_asset(
    asset: AssetConfig, repo_root: Path, lookback_hours: int = 24 * 30
) -> None:
    asset_dir = repo_root / "data" / asset.id
    asset_dir.mkdir(parents=True, exist_ok=True)
    hourly_path = asset_dir / "hourly.parquet"
    daily_path = asset_dir / "daily.parquet"

    lookback_hours = _lookback_to_cover_gap(hourly_path, lookback_hours)
    latest = fetch_klines(asset, lookback_hours=lookback_hours)
    hourly = _merge_ohlcv(hourly_path, latest, frequency="h")
    hourly.to_parquet(hourly_path, index=False)
    _log(f"{asset.id} hourly: {len(hourly)} rows, latest {hourly['open_time'].max()}")

    latest_daily = fetch_daily(asset)
    daily = _merge_ohlcv(daily_path, latest_daily)
    daily.to_parquet(daily_path, index=False)
    _log(f"{asset.id} daily: {len(daily)} rows, latest {daily['open_time'].max()}")

    hourly_featured = build_features(hourly)
    daily_featured = build_features(daily)
    signal = score_latest(hourly_featured, asset, repo_root=repo_root)

    for label, config in PATTERN_WINDOWS.items():
        source_frame = (
            hourly_featured if config["source"] == "hourly" else daily_featured
        )
        pattern = find_similar_windows(
            source_frame, asset, window_hours=config["window_hours"]
        )
        _write_json(asset_dir / f"pattern_top_k_{label}.json", pattern)

    (asset_dir / "pattern_top_k.json").unlink(missing_ok=True)
    _write_json(asset_dir / "signal.json", signal)
    hourly_featured.tail(24 * 90).to_csv(asset_dir / "tableau_recent.csv", index=False)
    daily.to_csv(asset_dir / "tableau_long.csv", index=False)
    _log(f"{asset.id} artifacts written, signal as_of {signal.get('as_of')}")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    for asset in enabled_assets(repo_root):
        refresh_asset(asset, repo_root)


# Widest hourly lookback a single refresh will request. Matches the Binance
# paging cap in data_fetch (12 pages of 1000 hours) and stays inside Yahoo's
# 730 day limit for 1h bars. Older holes need a separate backfill.
MAX_LOOKBACK_HOURS = 24 * 500


def _lookback_to_cover_gap(hourly_path: Path, default_hours: int) -> int:
    """Reach back far enough to overlap the last stored hourly candle.

    If the cron has been down for a while, the default window would leave a
    hole between the stored history and the new rows. Rolling features and the
    pattern matcher treat the hourly series as contiguous, so widen the window
    to cover the gap plus a day of overlap.
    """
    if not hourly_path.exists():
        return default_hours
    stored = pd.read_parquet(hourly_path, columns=["open_time"])
    if stored.empty:
        return default_hours
    latest = pd.to_datetime(stored["open_time"], utc=True).max()
    hours_since = (pd.Timestamp.now(tz="UTC") - latest) / pd.Timedelta(hours=1)
    needed = int(hours_since) + 24
    if needed > default_hours:
        _log(
            f"stored hourly ends {latest}, widening lookback from "
            f"{default_hours} to {min(needed, MAX_LOOKBACK_HOURS)} hours"
        )
    return max(default_hours, min(needed, MAX_LOOKBACK_HOURS))


def _log(message: str) -> None:
    print(f"[refresh] {message}", flush=True)


def _write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def _merge_ohlcv(
    path: Path, latest: pd.DataFrame, frequency: str | None = None
) -> pd.DataFrame:
    if path.exists():
        existing = pd.read_parquet(path)
        frame = pd.concat([existing, latest], ignore_index=True)
    else:
        frame = latest
    frame = frame.copy()
    # Force open_time and close_time to nanosecond UTC precision. Newer pandas
    # versions (>= 2.4) preserve the source unit from pd.to_datetime, so a
    # parquet's ns column concatenated with a freshly-fetched s column can fall
    # back to an object dtype that breaks downstream .dt accessors.
    frame["open_time"] = pd.to_datetime(frame["open_time"], utc=True).astype(
        "datetime64[ns, UTC]"
    )
    if "close_time" in frame.columns:
        frame["close_time"] = pd.to_datetime(frame["close_time"], utc=True).astype(
            "datetime64[ns, UTC]"
        )
    if frequency == "h":
        frame["open_time"] = frame["open_time"].dt.floor("h")
        frame["close_time"] = (
            frame["open_time"] + pd.Timedelta(hours=1) - pd.Timedelta(milliseconds=1)
        )
    return frame.sort_values("open_time").drop_duplicates("open_time", keep="last")


if __name__ == "__main__":
    main()
