from __future__ import annotations

from typing import Any

import pandas as pd
import requests

from .assets import AssetConfig

BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
YAHOO_DAILY_START = "2014-09-17"


def fetch_klines(asset: AssetConfig, lookback_hours: int = 24 * 30) -> pd.DataFrame:
    # Yahoo first: Binance returns HTTP 451 for US-originating IPs (including GitHub-hosted runners).
    try:
        return fetch_yahoo_klines(asset, lookback_hours=lookback_hours)
    except requests.RequestException:
        return fetch_binance_klines(asset, lookback_hours=lookback_hours)


def fetch_binance_klines(
    asset: AssetConfig, lookback_hours: int = 1000
) -> pd.DataFrame:
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


def fetch_yahoo_klines(
    asset: AssetConfig, lookback_hours: int = 24 * 30
) -> pd.DataFrame:
    days = max(1, min(730, int((lookback_hours / 24) + 1)))
    payload = _fetch_yahoo_chart(asset, {"range": f"{days}d", "interval": "1h"})
    frame = _yahoo_payload_to_frame(payload)
    frame["open_time"] = frame["open_time"].dt.floor("h")
    frame["close_time"] = (
        frame["open_time"] + pd.Timedelta(hours=1) - pd.Timedelta(milliseconds=1)
    )
    return _clean_ohlcv(frame)


def fetch_yahoo_daily(
    asset: AssetConfig,
    start: str | pd.Timestamp = YAHOO_DAILY_START,
    end: str | pd.Timestamp | None = None,
) -> pd.DataFrame:
    start_time = _coerce_utc_midnight(start)
    end_time = (
        _coerce_utc_midnight(end)
        if end is not None
        else pd.Timestamp.now(tz="UTC").normalize()
    )
    end_exclusive = end_time + pd.Timedelta(days=1)
    payload = _fetch_yahoo_chart(
        asset,
        {
            "period1": int(start_time.timestamp()),
            "period2": int(end_exclusive.timestamp()),
            "interval": "1d",
            "includePrePost": "false",
        },
    )
    frame = _yahoo_payload_to_frame(payload)
    frame["open_time"] = frame["open_time"].dt.normalize()
    frame["close_time"] = (
        frame["open_time"] + pd.Timedelta(days=1) - pd.Timedelta(milliseconds=1)
    )
    return _clean_ohlcv(frame)


def normalize_klines(frame: pd.DataFrame) -> pd.DataFrame:
    keep = ["open_time", "open", "high", "low", "close", "volume", "close_time"]
    normalized = frame.loc[:, keep].copy()
    normalized["open_time"] = pd.to_datetime(
        normalized["open_time"], unit="ms", utc=True
    )
    normalized["close_time"] = pd.to_datetime(
        normalized["close_time"], unit="ms", utc=True
    )
    return _clean_ohlcv(normalized)


def _clean_ohlcv(frame: pd.DataFrame) -> pd.DataFrame:
    normalized = frame.copy()
    for column in ["open", "high", "low", "close", "volume"]:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    return (
        normalized.dropna()
        .sort_values("open_time")
        .drop_duplicates("open_time", keep="last")
    )


def _fetch_yahoo_chart(asset: AssetConfig, params: dict[str, Any]) -> dict[str, Any]:
    response = requests.get(
        YAHOO_CHART_URL.format(symbol=asset.yahoo_symbol),
        params=params,
        headers={"User-Agent": "market-monitor-refresh/0.1"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()["chart"]
    if payload.get("error"):
        raise requests.RequestException(payload["error"])
    result = payload.get("result") or []
    if not result:
        raise requests.RequestException("Yahoo chart response contained no result")
    return result[0]


def _yahoo_payload_to_frame(payload: dict[str, Any]) -> pd.DataFrame:
    timestamps = payload["timestamp"]
    quote = payload["indicators"]["quote"][0]
    return pd.DataFrame(
        {
            "open_time": pd.to_datetime(timestamps, unit="s", utc=True),
            "open": quote["open"],
            "high": quote["high"],
            "low": quote["low"],
            "close": quote["close"],
            "volume": quote["volume"],
        }
    )


def _coerce_utc_midnight(value: str | pd.Timestamp) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")
    else:
        timestamp = timestamp.tz_convert("UTC")
    return timestamp.normalize()
