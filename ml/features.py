from __future__ import annotations

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "close",
    "volume",
    "return_1h",
    "lag_return_1h",
    "lag_return_2h",
    "lag_return_6h",
    "rolling_mean_6h",
    "rolling_mean_24h",
    "rolling_std_6h",
    "rolling_std_24h",
    "ema_12",
    "ema_26",
    "macd",
    "rsi_14",
    "dist_from_ma_24h",
    "volume_change_1h",
    "volume_zscore_24h",
    "hour_of_day",
    "day_of_week",
]


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy().sort_values("open_time")
    data["return_1h"] = data["close"].pct_change()
    data["target"] = (data["return_1h"].shift(-1) > 0).astype(int)
    data["lag_return_1h"] = data["return_1h"].shift(1)
    data["lag_return_2h"] = data["return_1h"].shift(2)
    data["lag_return_6h"] = data["return_1h"].shift(6)

    data["rolling_mean_6h"] = data["close"].rolling(window=6).mean()
    data["rolling_mean_24h"] = data["close"].rolling(window=24).mean()
    data["rolling_std_6h"] = data["close"].rolling(window=6).std()
    data["rolling_std_24h"] = data["close"].rolling(window=24).std()

    data["ema_12"] = data["close"].ewm(span=12, adjust=False).mean()
    data["ema_26"] = data["close"].ewm(span=26, adjust=False).mean()
    data["macd"] = data["ema_12"] - data["ema_26"]
    data["rsi_14"] = _rsi(data["close"], window=14)

    data["dist_from_ma_24h"] = (data["close"] - data["rolling_mean_24h"]) / data[
        "rolling_std_24h"
    ].replace(0, np.nan)
    data["volume_change_1h"] = (
        data["volume"].pct_change().replace([np.inf, -np.inf], np.nan).fillna(0)
    )
    volume_mean = data["volume"].rolling(window=24).mean()
    volume_std = data["volume"].rolling(window=24).std()
    data["volume_zscore_24h"] = (
        (data["volume"] - volume_mean) / volume_std.replace(0, np.nan)
    ).fillna(0)

    data["hour_of_day"] = data["open_time"].dt.hour
    data["day_of_week"] = data["open_time"].dt.dayofweek
    data = data.replace([np.inf, -np.inf], np.nan)
    return data.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)


def _rsi(close: pd.Series, window: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=window).mean()
    avg_loss = loss.rolling(window=window).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    rsi = rsi.mask((avg_loss == 0) & (avg_gain > 0), 100)
    rsi = rsi.mask((avg_gain == 0) & (avg_loss > 0), 0)
    return rsi.mask((avg_gain == 0) & (avg_loss == 0), 50)
