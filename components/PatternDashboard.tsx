"use client";

import type { AssetConfig } from "@/lib/assets";
import { formatDateTime } from "@/lib/format";
import {
	DEFAULT_LOOKBACK,
	LOOKBACK_OPTIONS,
	type LookbackLabel,
	type PatternArtifactsByLookback,
} from "@/lib/patterns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ExplanationPanel } from "./ExplanationPanel";
import { LookbackSelector } from "./LookbackSelector";
import { MatchOverlay } from "./MatchOverlay";
import { PatternMatchTable } from "./PatternMatchTable";

type PatternDashboardProps = {
	asset: AssetConfig;
	disclaimer: string;
	patterns: PatternArtifactsByLookback;
};

export function PatternDashboard({
	asset,
	disclaimer,
	patterns,
}: PatternDashboardProps) {
	const searchParams = useSearchParams();
	const activeLookback = resolveLookback(
		searchParams.get("lookback"),
		patterns,
	);
	const activePattern =
		patterns[activeLookback] ?? patterns[DEFAULT_LOOKBACK] ?? null;
	const refreshedAt = activePattern?.as_of
		? formatDateTime(activePattern.as_of)
		: "unavailable";

	return (
		<>
			<ExplanationPanel asset={asset} pattern={activePattern} />
			<LookbackSelector activeLookback={activeLookback} />
			<MatchOverlay asset={asset} pattern={activePattern} />

			<details className="group [&_summary::-webkit-details-marker]:hidden">
				<summary className="cursor-pointer list-none rounded-xl border border-surface-200 bg-white p-6 transition hover:border-bitcoin-100 hover:bg-bitcoin-50/30">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-2xl font-semibold tracking-normal text-surface-900">
								Historical similarity details
							</h2>
							<p className="mt-1 text-[13px] font-medium leading-5 text-surface-700">
								Click to open the full ranked table of every matched past
								window, its distance score, and what followed at each
								horizon.
							</p>
						</div>
						<span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-200 text-surface-700">
							<ChevronRight
								aria-hidden="true"
								className="h-5 w-5 group-open:hidden"
							/>
							<ChevronDown
								aria-hidden="true"
								className="hidden h-5 w-5 group-open:block"
							/>
						</span>
					</div>
				</summary>
				<div className="mt-4">
					<PatternMatchTable asset={asset} pattern={activePattern} />
				</div>
			</details>

			<footer className="text-[13px] font-medium leading-5 text-surface-700">
				<p className="border-t border-surface-200 pt-5">
					{asset.displayName} data: Yahoo Finance daily candles since 2014,
					Bitstamp hourly candles since 2018. Refreshed every 12 hours.
				</p>
				<p className="mt-5 border-t border-surface-200 pt-5">
					Last refreshed: {refreshedAt}
				</p>
				<p className="mt-5 border-t border-surface-200 pt-5">{disclaimer}</p>
			</footer>
		</>
	);
}

function resolveLookback(
	value: string | null,
	patterns: PatternArtifactsByLookback,
): LookbackLabel {
	const option = LOOKBACK_OPTIONS.find(
		(candidate) => candidate.value === value,
	);
	if (option && patterns[option.value]) {
		return option.value;
	}
	return patterns[DEFAULT_LOOKBACK]
		? DEFAULT_LOOKBACK
		: (LOOKBACK_OPTIONS.find((candidate) => patterns[candidate.value])?.value ??
				DEFAULT_LOOKBACK);
}
