import type { AssetConfig } from "@/lib/assets";
import type { PatternArtifact } from "@/lib/data";
import { formatDate, formatNumber, formatSignedPercent } from "@/lib/format";

type PatternMatchTableProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
};

export function PatternMatchTable({ asset, pattern }: PatternMatchTableProps) {
	const summary = pattern?.summary.horizon_72h ?? null;

	return (
		<section className="rounded-md border border-border bg-white p-5">
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
				Historical similarity
			</p>
			<h2 className="mt-2 text-xl font-semibold">
				{asset.displayName} similar-window matches
			</h2>
			<p className="mt-1 text-xs text-muted">
				How to read this: Lower distance means closer historical shape.
			</p>
			{summary ? (
				<p className="mt-4 text-sm text-muted">
					The {pattern?.k ?? 0} closest windows were followed by 72h returns
					from {formatSignedPercent(summary.p10)} to{" "}
					{formatSignedPercent(summary.p90)}, with a median of{" "}
					{formatSignedPercent(summary.median)}.
				</p>
			) : (
				<p className="mt-4 text-sm text-muted">
					Similar-window artifact unavailable.
				</p>
			)}
			{pattern && pattern.matches.length > 0 ? (
				<div className="mt-5 overflow-x-auto">
					<table className="w-full min-w-[560px] border-collapse text-left text-sm">
						<thead className="text-xs uppercase tracking-normal text-muted">
							<tr className="border-b border-border">
								<th className="py-3 pr-4 font-medium">Match start</th>
								<th className="py-3 pr-4 font-medium">Distance</th>
								<th className="py-3 pr-4 font-medium">1h return</th>
								<th className="py-3 pr-4 font-medium">24h return</th>
								<th className="py-3 pr-4 font-medium">72h return</th>
							</tr>
						</thead>
						<tbody>
							{pattern.matches.map((match) => (
								<tr
									className="border-b border-border last:border-0"
									key={`${match.match_start}-${match.distance}`}
								>
									<td className="py-3 pr-4">{formatDate(match.match_start)}</td>
									<td className="py-3 pr-4">
										{formatNumber(match.distance, 3)}
									</td>
									<td className="py-3 pr-4">
										{formatSignedPercent(match.forward_returns["1h"])}
									</td>
									<td className="py-3 pr-4">
										{formatSignedPercent(match.forward_returns["24h"])}
									</td>
									<td className="py-3 pr-4">
										{formatSignedPercent(match.forward_returns["72h"])}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</section>
	);
}
