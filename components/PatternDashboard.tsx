"use client";

import type { AssetConfig } from "@/lib/assets";
import { formatDateTime } from "@/lib/format";
import {
	DEFAULT_LOOKBACK,
	LOOKBACK_OPTIONS,
	type LookbackLabel,
	type PatternArtifactsByLookback,
} from "@/lib/patterns";
import { useSearchParams } from "next/navigation";
import { ExplanationPanel } from "./ExplanationPanel";
import { LookbackSelector } from "./LookbackSelector";
import { PatternViewCarousel } from "./PatternViewCarousel";

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
			<PatternViewCarousel asset={asset} pattern={activePattern} />

			<footer className="mt-3 flex flex-col gap-[14px] font-mono text-[11px] leading-[1.6] text-text-3">
				<p className="m-0 border-t border-border pt-[14px]">
					{asset.displayName} data: Yahoo Finance daily candles since 2014,
					Bitstamp hourly candles since 2018. Refreshed every 12 hours.
				</p>
				<p className="m-0 border-t border-border pt-[14px]">
					Last refreshed: {refreshedAt}
				</p>
				<p className="m-0 border-t border-border pt-[14px]">{disclaimer}</p>
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
