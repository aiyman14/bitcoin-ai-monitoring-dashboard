"use client";

import type { AssetConfig } from "@/lib/assets";
import type { PatternArtifact } from "@/lib/patterns";
import { useState } from "react";
import { NavArrow } from "./CarouselChrome";
import { Eyebrow } from "./Eyebrow";
import { MatchOverlay } from "./MatchOverlay";
import { PatternMatchTable } from "./PatternMatchTable";

type PatternViewCarouselProps = {
	asset: AssetConfig;
	pattern: PatternArtifact | null;
};

type ViewKey = "overlay" | "table";
type View = {
	key: ViewKey;
	tab: string;
	eyebrow: string;
	title: string;
};

/**
 * Switchable window for the pattern recognition section.
 * Slot A: MatchOverlay (chart), default.
 * Slot B: PatternMatchTable.
 * Chevrons swap between the two. Segmented tabs are an explicit
 * alternative control for click-to-jump.
 */
export function PatternViewCarousel({
	asset,
	pattern,
}: PatternViewCarouselProps) {
	const views: View[] = [
		{
			key: "overlay",
			tab: "Pattern overlay",
			eyebrow: "Pattern overlay",
			title: "Today's shape against the past windows that look most like it",
		},
		{
			key: "table",
			tab: "Historical similarity",
			eyebrow: "Historical similarity",
			title: `Past ${asset.displayName} windows ranked by resemblance`,
		},
	];
	const [index, setIndex] = useState(0);
	const total = views.length;
	const view = views[index];
	const atStart = index === 0;
	const atEnd = index === total - 1;
	const go = (delta: number) => {
		const next = index + delta;
		if (next < 0 || next >= total) return;
		setIndex(next);
	};
	const isOverlay = view.key === "overlay";

	return (
		<section className="panel relative px-8 py-7">
			<div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto]">
				<div className="min-w-0">
					<Eyebrow>{view.eyebrow}</Eyebrow>
					<h2 className="display-2 mt-[14px]">{view.title}</h2>
					<p className="caption mt-[6px]">
						{isOverlay ? (
							<>
								Each gray line is one of the{" "}
								<span className="accent-num">{pattern?.k ?? 0}</span> past
								windows that most resembled today; the orange line is today.
							</>
						) : (
							"What this tells you: Closest historical shapes, ranked first."
						)}
					</p>
				</div>
				<div className="flex flex-col items-end gap-3 pt-1">
					<div className="inline-flex overflow-hidden rounded-[3px] border-[1.5px] border-border-strong">
						{views.map((v, i) => (
							<button
								className={
									(i === index
										? "bg-bitcoin-500 text-[#1a1a1f]"
										: "bg-transparent text-text-2 hover:text-foreground") +
									" cursor-pointer whitespace-nowrap border-0 px-4 py-[9px] font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors" +
									(i > 0 ? " border-l-[1.5px] border-border-strong" : "")
								}
								key={v.key}
								onClick={() => setIndex(i)}
								type="button"
							>
								{v.tab}
							</button>
						))}
					</div>
				</div>
			</div>

			{isOverlay ? (
				<p className="mt-4 max-w-[80ch] text-[15px] leading-[1.65] text-text-2">
					Each line shows the percent move from the start of its window, not
					the dollar price. Aligning the starts at 0 percent removes the
					difference between {asset.displayName} at $30,000 and{" "}
					{asset.displayName} at $90,000, so the shapes can be compared
					directly rather than the price levels.
				</p>
			) : null}

			<div className="relative mt-[18px] flex min-h-[380px] items-stretch">
				<NavArrow
					direction="left"
					disabled={atStart}
					label="Previous view"
					onClick={() => go(-1)}
				/>
				<div className="flex-1 rounded-[3px] border-[1.5px] border-border bg-panel-3 px-6 py-5">
					{isOverlay ? (
						<MatchOverlay asset={asset} pattern={pattern} />
					) : (
						<PatternMatchTable asset={asset} pattern={pattern} />
					)}
				</div>
				<NavArrow
					direction="right"
					disabled={atEnd}
					label="Next view"
					onClick={() => go(1)}
				/>
			</div>
		</section>
	);
}
