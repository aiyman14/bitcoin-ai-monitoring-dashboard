export const LOOKBACK_OPTIONS = [
	{ label: "12h", value: "12h" },
	{ label: "24h", value: "24h" },
	{ label: "72h", value: "72h" },
	{ label: "1 week", value: "168h" },
] as const;

export type LookbackLabel = (typeof LOOKBACK_OPTIONS)[number]["value"];

export const DEFAULT_LOOKBACK: LookbackLabel = "24h";

export type HorizonLabel =
	| "1h"
	| "1d"
	| "3d"
	| "6h"
	| "7d"
	| "12h"
	| "24h"
	| "30d"
	| "72h"
	| "168h";

export type PatternSummary = {
	mean: number;
	median: number;
	n_positive: number;
	p10: number;
	p90: number;
};

export type SeriesPoint = {
	pct_change_from_start: number;
	t: number;
};

export type PatternMatch = {
	distance: number;
	forward_returns: Partial<Record<HorizonLabel, number>>;
	match_series: SeriesPoint[];
	match_start: string;
};

export type PatternArtifact = {
	as_of: string | null;
	asset: string;
	current_series: SeriesPoint[];
	horizons: HorizonLabel[];
	k: number;
	matches: PatternMatch[];
	source_interval_hours: number;
	summary: Partial<Record<`horizon_${HorizonLabel}`, PatternSummary>>;
	window_hours: number;
	window_rows: number;
};

export type PatternArtifactsByLookback = Partial<
	Record<LookbackLabel, PatternArtifact>
>;
