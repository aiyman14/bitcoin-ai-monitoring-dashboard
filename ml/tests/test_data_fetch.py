import pandas as pd
import pytest
import requests

from ml import data_fetch
from ml.assets import AssetConfig

ASSET = AssetConfig(
    id="BTC-USD",
    binance_symbol="BTCUSDT",
    yahoo_symbol="BTC-USD",
    display_name="Bitcoin",
    accent_color="#f7931a",
    enabled=True,
)

# Two real-shaped Binance 1h klines: 2026-09-07 00:00 and 01:00 UTC.
BINANCE_ROWS = [
    [
        1788739200000,
        "80341.83",
        "80443.99",
        "78680.00",
        "79112.01",
        "10572.45",
        1788742799999,
        "839882674.54",
        2464603,
        "5180.15",
        "411563607.50",
        "0",
    ],
    [
        1788742800000,
        "79112.01",
        "79300.00",
        "79000.00",
        "79200.50",
        "5000.00",
        1788746399999,
        "396000000.00",
        1200000,
        "2500.00",
        "198000000.00",
        "0",
    ],
]

YAHOO_PAYLOAD = {
    "chart": {
        "result": [
            {
                "timestamp": [1788739200, 1788742800],
                "indicators": {
                    "quote": [
                        {
                            "open": [80341.83, 79112.01],
                            "high": [80443.99, 79300.0],
                            "low": [78680.0, 79000.0],
                            "close": [79112.01, 79200.5],
                            "volume": [839882674, 396000000],
                        }
                    ]
                },
            }
        ],
        "error": None,
    }
}


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def _install_router(monkeypatch, router, calls):
    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append(url)
        return router(url)

    monkeypatch.setattr(data_fetch.requests, "get", fake_get)
    monkeypatch.setattr(
        data_fetch.time, "sleep", lambda seconds: calls.append(f"sleep:{seconds}")
    )


def test_binance_klines_use_quote_volume_and_utc_timestamps(monkeypatch):
    calls = []
    _install_router(monkeypatch, lambda url: FakeResponse(200, BINANCE_ROWS), calls)

    frame = data_fetch.fetch_klines(ASSET, lookback_hours=2)

    assert calls == [data_fetch.BINANCE_KLINES_HOSTS[0]]
    assert list(frame["open_time"]) == [
        pd.Timestamp("2026-09-07 00:00:00", tz="UTC"),
        pd.Timestamp("2026-09-07 01:00:00", tz="UTC"),
    ]
    assert frame["close_time"].iloc[0] == pd.Timestamp(
        "2026-09-07 00:59:59.999", tz="UTC"
    )
    assert frame["close"].iloc[0] == pytest.approx(79112.01)
    # quote_asset_volume (dollars), not the base-asset `volume` column (BTC).
    assert frame["volume"].iloc[0] == pytest.approx(839882674.54)
    assert frame["volume"].dtype.kind == "f"


def test_binance_geo_block_rotates_hosts_then_falls_back_to_yahoo(monkeypatch):
    calls = []

    def router(url):
        if "binance" in url:
            return FakeResponse(451)
        return FakeResponse(200, YAHOO_PAYLOAD)

    _install_router(monkeypatch, router, calls)

    frame = data_fetch.fetch_klines(ASSET, lookback_hours=2)

    assert calls[:2] == list(data_fetch.BINANCE_KLINES_HOSTS)
    assert calls[2].startswith("https://query1.finance.yahoo.com/")
    assert len(calls) == 3
    assert frame["close"].iloc[-1] == pytest.approx(79200.5)
    assert frame["open_time"].iloc[-1] == pd.Timestamp("2026-09-07 01:00:00", tz="UTC")


def test_daily_prefers_binance_and_normalizes_day_boundaries(monkeypatch):
    calls = []
    daily_rows = [
        [
            1788652800000,
            "79831.75",
            "80559.99",
            "79233.00",
            "80341.83",
            "8854.81",
            1788739199999,
            "707422224.46",
            1658245,
            "4212.19",
            "336600182.64",
            "0",
        ]
    ]
    _install_router(monkeypatch, lambda url: FakeResponse(200, daily_rows), calls)

    frame = data_fetch.fetch_daily(ASSET, lookback_days=1)

    assert calls == [data_fetch.BINANCE_KLINES_HOSTS[0]]
    assert frame["open_time"].iloc[0] == pd.Timestamp("2026-09-06", tz="UTC")
    assert frame["close_time"].iloc[0] == pd.Timestamp(
        "2026-09-06 23:59:59.999", tz="UTC"
    )
    assert frame["volume"].iloc[0] == pytest.approx(707422224.46)


def test_every_source_down_fails_within_bounded_retry_budget(monkeypatch):
    calls = []
    _install_router(monkeypatch, lambda url: FakeResponse(503), calls)

    with pytest.raises(requests.RequestException):
        data_fetch.fetch_klines(ASSET, lookback_hours=2)

    http_calls = [c for c in calls if c.startswith("http")]
    sleeps = [float(c.split(":")[1]) for c in calls if c.startswith("sleep:")]
    # 2 Binance hosts, then 3 Yahoo attempts with the short backoff schedule.
    assert len(http_calls) == 2 + 1 + len(data_fetch.RETRY_BACKOFF_SCHEDULE)
    assert sleeps == list(data_fetch.RETRY_BACKOFF_SCHEDULE)
    assert sum(sleeps) <= 30


def _kline(open_ms):
    return [
        open_ms,
        "1",
        "2",
        "0.5",
        "1.5",
        "10",
        open_ms + 3_599_999,
        "15",
        1,
        "5",
        "7.5",
        "0",
    ]


def test_long_lookback_pages_forward_from_start_time(monkeypatch):
    hour_ms = 3_600_000
    first_start = None
    seen_params = []

    def fake_get(url, params=None, headers=None, timeout=None):
        nonlocal first_start
        seen_params.append(dict(params))
        start = params["startTime"]
        if first_start is None:
            first_start = start
        # Binance snaps startTime up to the next candle boundary.
        aligned = -(-start // hour_ms) * hour_ms
        # Full page of 1000 hours, then a short page of 5 hours.
        count = 1000 if start == first_start else 5
        return FakeResponse(200, [_kline(aligned + i * hour_ms) for i in range(count)])

    monkeypatch.setattr(data_fetch.requests, "get", fake_get)

    frame = data_fetch.fetch_binance_klines(ASSET, lookback_hours=1004)

    assert len(seen_params) == 2
    assert seen_params[1]["startTime"] == first_start + 1000 * hour_ms - hour_ms + 1
    assert len(frame) == 1005
    assert frame["open_time"].is_monotonic_increasing
    assert (frame["open_time"].diff().dropna() == pd.Timedelta(hours=1)).all()
    # Requested window reaches back roughly lookback_hours from now.
    expected_start = pd.Timestamp.now(tz="UTC").floor("h") - pd.Timedelta(hours=1004)
    assert frame["open_time"].iloc[0] == expected_start
