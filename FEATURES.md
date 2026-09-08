# Features and file directory

A map of what the dashboard does and which files make each piece work. Use this as a reference when looking for where a feature lives.

---

## Asset selector

A dropdown in the header that switches between assets (Bitcoin is the only enabled asset; Ethereum and Solana are scaffolded but disabled).

- `components/AssetSelector.tsx`: the dropdown UI, syncs the selected asset to the URL.
- `lib/assets.ts`: TypeScript types for an asset and the `ASSETS` array imported from JSON.
- `lib/assets.json`: source of truth for asset metadata (symbols, display name, accent color, enabled flag, Tableau workbook URLs). Read by both the frontend and the Python pipeline.
- `ml/assets.py`: Python loader that reads `lib/assets.json` so the data pipeline and the frontend use the same asset list.

## Live price ticker

The slim marquee bar near the top of the page that scrolls through the latest BTC-USD price, the 24-hour percent change, and the last refresh timestamp.

- `components/PriceTicker.tsx`: the marquee component. Cycles three lines, pauses on hover or focus, respects `prefers-reduced-motion`.
- `lib/data.ts`: reads the hourly parquet file and produces the `PriceSnapshot` the ticker consumes (`summarizePrice`).
- `lib/format.ts`: number, currency, percent, and date formatters used by the ticker labels.

## Tableau carousel

Three full-width Tableau Public charts in a swipeable carousel: long-history price chart, daily move histogram, and 90-day zoom.

- `components/TableauCarousel.tsx`: the carousel shell, slide index state, captions, and descriptions.
- `components/TableauEmbed.tsx`: wrapper around the Tableau Public embed script for a single workbook URL.
- `components/CarouselChrome.tsx`: shared chevron buttons used by both the Tableau carousel and the pattern view carousel.
- `app/page.tsx`: defines the three slide titles and descriptions, passes them to `TableauCarousel`.
- The Tableau Public URLs are listed in `lib/assets.json` under `tableauWorkbookUrls`.

## Pattern recognition section

The core analysis. Takes the most recent N hours of trading, finds the past windows that looked most similar, and shows how those past windows played out.

- `components/PatternDashboard.tsx`: container that wires the explanation panel, the lookback selector, the pattern view carousel, and the footer with data source and refresh timestamp.
- `components/ExplanationPanel.tsx`: the prose summary at the top of the section. Inserts dynamic numbers like the number of matches, the date range they span, the typical forward move, and the 10th to 90th percentile band.
- `components/LookbackSelector.tsx`: the 12h / 24h / 72h / 1 week buttons that change the comparison window. Pushes the choice into the URL.
- `components/PatternViewCarousel.tsx`: switchable view container with two tabs.
  - Pattern overlay: the chart of today shape against the past matches.
  - Historical similarity: the ranked table of past windows.
- `components/MatchOverlay.tsx`: Recharts line chart showing today (orange) over the k most similar past windows (gray), all normalized to start at 0 percent.
- `components/PatternMatchTable.tsx`: ranked table of past matches with start date, similarity distance, and forward returns at each horizon.
- `lib/patterns.ts`: TypeScript types for the pattern artifacts, plus the lookback option list and default.
- `lib/data.ts`: `readPatternArtifacts` loads the four lookback-specific JSON files from `data/BTC-USD/`.

## Hourly data refresh pipeline

A scheduled job that pulls fresh market data, recomputes the features, runs the pattern matching for each lookback window, and writes the artifacts the frontend reads.

- `ml/refresh.py`: orchestrator. For each enabled asset, fetches hourly and daily candles, merges them into the parquet store, builds features, scores the latest row, runs pattern matching across all four lookback windows, and writes JSON and CSV artifacts.
- `ml/data_fetch.py`: fetches OHLCV candles from Binance (the data-api.binance.vision mirror first, then api.binance.com) with Yahoo Finance as the fallback. Yahoo retries are capped at three attempts with 5 and 15 second waits so a dead network fails fast instead of eating the job timeout. Every source attempt is logged with elapsed time and row count so a failed cron run can be diagnosed from the Actions log.
- `ml/features.py`: computes the feature columns used by the pattern matcher and the signal model (returns at multiple lags, rolling means and standard deviations, EMA, MACD, RSI, volume z-scores, time-of-day features).
- `ml/pattern.py`: the similarity search. Normalizes each feature with a rolling 30-day z-score, slides a window across history, ranks every past window by cosine distance to the most recent window, and computes forward returns at each horizon for the top k matches.
- `ml/signal.py`: optional probability-of-up score from a trained SVM model if one exists at `ml/models/<asset>/svm.joblib`. Falls back to a stub when the model is not present.
- `ml/assets.py`: shared asset config loader (also used by the frontend via `lib/assets.json`).
- `ml/backfill_hourly.py`: one-off script for backfilling the hourly parquet from older snapshots.
- `ml/requirements.txt`: pinned Python dependencies for the pipeline (pandas, numpy, scikit-learn, pyarrow, requests, joblib).
- `.github/workflows/refresh-hourly.yml`: GitHub Actions workflow that runs the pipeline twice a day (00:00 and 12:00 UTC), verifies the artifacts actually advanced, and commits the refreshed `data/` files back to the repo.

## Page layout and header

The hero panel with the dashboard description, the asset selector on the right, and the disclaimer.

- `app/page.tsx`: composes the entire page: header, price ticker, Tableau carousel, pattern dashboard.
- `app/layout.tsx`: root layout, loads the JetBrains Mono / Inter / Space Grotesk fonts, sets metadata.
- `components/Eyebrow.tsx`: small uppercase mono label used above section titles.

## Design tokens and theme

The dark Bitcoin-orange aesthetic, design tokens, and the `.panel` utility class used by every section.

- `tailwind.config.ts`: color palette (bitcoin-500, panel, panel-2, panel-3, positive-fg, negative-fg, text-2, text-3, border, border-strong), font families, custom radii, and shadow tokens.
- `app/globals.css`: CSS variables for the same tokens, the `.panel` utility, the `.caption`, `.display-1`, `.display-2`, and `.accent-num` typography utilities, the `.shadow-comic` box shadow, and other shared layer styles.

## Data artifacts

The committed output of the refresh pipeline. The frontend reads these directly.

- `data/BTC-USD/hourly.parquet`: hourly OHLCV history.
- `data/BTC-USD/daily.parquet`: daily OHLCV since September 17, 2014.
- `data/BTC-USD/pattern_top_k_12h.json`, `pattern_top_k_24h.json`, `pattern_top_k_72h.json`, `pattern_top_k_168h.json`: pattern recognition output for each lookback window.
- `data/BTC-USD/signal.json`: latest probability-of-up score from the SVM model (or a stub).
- `data/BTC-USD/tableau_long.csv`, `tableau_recent.csv`: flat CSVs powering the Tableau Public workbooks (not consumed by the frontend at runtime).

## Tests

- `ml/tests/`: Python tests for the pipeline. Verify feature values, pattern matching numerics against synthetic fixtures, and merge behavior.
