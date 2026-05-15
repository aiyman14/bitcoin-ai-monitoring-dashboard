"use client";

import {
	DEFAULT_LOOKBACK,
	LOOKBACK_OPTIONS,
	type LookbackLabel,
} from "@/lib/patterns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
		<section className="rounded-xl border border-surface-200 bg-white p-5">
			<p className="text-[13px] font-medium uppercase tracking-normal text-surface-700">
				Lookback window
			</p>
			<div className="mt-3 flex flex-wrap gap-2">
				{LOOKBACK_OPTIONS.map((option) => {
					const selected = option.value === activeLookback;
					return (
						<button
							aria-pressed={selected}
							className={
								selected
									? "rounded-lg border border-bitcoin-600 bg-bitcoin-500 px-4 py-2 text-sm font-medium text-white transition"
									: "rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-900 transition hover:border-bitcoin-100 hover:bg-bitcoin-50"
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
