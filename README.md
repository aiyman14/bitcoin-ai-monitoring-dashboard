# Bitcoin AI Monitoring Dashboard

**Live site:** https://bitcoin-ai-monitoring-dashboard.pages.dev (best viewed in Chrome)

A dashboard that monitors the Bitcoin market by comparing recent trading to similar moments in Bitcoin's history. The dashboard does not predict where the market is going. It shows what tended to follow past windows that looked like the current one, and presents the spread of those outcomes as a range.

By Aiyman Akbar. DACSS 604 final project, Spring 2026.

---

## What the dashboard shows

The page is laid out top to bottom in four sections.

1. **Header.** Asset selector (only Bitcoin is enabled), short description, and a disclaimer.
2. **Live price ticker.** Auto-cycling bar with the latest Bitcoin price, the 24-hour percent change, and the time of the last data refresh.
3. **Tableau carousel.** Three charts that set up context for the pattern recognition below.
   - Long history: daily closing prices since 2014, plotted on a logarithmic axis so the early years and the recent years are both legible.
   - Daily move histogram: how big a typical Bitcoin day is, and how rare the extreme days are.
   - 90-day zoom: the most recent three months, the same window the pattern recognition draws from.
4. **Pattern recognition.** The core of the dashboard. Picks a lookback window (12 hours, 24 hours, 72 hours, or 1 week), finds the past Bitcoin windows that looked most like it, and shows how those past windows played out.

## How the pattern tracking works

The pattern tracker is a similarity search over Bitcoin's hourly history. It does not forecast. It answers a single question: when has Bitcoin looked like this before, and what tended to follow?

The steps are as follows.

1. **Build a description of each hour.** For every hour in Bitcoin's history, the pipeline computes a small set of numbers that describe what was happening at that hour. The numbers include the recent return, several lagged returns, rolling averages and rolling volatility over 6 and 24 hours, an EMA-based momentum indicator (MACD), a 14-period RSI, the distance from the 24-hour moving average, volume changes, and time-of-day markers. These numbers together form a fingerprint of the market at that hour.
2. **Normalize the fingerprints so they can be compared across eras.** Each number is rescaled against its own rolling 30-day average and standard deviation. This step is what lets a window from 2017, when Bitcoin was around $4,000, be compared against today. The comparison is about how the market was behaving, not the dollar prices.
3. **Form the current window.** Stack the last N hours of fingerprints into a single long vector that describes the recent window. The lookback selector (12h / 24h / 72h / 1 week) controls how many hours go into that vector.
4. **Score every past window.** Slide a window of the same length across all of history, and for every position compute a similarity score against the current window. The score used is cosine similarity, which measures whether two windows moved in the same direction at the same time and with the same relative magnitudes. Higher score means a closer match.
5. **Keep the top ten matches.** The ten past windows with the highest similarity scores are kept. These are the windows that most resembled the current one.
6. **Look at what happened next.** For each of those ten past matches, the pipeline records the actual forward return at multiple horizons (for example, the next 1 hour, 12 hours, 24 hours, 72 hours). Those ten forward returns form a distribution.
7. **Summarize the distribution as a range.** The dashboard does not report a single predicted number. It reports the median forward return and the 10th to 90th percentile band across the ten matches. The width of the band is itself information: a tight band means past matches agreed on what tended to follow; a wide band means they disagreed.

The pattern overlay chart visualizes step 5 directly. The orange line is the current window. Each gray line is one of the ten past matches, with its starting point shifted to 0 percent so the shapes can be compared without the dollar prices getting in the way. The historical similarity table lists the same ten matches with their start dates, their similarity scores, and their forward returns.

Important caveats. Past similarity does not imply future repetition. The 10th to 90th percentile band is a description of what happened after similar-looking windows in the past, not a confidence interval over the future. Bitcoin's market structure changes over time, so old matches from very different market conditions may not carry the same weight as recent ones. The dashboard is built for interpretation and context, not for trading decisions.

## Data source

All Bitcoin price data comes from Yahoo Finance, with Binance used as a fallback when Yahoo is rate-limited or unreachable.

- Daily candles: September 17, 2014 to today.
- Hourly candles: a rolling recent window, refreshed continuously.

Data is refreshed every 12 hours by a GitHub Actions cron job (00:00 and 12:00 UTC). The job pulls fresh candles, runs the feature pipeline, recomputes the pattern matches for all four lookback windows, and commits the refreshed artifacts back to the repository. The frontend reads the committed artifacts directly, so the dashboard updates the next time the static site is regenerated.

## Repository map

The full file-by-file directory of what every component and module does is in [FEATURES.md](FEATURES.md). The short version:

- `app/` and `components/`: the Next.js frontend (TypeScript, React 19, Tailwind).
- `lib/`: shared TypeScript modules (asset config, formatters, type definitions, data readers).
- `ml/`: the Python data pipeline (data fetch, feature engineering, pattern matching).
- `.github/workflows/refresh-hourly.yml`: the scheduled refresh job.
- `data/BTC-USD/`: the committed data artifacts read by the frontend.

## Running locally

Requirements: Node.js 20 or newer, pnpm, and Python 3.11 (only needed for refreshing the data locally).

```
pnpm install
pnpm dev
```

The dev server runs at http://localhost:3000. The page reads from `data/BTC-USD/` directly, so the data artifacts already in the repository are sufficient to see the dashboard without running the Python pipeline.

To refresh the data locally:

```
python -m pip install -r ml/requirements.txt
python ml/refresh.py
```

This will update the parquet and JSON files under `data/BTC-USD/`. In normal use the GitHub Actions cron handles this automatically.

## Disclaimer

Educational monitoring tool. Not financial advice. Historical similarity is not predictive.
