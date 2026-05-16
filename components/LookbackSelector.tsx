"use client";

import {
	DEFAULT_LOOKBACK,
	LOOKBACK_OPTIONS,
	type LookbackLabel,
} from "@/lib/patterns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eyebrow } from "./Eyebrow";

type LookbackSelectorProps = {
	activeLookback: LookbackLabel;
};

export function LookbackSelector({ activeLookback }: LookbackSelectorProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	function selectLookback(nextLookback: LookbackLabel) {
		const params = new URLSearchParams(searchParams.toString());
		if (nextLookback === DEFAULT_LOOKBACK) {
			params.delete("lookback");
		} else {
			params.set("lookback", nextLookback);
		}
		const query = params.toString();
		router.replace(query ? `${pathname}?${query}` : pathname, {
			scroll: false,
		});
	}

	return (
		<section className="panel grid grid-cols-1 items-center gap-6 px-8 py-[22px] md:grid-cols-[1fr_auto]">
			<div>
				<Eyebrow>Lookback window</Eyebrow>
				<p className="caption mt-[6px]">
					Switch the comparison window.
				</p>
			</div>
			<div className="flex flex-wrap gap-2">
				{LOOKBACK_OPTIONS.map((option) => {
					const selected = option.value === activeLookback;
					return (
						<button
							aria-pressed={selected}
							className={
								selected
									? "translate-x-[-1px] translate-y-[-1px] cursor-pointer rounded-[2px] border-[1.5px] border-bitcoin-500 bg-bitcoin-500 px-[18px] py-[9px] font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-[#1a1a1f] shadow-comic-bitcoin transition-all"
									: "cursor-pointer rounded-[2px] border-[1.5px] border-border-strong bg-transparent px-[18px] py-[9px] font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-text-2 transition-all hover:border-bitcoin-500/40 hover:text-foreground"
							}
							key={option.value}
							onClick={() => selectLookback(option.value)}
							type="button"
						>
							{option.label}
						</button>
					);
				})}
			</div>
		</section>
	);
}
