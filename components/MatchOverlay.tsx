"use client";

import type { AssetConfig } from "@/lib/assets";
import { formatDate, formatSignedPercent } from "@/lib/format";
import type { PatternArtifact, PatternMatch } from "@/lib/patterns";
import { useMemo, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type MatchOverlayProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
};

type ChartDatum = {
	current?: number;
	t: number;
	[seriesKey: string]: number | undefined;
};

type TooltipValue =
	| number
	| string
	| ReadonlyArray<number | string>
	| undefined;

type TooltipName = number | string | undefined;

// dark-theme axis colors, pulled from the CSS variables so the
// chart stays in lockstep with the design tokens
const AXIS = "rgba(245, 245, 240, 0.5)";
const GRID = "rgba(245, 245, 240, 0.07)";
const MATCH_LINE = "#d4d2cc";
const TICK_FONT = "JetBrains Mono, ui-monospace, monospace";

export function MatchOverlay({ asset, pattern }: MatchOverlayProps) {
	const [highlightedMatch, setHighlightedMatch] = useState<number | null>(null);
	const chartData = useMemo(() => buildChartData(pattern), [pattern]);
	const matches = pattern?.matches ?? [];
	const currentSeriesLength = pattern?.current_series.length ?? 0;
	const hasSeries = chartData.length > 0 && currentSeriesLength > 0;
	const highlightedDate =
		highlightedMatch === null ? null : matches[highlightedMatch]?.match_start;
	const isDailyFrame = pattern?.source_interval_hours === 24;
	const stepLabel = isDailyFrame ? "Day" : "Hour";
	const xAxisLabel = isDailyFrame ? "Days into window" : "Hours into window";

	return (
		<div
			className="h-full w-full"
			data-current-series-length={currentSeriesLength}
			data-match-count={matches.length}
			data-window-hours={pattern?.window_hours ?? 0}
		>
			{hasSeries ? (
				<>
					<p
						aria-live="polite"
						className="mb-3 font-mono text-[12px] text-text-2"
					>
						{highlightedDate ? (
							<>
								Highlighted match:{" "}
								<span className="accent-num">{formatDate(highlightedDate)}</span>
							</>
						) : (
							"Hover a gray line to see its match date."
						)}
					</p>
					<div className="h-[360px] w-full">
						<ResponsiveContainer height="100%" width="100%">
							<LineChart
								data={chartData}
								margin={{ bottom: 12, left: 0, right: 18, top: 14 }}
							>
								<CartesianGrid stroke={GRID} strokeDasharray="3 3" />
								<XAxis
									allowDecimals={false}
									dataKey="t"
									label={{
										fill: "rgba(245,245,240,0.55)",
										fontSize: 11,
										offset: -2,
										position: "insideBottom",
										value: xAxisLabel,
									}}
									stroke={AXIS}
									tick={{ fill: AXIS, fontFamily: TICK_FONT, fontSize: 11 }}
									tickLine={false}
								/>
								<YAxis
									stroke={AXIS}
									tick={{ fill: AXIS, fontFamily: TICK_FONT, fontSize: 11 }}
									tickFormatter={(value) => formatSignedPercent(Number(value))}
									tickLine={false}
									width={56}
								/>
								<Tooltip
									contentStyle={{
										background: "#1a1a1f",
										border: "1.5px solid #54545f",
										borderRadius: 0,
										color: "#f5f5f0",
										fontFamily: TICK_FONT,
										fontSize: 11,
									}}
									cursor={{
										stroke: "rgba(247,147,26,0.4)",
										strokeWidth: 1,
									}}
									formatter={(value: TooltipValue, name: TooltipName) => [
										formatTooltipValue(value),
										formatTooltipName(name, matches),
									]}
									labelFormatter={(label) => `${stepLabel} ${label}`}
								/>
								{matches.map((match, index) => {
									const isHighlighted = highlightedMatch === index;
									const isDimmed =
										highlightedMatch !== null && highlightedMatch !== index;
									return (
										<Line
											activeDot={false}
											dataKey={matchKey(index)}
											dot={false}
											isAnimationActive={false}
											key={`${match.match_start}-${index}`}
											name={matchKey(index)}
											onMouseEnter={() => setHighlightedMatch(index)}
											onMouseLeave={() => setHighlightedMatch(null)}
											stroke={MATCH_LINE}
											strokeOpacity={
												isDimmed ? 0.1 : isHighlighted ? 0.95 : 0.35
											}
											strokeWidth={isHighlighted ? 2.5 : 1.3}
											type="linear"
										/>
									);
								})}
								<Line
									activeDot={{
										fill: asset.accentColor,
										r: 4,
										stroke: "#1a1a1f",
										strokeWidth: 2,
									}}
									dataKey="current"
									dot={false}
									isAnimationActive={false}
									name="current"
									stroke={asset.accentColor}
									strokeWidth={3.2}
									type="linear"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</>
			) : (
				<p className="text-sm leading-6 text-text-2">
					Pattern series unavailable.
				</p>
			)}
		</div>
	);
}

function buildChartData(pattern: PatternArtifact | null): ChartDatum[] {
	if (!pattern) {
		return [];
	}

	const rows = new Map<number, ChartDatum>();

	for (const point of pattern.current_series) {
		rows.set(point.t, {
			...(rows.get(point.t) ?? { t: point.t }),
			current: point.pct_change_from_start,
		});
	}

	pattern.matches.forEach((match, index) => {
		for (const point of match.match_series) {
			const existing = rows.get(point.t) ?? { t: point.t };
			rows.set(point.t, {
				...existing,
				[matchKey(index)]: point.pct_change_from_start,
			});
		}
	});

	return [...rows.values()].sort((left, right) => left.t - right.t);
}

function matchKey(index: number): string {
	return `match_${index}`;
}

function formatTooltipValue(value: TooltipValue): string {
	if (typeof value === "number") {
		return formatSignedPercent(value);
	}
	if (Array.isArray(value)) {
		return value.join(", ");
	}
	if (typeof value === "string") {
		const numeric = Number(value);
		return Number.isNaN(numeric) ? value : formatSignedPercent(numeric);
	}
	return "unavailable";
}

function formatTooltipName(name: TooltipName, matches: PatternMatch[]): string {
	if (name === "current") {
		return "Now";
	}
	if (typeof name === "string" && name.startsWith("match_")) {
		const index = Number.parseInt(name.replace("match_", ""), 10);
		const match = matches[index];
		return match ? formatDate(match.match_start) : "Past window";
	}
	return String(name ?? "Series");
}
