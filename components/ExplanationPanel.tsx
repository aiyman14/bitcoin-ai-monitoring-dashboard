import type { AssetConfig } from "@/lib/assets";
import type { PatternArtifact, SignalArtifact } from "@/lib/data";
import {
	formatDate,
	formatProbability,
	formatSignedPercent,
} from "@/lib/format";

type ExplanationPanelProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
	signal: SignalArtifact | null;
};

const HORIZON_HOURS = 72;

export function ExplanationPanel({
	asset,
	pattern,
	signal,
}: ExplanationPanelProps) {
	const matches = pattern?.matches ?? [];
	const summary = pattern?.summary.horizon_72h ?? null;
	const dates = matches.map((match) => match.match_start).sort();
	const firstMatchDate = dates[0] ? formatDate(dates[0]) : "unavailable";
	const lastMatchDate = dates[dates.length - 1]
		? formatDate(dates[dates.length - 1])
		: "unavailable";
	const regime = signal?.regime;
	const volatility =
		regime?.volatility_percentile === null || regime === undefined
			? "unavailable"
			: `${Math.round(regime.volatility_percentile * 100)}th`;
	const trend = regime?.trend_label ?? "unavailable";
	const rangeStart = summary ? formatSignedPercent(summary.p10) : "unavailable";
	const rangeEnd = summary ? formatSignedPercent(summary.p90) : "unavailable";
	const median = summary ? formatSignedPercent(summary.median) : "unavailable";
	const direction = signal?.direction ?? "unavailable";
	const f1 =
		signal?.test_f1 === null || signal === null
			? "unavailable"
			: signal.test_f1.toFixed(2);

	return (
		<section className="rounded-md border border-border bg-white p-5 text-base leading-7">
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
				Plain-English readout
			</p>
			<h2 className="mt-2 text-2xl font-semibold">
				{asset.displayName} monitoring snapshot
			</h2>
			<p className="mt-1 text-xs text-muted">
				How to read this: Use ranges as context, not instructions.
			</p>
			<p className="mt-5">
				Conditions over the last {regime?.window_hours ?? 24}h look{" "}
				{regime?.label ?? "unclassified"} (volatility {volatility} percentile,
				trend {trend}). The {pattern?.k ?? 0} most similar past windows occurred
				between {firstMatchDate} and {lastMatchDate}. Over the {HORIZON_HOURS}h
				that followed those windows, returns ranged from {rangeStart} to{" "}
				{rangeEnd} with a median of {median}. Today's hourly direction model
				leans {direction} (probability{" "}
				{formatProbability(signal?.probability_up ?? null)}, F1 {f1}). This is a
				monitoring snapshot, not guidance.
			</p>
		</section>
	);
}
