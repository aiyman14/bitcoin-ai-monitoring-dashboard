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
from .data_fetch import fetch_klines, fetch_yahoo_daily
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

    latest = fetch_klines(asset, lookback_hours=lookback_hours)
    hourly = _merge_ohlcv(hourly_path, latest, frequency="h")
    hourly.to_parquet(hourly_path, index=False)

    latest_daily = fetch_yahoo_daily(asset)
    daily = _merge_ohlcv(daily_path, latest_daily)
    daily.to_parquet(daily_path, index=False)

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
    hourly_featured.tail(24 * 90).to_csv(asset_dir / "tableau_extract.csv", index=False)
    hourly_featured.tail(24 * 90).to_csv(asset_dir / "tableau_recent.csv", index=False)
    daily.to_csv(asset_dir / "tableau_long.csv", index=False)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    for asset in enabled_assets(repo_root):
        refresh_asset(asset, repo_root)


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
    if frequency == "h":
        frame = frame.copy()
        frame["open_time"] = pd.to_datetime(frame["open_time"], utc=True).dt.floor("h")
        frame["close_time"] = (
            frame["open_time"] + pd.Timedelta(hours=1) - pd.Timedelta(milliseconds=1)
        )
    return frame.sort_values("open_time").drop_duplicates("open_time", keep="last")


if __name__ == "__main__":
    main()
