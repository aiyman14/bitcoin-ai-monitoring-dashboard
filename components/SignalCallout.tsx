import type { AssetConfig } from "@/lib/assets";
import type { SignalArtifact } from "@/lib/data";
import { formatProbability } from "@/lib/format";

type SignalCalloutProps = {
	asset: AssetConfig;
	signal: SignalArtifact | null;
};

export function SignalCallout({ asset, signal }: SignalCalloutProps) {
	const direction = signal?.direction ?? "unavailable";
	const headline =
		direction === "unavailable"
			? "Hourly model lean unavailable"
			: `Hourly model leans ${direction}`;
	const probability = signal
		? formatProbability(signal.probability_up)
		: "unavailable";
	const f1 =
		signal?.test_f1 === null || signal === null
			? "unavailable"
			: signal.test_f1.toFixed(2);

	return (
		<section className="rounded-md border border-border bg-white p-5">
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
				Direction model
			</p>
			<h2 className="mt-2 text-xl font-semibold">{headline}</h2>
			<p className="mt-1 text-xs text-muted">
				How to read this: Compare model lean with its test F1.
			</p>
			<div className="mt-5 space-y-2 text-sm text-muted">
				<p>
					{asset.displayName} probability up: {probability}
				</p>
				<p>Test-set F1: {f1}</p>
				<p>Model artifact: {signal?.model ?? "unavailable"}</p>
			</div>
		</section>
	);
}
