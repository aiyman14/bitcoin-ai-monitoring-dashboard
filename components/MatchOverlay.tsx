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

const MATCH_LINE_COLOR = "#3d3a36";

export function MatchOverlay({ asset, pattern }: MatchOverlayProps) {
	const [highlightedMatch, setHighlightedMatch] = useState<number | null>(null);
	const chartData = useMemo(() => buildChartData(pattern), [pattern]);
	const matches = pattern?.matches ?? [];
	const currentSeriesLength = pattern?.current_series.length ?? 0;
	const hasSeries = chartData.length > 0 && currentSeriesLength > 0;
	const highlightedDate =
		highlightedMatch === null ? null : matches[highlightedMatch]?.match_start;

	return (
		<section
			className="rounded-md border border-border bg-white p-5"
			data-current-series-length={currentSeriesLength}
			data-match-count={matches.length}
			data-window-hours={pattern?.window_hours ?? 0}
		>
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
				Pattern overlay
			</p>
			<h2 className="mt-2 text-xl font-semibold">
				The current shape sits inside a wider historical range
			</h2>
			<p className="mt-1 text-xs text-muted">
				Each gray line is one of the {pattern?.k ?? 0} most similar past
				windows; the orange line is now. All lines start at 0% to compare
				shapes.
			</p>

			{hasSeries ? (
				<>
					<p className="mt-4 text-xs text-muted" aria-live="polite">
						{highlightedDate
							? `Highlighted match: ${formatDate(highlightedDate)}`
							: "Hover a gray line to see its match date."}
					</p>
					<div className="mt-3 h-80 w-full">
						<ResponsiveContainer height="100%" width="100%">
							<LineChart
								data={chartData}
								margin={{ bottom: 8, left: 0, right: 16, top: 16 }}
							>
								<CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
								<XAxis
									allowDecimals={false}
									dataKey="t"
									label={{
										offset: -2,
										position: "insideBottom",
										value: "t",
									}}
									stroke="#6b7280"
									tick={{ fontSize: 12 }}
									tickLine={false}
								/>
								<YAxis
									stroke="#6b7280"
									tick={{ fontSize: 12 }}
									tickFormatter={(value) => formatSignedPercent(Number(value))}
									tickLine={false}
									width={56}
								/>
								<Tooltip
									formatter={(value: TooltipValue, name: TooltipName) => [
										formatTooltipValue(value),
										formatTooltipName(name, matches),
									]}
									labelFormatter={(label) => `t = ${label}`}
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
											stroke={MATCH_LINE_COLOR}
											strokeOpacity={
												isDimmed ? 0.14 : isHighlighted ? 0.9 : 0.4
											}
											strokeWidth={isHighlighted ? 2.5 : 1.4}
											type="linear"
										/>
									);
								})}
								<Line
									activeDot={{ r: 4 }}
									dataKey="current"
									dot={false}
									isAnimationActive={false}
									name="current"
									stroke={asset.accentColor}
									strokeWidth={3}
									type="linear"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</>
			) : (
				<p className="mt-5 text-sm text-muted">Pattern series unavailable.</p>
			)}
		</section>
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
