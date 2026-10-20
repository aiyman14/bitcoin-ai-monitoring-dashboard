# Bitcoin Market Monitor

**Live:** https://bitcoin-ai-monitoring-dashboard.pages.dev (best in Chrome)
**Memo:** [Data, method, and design](https://github.com/aiyman14/research_portfolio_AA/blob/main/2026_applied-ml-dashboard-for-bitcoin-market-monitoring.pdf)

A dashboard that answers one question: when has Bitcoin looked like this before, and what tended to follow? It does not forecast prices. It finds the ten past windows most similar to the current one and shows the range of what happened next.

Built by Aiyman Akbar for DACSS 604 (Advanced Data-Driven Storytelling), UMass Amherst, Spring 2026.

## What you see

1. A live price ticker with the 24-hour change and last refresh time.
2. Three charts for context: daily prices since 2014 on a log scale, the distribution of daily moves, and the last 90 days.
3. Pattern recognition. Pick a lookback window (12 hours, 24 hours, 72 hours, or 1 week). The dashboard overlays the ten closest historical matches on the current window and reports the median forward return with the 10th to 90th percentile band. A wide band means history disagrees with itself.

## How the matching works

Every hour is described by nineteen features: returns, rolling averages and volatility, MACD, RSI, volume changes, and time of day. Each feature is standardized against its own trailing 30-day mean, so a window from 2018 can be compared with one from today on shape rather than price level. Cosine distance ranks every past window against the current one, and the ten closest become the matches.

## Does it work?

A walk-forward test over 2,338 days found that the matches did no better than ten randomly chosen windows at bracketing the realized return or calling its direction. That is why the dashboard is presented as historical context, not a prediction, and why it reports ranges instead of a single number. Details are in the memo.

## Data

Hourly candles from Binance's public market data, with Yahoo Finance as a fallback, backfilled to May 2018. A GitHub Actions job refreshes the data and recomputes every match at 00:00 and 12:00 UTC.

## Run it locally

Node.js 20+ and pnpm for the site; Python 3.11 only if you want to refresh the data.

    pnpm install
    pnpm dev

The site runs at http://localhost:3000. The data pipeline lives in `ml/`. `FEATURES.md` has the file-by-file breakdown.

## Stack

Next.js, React 19, TypeScript, Tailwind, Tableau embeds, Python (pandas, NumPy), GitHub Actions, Cloudflare Pages.

Educational tool only. Not financial advice.
