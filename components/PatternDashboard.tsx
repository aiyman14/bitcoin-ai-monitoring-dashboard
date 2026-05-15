"use client";

import type { AssetConfig } from "@/lib/assets";
import {
	DEFAULT_LOOKBACK,
	LOOKBACK_OPTIONS,
	type LookbackLabel,
	type PatternArtifactsByLookback,
} from "@/lib/patterns";
import { useSearchParams } from "next/navigation";
import { ExplanationPanel } from "./ExplanationPanel";
import { LookbackSelector } from "./LookbackSelector";
import { PatternMatchTable } from "./PatternMatchTable";

type PatternDashboardProps = {
	asset: AssetConfig;
	patterns: PatternArtifactsByLookback;
};

export function PatternDashboard({ asset, patterns }: PatternDashboardProps) {
	const searchParams = useSearchParams();
	const activeLookback = resolveLookback(
		searchParams.get("lookback"),
		patterns,
	);
	const activePattern =
		patterns[activeLookback] ?? patterns[DEFAULT_LOOKBACK] ?? null;

	return (
		<>
			<ExplanationPanel asset={asset} pattern={activePattern} />
			<LookbackSelector activeLookback={activeLookback} />
			<PatternMatchTable asset={asset} pattern={activePattern} />
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
