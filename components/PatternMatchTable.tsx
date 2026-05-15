import type { AssetConfig } from "@/lib/assets";
import { formatDate, formatNumber, formatSignedPercent } from "@/lib/format";
import type { PatternArtifact } from "@/lib/patterns";

type PatternMatchTableProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
};

export function PatternMatchTable({ asset, pattern }: PatternMatchTableProps) {
	const horizon = pattern
		? pattern.horizons[pattern.horizons.length - 1]
		: null;
	const summary = horizon ? pattern?.summary[`horizon_${horizon}`] : null;
	const horizons = pattern?.horizons ?? [];

	return (
		<section className="rounded-xl border border-surface-200 bg-white p-6">
			<p className="text-[13px] font-medium uppercase tracking-normal text-surface-700">
				Historical similarity
			</p>
			<h2 className="mt-2 text-2xl font-semibold tracking-normal text-surface-900">
				Past {asset.displayName} windows ranked by resemblance
			</h2>
			<p className="mt-1 text-[13px] font-medium text-surface-700">
				What this tells you: Closest historical shapes, ranked first.
			</p>
			{summary ? (
				<p className="mt-4 text-sm leading-6 text-surface-700">
					The {pattern?.k ?? 0} closest windows were followed by {horizon}{" "}
					returns from {formatSignedPercent(summary.p10)} to{" "}
					{formatSignedPercent(summary.p90)}, with a median of{" "}
					{formatSignedPercent(summary.median)}.
				</p>
			) : (
				<p className="mt-4 text-sm leading-6 text-surface-700">
					Similar-window artifact unavailable.
				</p>
			)}
			{pattern && pattern.matches.length > 0 ? (
				<div className="mt-5 overflow-x-auto">
					<table className="w-full min-w-[560px] border-collapse text-left text-sm tabular-nums">
						<thead className="text-[13px] uppercase tracking-normal text-surface-700">
							<tr className="border-b border-surface-200">
								<th className="py-3 pr-4 font-medium">Match start</th>
								<th className="py-3 pr-4 font-medium">Distance</th>
								{horizons.map((label) => (
									<th className="py-3 pr-4 font-medium" key={label}>
										{label} return
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{pattern.matches.map((match) => (
								<tr
									className="border-b border-surface-200 text-surface-700 last:border-0"
									key={`${match.match_start}-${match.distance}`}
								>
									<td className="py-3 pr-4">{formatDate(match.match_start)}</td>
									<td className="py-3 pr-4">
										{formatNumber(match.distance, 3)}
									</td>
									{horizons.map((label) => (
										<td className="py-3 pr-4" key={label}>
											{formatReturn(match.forward_returns[label])}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</section>
	);
}

function formatReturn(value: number | undefined): string {
	return value === undefined ? "n/a" : formatSignedPercent(value);
}
