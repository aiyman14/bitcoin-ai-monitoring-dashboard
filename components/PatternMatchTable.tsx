import type { AssetConfig } from "@/lib/assets";
import { formatDate, formatNumber, formatSignedPercent } from "@/lib/format";
import type { PatternArtifact } from "@/lib/patterns";

type PatternMatchTableProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
};

export function PatternMatchTable({ pattern }: PatternMatchTableProps) {
	const horizon = pattern
		? pattern.horizons[pattern.horizons.length - 1]
		: null;
	const summary = horizon ? pattern?.summary[`horizon_${horizon}`] : null;
	const horizons = pattern?.horizons ?? [];

	return (
		<div className="w-full">
			{summary ? (
				<p className="text-[15px] leading-[1.65] text-text-2 tabular-nums">
					The <Num>{pattern?.k ?? 0}</Num> closest windows were followed by{" "}
					{horizon} returns from <Num>{formatSignedPercent(summary.p10)}</Num>{" "}
					to <Num>{formatSignedPercent(summary.p90)}</Num>, with a median of{" "}
					<Num>{formatSignedPercent(summary.median)}</Num>. The Distance
					column below is a score that measures how different each past
					window&apos;s shape was from today&apos;s: smaller numbers mean a
					closer match.
				</p>
			) : (
				<p className="text-[15px] leading-6 text-text-2">
					Similar-window artifact unavailable.
				</p>
			)}

			{pattern && pattern.matches.length > 0 ? (
				<div className="mt-[18px] overflow-x-auto">
					<table className="w-full min-w-[600px] border-collapse text-left font-mono text-[13px] tabular-nums">
						<thead>
							<tr>
								<th className="border-b-[1.5px] border-border-strong pb-[10px] pl-0 pt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-3">
									Match start
								</th>
								<th className="border-b-[1.5px] border-border-strong pb-[10px] pt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-3">
									Distance
								</th>
								{horizons.map((label) => (
									<th
										className="border-b-[1.5px] border-border-strong pb-[10px] pt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-3"
										key={label}
									>
										{label} return
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{pattern.matches.map((match) => (
								<tr
									className="transition-colors hover:bg-bitcoin-50"
									key={`${match.match_start}-${match.distance}`}
								>
									<td className="border-b border-border py-[14px] pl-0 font-medium text-foreground">
										{formatDate(match.match_start)}
									</td>
									<td className="border-b border-border py-[14px] pr-4 text-foreground">
										{formatNumber(match.distance, 3)}
									</td>
									{horizons.map((label) => {
										const value = match.forward_returns[label];
										const color =
											value === undefined
												? "text-text-2"
												: value >= 0
													? "text-positive-fg"
													: "text-negative-fg";
										return (
											<td
												className={`border-b border-border py-[14px] pr-4 ${color}`}
												key={label}
											>
												{value === undefined
													? "n/a"
													: formatSignedPercent(value)}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	);
}

function Num({ children }: { children: React.ReactNode }) {
	return <span className="accent-num">{children}</span>;
}
