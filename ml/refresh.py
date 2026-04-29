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
from .data_fetch import fetch_klines
from .features import build_features
from .pattern import find_similar_windows
from .signal import score_latest


def refresh_asset(asset: AssetConfig, repo_root: Path, lookback_hours: int = 1000) -> None:
    asset_dir = repo_root / "data" / asset.id
    asset_dir.mkdir(parents=True, exist_ok=True)
    parquet_path = asset_dir / "hourly.parquet"

    latest = fetch_klines(asset, lookback_hours=lookback_hours)
    if parquet_path.exists():
        existing = pd.read_parquet(parquet_path)
        hourly = pd.concat([existing, latest], ignore_index=True)
    else:
        hourly = latest

    hourly = hourly.sort_values("open_time").drop_duplicates("open_time", keep="last")
    hourly.to_parquet(parquet_path, index=False)

    featured = build_features(hourly)
    pattern = find_similar_windows(featured, asset)
    signal = score_latest(featured, asset, repo_root=repo_root)

    _write_json(asset_dir / "pattern_top_k.json", pattern)
    _write_json(asset_dir / "signal.json", signal)
    featured.tail(24 * 90).to_csv(asset_dir / "tableau_extract.csv", index=False)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    for asset in enabled_assets(repo_root):
        refresh_asset(asset, repo_root)


def _write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
