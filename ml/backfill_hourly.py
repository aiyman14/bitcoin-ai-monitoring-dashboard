from __future__ import annotations

import sys
from io import StringIO
from pathlib import Path

if __package__ in {None, ""}:
    current_dir = Path(__file__).resolve().parent
    sys.path = [path for path in sys.path if Path(path or ".").resolve() != current_dir]
    sys.path.insert(0, str(current_dir.parent))
    __package__ = "ml"

import pandas as pd
import requests

from .assets import AssetConfig, enabled_assets

CRYPTODATADOWNLOAD_BASE_URL = "https://www.cryptodatadownload.com/cdd"
CRYPTODATADOWNLOAD_EXCHANGE = "Bitstamp"


def backfill_asset(asset: AssetConfig, repo_root: Path) -> pd.DataFrame:
    asset_dir = repo_root / "data" / asset.id
    asset_dir.mkdir(parents=True, exist_ok=True)
    hourly_path = asset_dir / "hourly.parquet"
    backfill = fetch_bitstamp_hourly(asset)
    if hourly_path.exists():
        existing = pd.read_parquet(hourly_path)
        hourly = pd.concat([existing, backfill], ignore_index=True)
    else:
        hourly = backfill
    hourly = hourly.sort_values("open_time").drop_duplicates("open_time", keep="last")
    hourly.to_parquet(hourly_path, index=False)
    return hourly


def fetch_bitstamp_hourly(asset: AssetConfig) -> pd.DataFrame:
    response = requests.get(_cryptodatadownload_url(asset), timeout=60)
    response.raise_for_status()
    raw = pd.read_csv(StringIO(response.text), skiprows=1)
    return normalize_bitstamp_hourly(raw)


def normalize_bitstamp_hourly(raw: pd.DataFrame) -> pd.DataFrame:
    frame = raw.copy()
    volume_column = _quote_volume_column(frame)
    normalized = pd.DataFrame(
        {
            "open_time": pd.to_datetime(
                pd.to_numeric(frame["unix"], errors="coerce"), unit="s", utc=True
            ),
            "open": frame["open"],
            "high": frame["high"],
            "low": frame["low"],
            "close": frame["close"],
            "volume": frame[volume_column],
        }
    )
    normalized["close_time"] = (
        normalized["open_time"] + pd.Timedelta(hours=1) - pd.Timedelta(milliseconds=1)
    )
    for column in ["open", "high", "low", "close", "volume"]:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    return (
        normalized.dropna()
        .sort_values("open_time")
        .drop_duplicates("open_time", keep="last")
    )


def _cryptodatadownload_url(asset: AssetConfig) -> str:
    market = asset.yahoo_symbol.replace("-", "")
    return (
        f"{CRYPTODATADOWNLOAD_BASE_URL}/{CRYPTODATADOWNLOAD_EXCHANGE}_{market}_1h.csv"
    )


def _quote_volume_column(frame: pd.DataFrame) -> str:
    for column in frame.columns:
        if column.lower().endswith(" usd"):
            return column
    raise ValueError("CryptoDataDownload CSV did not include a quote-volume column")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    for asset in enabled_assets(repo_root):
        hourly = backfill_asset(asset, repo_root)
        print(
            f"{asset.id}: wrote {len(hourly)} hourly rows from {hourly['open_time'].min()} to {hourly['open_time'].max()}"
        )


if __name__ == "__main__":
    main()
