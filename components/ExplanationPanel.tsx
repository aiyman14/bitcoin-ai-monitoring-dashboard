import type { AssetConfig } from "@/lib/assets";
import { formatDate, formatSignedPercent } from "@/lib/format";
import type { HorizonLabel, PatternArtifact } from "@/lib/patterns";

type ExplanationPanelProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
};

export function ExplanationPanel({ asset, pattern }: ExplanationPanelProps) {
	const matches = pattern?.matches ?? [];
	const horizon = pattern
		? pattern.horizons[pattern.horizons.length - 1]
		: null;
	const summary = horizon ? pattern?.summary[`horizon_${horizon}`] : null;
	const dates = matches.map((match) => match.match_start).sort();
	const firstMatchDate = dates[0] ? formatDate(dates[0]) : "unavailable";
	const lastMatchDate = dates[dates.length - 1]
		? formatDate(dates[dates.length - 1])
		: "unavailable";
	const rangeStart = summary ? formatSignedPercent(summary.p10) : "unavailable";
	const rangeEnd = summary ? formatSignedPercent(summary.p90) : "unavailable";
	const median = summary ? formatSignedPercent(summary.median) : "unavailable";
	const windowLabel = pattern
		? formatWindowLabel(pattern.window_hours)
		: "the selected window";
	const horizonLabel = horizon
		? formatHorizonLabel(horizon, pattern?.source_interval_hours ?? 1)
		: "the next period";

	return (
		<section className="rounded-xl border border-surface-200 bg-white p-6 text-base leading-relaxed text-surface-700">
			<p className="text-[13px] font-medium uppercase tracking-normal text-surface-700">
				Plain-English readout
			</p>
			<h2 className="mt-2 text-2xl font-semibold tracking-normal text-surface-900">
				{asset.displayName} monitoring snapshot
			</h2>
			<p className="mt-1 text-[13px] font-medium text-surface-700">
				What this tells you: Historical context, not a prediction.
			</p>
			<p className="mt-5 tabular-nums">
				Over {windowLabel} of {asset.displayName} trading, market conditions
				look most similar to {pattern?.k ?? 0} past windows between{" "}
				{firstMatchDate} and {lastMatchDate}. In {horizonLabel} that followed
				those windows, prices moved by anywhere from {rangeStart} to {rangeEnd},
				with a typical move of {median}. This is a monitoring snapshot built
				from historical pattern matching, not guidance.
			</p>
		</section>
	);
}

function formatWindowLabel(windowHours: number): string {
	if (windowHours === 168) {
		return "the last week";
	}
	if (windowHours % 24 === 0) {
		const days = windowHours / 24;
		return days === 1 ? "the last day" : `the last ${days} days`;
	}
	return `the last ${windowHours} hours`;
}

function formatHorizonLabel(
	horizon: HorizonLabel,
	sourceIntervalHours: number,
): string {
	const hours = horizonToHours(horizon);
	if (sourceIntervalHours === 24 && hours % 24 === 0) {
		const days = hours / 24;
		return days === 1 ? "the day" : `the ${days} days`;
	}
	if (hours % 24 === 0) {
		const days = hours / 24;
		return days === 1 ? "the day" : `the ${days} days`;
	}
	return `the ${hours} hours`;
}

function horizonToHours(horizon: HorizonLabel): number {
	const value = Number.parseInt(horizon, 10);
	return horizon.endsWith("d") ? value * 24 : value;
}
