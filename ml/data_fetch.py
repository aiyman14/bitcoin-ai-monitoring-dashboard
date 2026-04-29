from __future__ import annotations

from typing import Any

import pandas as pd
import requests

from .assets import AssetConfig

BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def fetch_klines(asset: AssetConfig, lookback_hours: int = 1000) -> pd.DataFrame:
    # Yahoo first: Binance returns HTTP 451 for US-originating IPs (including GitHub-hosted runners).
    try:
        return fetch_yahoo_klines(asset, lookback_hours=lookback_hours)
    except requests.RequestException:
        return fetch_binance_klines(asset, lookback_hours=lookback_hours)


def fetch_binance_klines(asset: AssetConfig, lookback_hours: int = 1000) -> pd.DataFrame:
    params: dict[str, Any] = {
        "symbol": asset.binance_symbol,
        "interval": "1h",
        "limit": min(max(lookback_hours, 1), 1000),
    }
    response = requests.get(BINANCE_KLINES_URL, params=params, timeout=30)
    response.raise_for_status()
    rows = response.json()
    columns = [
        "open_time",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "close_time",
        "quote_asset_volume",
        "number_of_trades",
        "taker_buy_base_asset_volume",
        "taker_buy_quote_asset_volume",
        "ignore",
    ]
    frame = pd.DataFrame(rows, columns=columns)
    return normalize_klines(frame)


def fetch_yahoo_klines(asset: AssetConfig, lookback_hours: int = 1000) -> pd.DataFrame:
    days = max(1, min(730, int((lookback_hours / 24) + 1)))
    response = requests.get(
        YAHOO_CHART_URL.format(symbol=asset.yahoo_symbol),
        params={"range": f"{days}d", "interval": "1h"},
        headers={"User-Agent": "market-monitor-refresh/0.1"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()["chart"]["result"][0]
    timestamps = payload["timestamp"]
    quote = payload["indicators"]["quote"][0]
    frame = pd.DataFrame(
        {
            "open_time": pd.to_datetime(timestamps, unit="s", utc=True),
            "open": quote["open"],
            "high": quote["high"],
            "low": quote["low"],
            "close": quote["close"],
            "volume": quote["volume"],
        }
    )
    frame["close_time"] = frame["open_time"] + pd.Timedelta(hours=1) - pd.Timedelta(milliseconds=1)
    return _clean_ohlcv(frame)


def normalize_klines(frame: pd.DataFrame) -> pd.DataFrame:
    keep = ["open_time", "open", "high", "low", "close", "volume", "close_time"]
    normalized = frame.loc[:, keep].copy()
    normalized["open_time"] = pd.to_datetime(normalized["open_time"], unit="ms", utc=True)
    normalized["close_time"] = pd.to_datetime(normalized["close_time"], unit="ms", utc=True)
    return _clean_ohlcv(normalized)


def _clean_ohlcv(frame: pd.DataFrame) -> pd.DataFrame:
    normalized = frame.copy()
    for column in ["open", "high", "low", "close", "volume"]:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    return normalized.dropna().sort_values("open_time").drop_duplicates("open_time", keep="last")
