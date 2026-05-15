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
		<section className="rounded-md border border-border bg-white p-4">
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
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
									? "rounded-md border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-white"
									: "rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground"
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
