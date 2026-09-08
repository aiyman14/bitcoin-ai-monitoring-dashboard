from __future__ import annotations

import time
from typing import Any

import pandas as pd
import requests

from .assets import AssetConfig

# Binance market data. The main api.binance.com host returns HTTP 451 for
# US-originating IPs, which includes every GitHub-hosted runner. The
# data-api.binance.vision mirror serves the same public klines endpoint
# without the geo block, so it goes first; the main host stays as a backstop
# for non-US environments.
BINANCE_KLINES_HOSTS = (
    "https://data-api.binance.vision/api/v3/klines",
    "https://api.binance.com/api/v3/klines",
)
BINANCE_KLINES_URL = BINANCE_KLINES_HOSTS[0]
BINANCE_MAX_LIMIT = 1000
# Upper bound on paged hourly history per refresh: 12 pages is 500 days.
BINANCE_MAX_PAGES = 12
BINANCE_TIMEOUT_SECONDS = 15
BINANCE_KLINE_COLUMNS = [
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

# Yahoo Finance chart API. Unofficial, rate-limits shared CI IP ranges hard,
# so it is the fallback rather than the primary. Retry budget is deliberately
# small: 0, 5, 15 second waits plus three 30 second timeouts is under two
# minutes per call, which keeps the whole refresh inside the job timeout even
# when every host is unreachable.
YAHOO_CHART_HOSTS = (
    "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
    "https://query2.finance.yahoo.com/v8/finance/chart/{symbol}",
)
YAHOO_DAILY_START = "2014-09-17"
YAHOO_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
YAHOO_TIMEOUT_SECONDS = 30
RETRY_BACKOFF_SCHEDULE = (5, 15)


def fetch_klines(asset: AssetConfig, lookback_hours: int = 24 * 30) -> pd.DataFrame:
    """Recent hourly candles: Binance first, Yahoo if every Binance host fails."""
    return _first_available(
        "hourly",
        (
            (
                "binance",
                lambda: fetch_binance_klines(asset, lookback_hours=lookback_hours),
            ),
            ("yahoo", lambda: fetch_yahoo_klines(asset, lookback_hours=lookback_hours)),
        ),
    )


def fetch_daily(
    asset: AssetConfig, lookback_days: int = BINANCE_MAX_LIMIT
) -> pd.DataFrame:
    """Recent daily candles: Binance first, Yahoo if every Binance host fails.

    Binance only returns the most recent `lookback_days` rows. The committed
    daily parquet already holds the 2014 onward history, and refresh.py merges
    new rows into it, so a rolling window is all the cron needs. Yahoo returns
    the full history from YAHOO_DAILY_START when it is the source.
    """
    return _first_available(
        "daily",
        (
            (
                "binance",
                lambda: fetch_binance_daily(asset, lookback_days=lookback_days),
            ),
            ("yahoo", lambda: fetch_yahoo_daily(asset)),
        ),
    )


def fetch_binance_klines(
    asset: AssetConfig, lookback_hours: int = BINANCE_MAX_LIMIT
) -> pd.DataFrame:
    """Hourly candles covering the last `lookback_hours`.

    Binance caps a single call at 1000 rows, so longer lookbacks page forward
    from a start timestamp. That is what lets the cron heal its own gaps after
    an outage: refresh.py widens the lookback to reach back to the last stored
    candle, and the pages fill the hole.
    """
    hours = max(lookback_hours, 1)
    if hours <= BINANCE_MAX_LIMIT:
        rows = _fetch_binance_rows(asset, interval="1h", limit=hours)
    else:
        start = pd.Timestamp.now(tz="UTC").floor("h") - pd.Timedelta(hours=hours)
        rows = _fetch_binance_rows_from(asset, interval="1h", start=start)
    return normalize_klines(pd.DataFrame(rows, columns=BINANCE_KLINE_COLUMNS))


def fetch_binance_daily(
    asset: AssetConfig, lookback_days: int = BINANCE_MAX_LIMIT
) -> pd.DataFrame:
    rows = _fetch_binance_rows(
        asset, interval="1d", limit=min(max(lookback_days, 1), BINANCE_MAX_LIMIT)
    )
    return normalize_klines(pd.DataFrame(rows, columns=BINANCE_KLINE_COLUMNS))


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
    # Binance's `volume` column is in the base asset (BTC). The rest of the
    # stored history carries quote volume in dollars (Bitstamp backfill, Yahoo),
    # so use quote_asset_volume to keep the volume features in one unit.
    normalized = pd.DataFrame(
        {
            "open_time": pd.to_datetime(frame["open_time"], unit="ms", utc=True),
            "open": frame["open"],
            "high": frame["high"],
            "low": frame["low"],
            "close": frame["close"],
            "volume": frame["quote_asset_volume"],
            "close_time": pd.to_datetime(frame["close_time"], unit="ms", utc=True),
        }
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


def _first_available(label: str, sources) -> pd.DataFrame:
    errors: list[str] = []
    for name, fetch in sources:
        started = time.monotonic()
        try:
            frame = fetch()
        except requests.RequestException as exc:
            elapsed = time.monotonic() - started
            _log(f"{label}: {name} failed after {elapsed:.1f}s: {exc}")
            errors.append(f"{name}: {exc}")
            continue
        elapsed = time.monotonic() - started
        _log(
            f"{label}: {name} returned {len(frame)} rows in {elapsed:.1f}s, "
            f"latest open_time {frame['open_time'].max()}"
        )
        return frame
    raise requests.RequestException(
        f"{label}: every source failed: " + "; ".join(errors)
    )


def _fetch_binance_rows_from(
    asset: AssetConfig, interval: str, start: pd.Timestamp
) -> list[Any]:
    """Page through klines from `start` until Binance returns a short page."""
    rows: list[Any] = []
    start_ms = int(start.timestamp() * 1000)
    for _page in range(BINANCE_MAX_PAGES):
        page = _fetch_binance_rows(
            asset, interval=interval, limit=BINANCE_MAX_LIMIT, start_ms=start_ms
        )
        rows.extend(page)
        if len(page) < BINANCE_MAX_LIMIT:
            break
        start_ms = int(page[-1][0]) + 1
    return rows


def _fetch_binance_rows(
    asset: AssetConfig, interval: str, limit: int, start_ms: int | None = None
) -> list[Any]:
    params: dict[str, Any] = {
        "symbol": asset.binance_symbol,
        "interval": interval,
        "limit": limit,
    }
    if start_ms is not None:
        params["startTime"] = start_ms
    last_exc: requests.RequestException | None = None
    for host in BINANCE_KLINES_HOSTS:
        try:
            response = requests.get(
                host, params=params, timeout=BINANCE_TIMEOUT_SECONDS
            )
            response.raise_for_status()
            rows = response.json()
            if not rows:
                raise requests.RequestException(f"{host} returned no klines")
            return rows
        except requests.RequestException as exc:
            _log(f"binance {interval}: {host} failed: {exc}")
            last_exc = exc
    assert last_exc is not None
    raise last_exc


def _fetch_yahoo_chart(asset: AssetConfig, params: dict[str, Any]) -> dict[str, Any]:
    last_exc: Exception | None = None
    for attempt, wait_before in enumerate((0, *RETRY_BACKOFF_SCHEDULE)):
        if wait_before:
            time.sleep(wait_before)
        host = YAHOO_CHART_HOSTS[attempt % len(YAHOO_CHART_HOSTS)]
        try:
            response = requests.get(
                host.format(symbol=asset.yahoo_symbol),
                params=params,
                headers={
                    "User-Agent": YAHOO_USER_AGENT,
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                timeout=YAHOO_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            payload = response.json()["chart"]
            if payload.get("error"):
                raise requests.RequestException(payload["error"])
            result = payload.get("result") or []
            if not result:
                raise requests.RequestException(
                    "Yahoo chart response contained no result"
                )
            return result[0]
        except requests.RequestException as exc:
            _log(f"yahoo attempt {attempt + 1}: {host} failed: {exc}")
            last_exc = exc
    assert last_exc is not None
    raise last_exc


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


def _log(message: str) -> None:
    print(f"[data_fetch] {message}", flush=True)
