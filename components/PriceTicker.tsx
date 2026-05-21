"use client";

import type { PriceSnapshot } from "@/lib/data";
import {
	formatCurrency,
	formatDateTime,
	formatSignedPercent,
} from "@/lib/format";
import { useMemo, useState } from "react";

type PriceTickerProps = {
	price: PriceSnapshot | null;
};

type TickerEntry = {
	id: "price" | "change" | "refresh" | "unavailable";
	label: string;
	value: string;
	tone?: "neutral" | "positive" | "negative";
};

// Full loop duration for the marquee. The track contains two copies of
// the entry list and animates from translateX(0) → translateX(-50%), so
// CYCLE_SECONDS is the time it takes for one copy to scroll fully past.
const CYCLE_SECONDS = 22;

function buildEntries(price: PriceSnapshot | null): TickerEntry[] {
	if (!price) {
		return [
			{
				id: "unavailable",
				label: "status",
				value: "market data unavailable",
			},
		];
	}
	const change = price.change24h;
	return [
		{
			id: "price",
			label: "btc-usd",
			value: formatCurrency(price.latestClose),
		},
		{
			id: "change",
			label: "24h",
			value:
				change === null ? "unavailable" : formatSignedPercent(change, 2),
			tone:
				change === null
					? "neutral"
					: change >= 0
						? "positive"
						: "negative",
		},
		{
			id: "refresh",
			label: "refreshed",
			value: formatDateTime(price.asOf),
		},
	];
}

function valueClassName(tone: TickerEntry["tone"]): string {
	if (tone === "positive") return "text-positive-fg";
	if (tone === "negative") return "text-negative-fg";
	return "text-foreground";
}

function TickerItem({ entry }: { entry: TickerEntry }) {
	return (
		<span className="flex shrink-0 items-baseline gap-[10px] whitespace-nowrap font-mono text-[15px] leading-none tracking-[0.01em] tabular-nums">
			<span aria-hidden className="select-none text-bitcoin-500">
				$
			</span>
			<span className="text-text-2">{entry.label}</span>
			<span aria-hidden className="select-none text-text-3">
				›
			</span>
			<span className={valueClassName(entry.tone)}>{entry.value}</span>
		</span>
	);
}

/**
 * PriceTicker
 *
 * Slim mono-text bar that scrolls horizontally like a stock ticker.
 * Renders the entry list twice and animates the track from 0% to -50%,
 * so the second copy lands exactly where the first started — seamless
 * loop with no visible wrap. Animation pauses on hover/focus, and on
 * `prefers-reduced-motion: reduce`. When price is null the bar shows
 * a single fallback line and does not animate.
 */
export function PriceTicker({ price }: PriceTickerProps) {
	const entries = useMemo(() => buildEntries(price), [price]);
	const canCycle = entries.length > 1;
	const [paused, setPaused] = useState(false);

	const sequence = canCycle ? [...entries, ...entries] : entries;

	return (
		<section
			data-price-ticker
			className="panel relative h-[60px] overflow-hidden"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocusCapture={() => setPaused(true)}
			onBlurCapture={() => setPaused(false)}
		>
			<style>{`
				@keyframes bt-price-ticker-scroll {
					from { transform: translate3d(0, 0, 0); }
					to   { transform: translate3d(-50%, 0, 0); }
				}
				@media (prefers-reduced-motion: reduce) {
					[data-price-ticker] [data-price-ticker-track] {
						animation: none !important;
						transform: none !important;
					}
				}
			`}</style>

			<div className="flex h-full items-center">
				{canCycle ? (
					<div
						data-price-ticker-track
						className="flex shrink-0 items-center will-change-transform"
						style={{
							paddingLeft: 20,
							animation: `bt-price-ticker-scroll ${CYCLE_SECONDS}s linear infinite`,
							animationPlayState: paused ? "paused" : "running",
						}}
					>
						{sequence.map((entry, i) => (
							<div
								key={`${entry.id}-${i}`}
								className="flex shrink-0 items-center"
							>
								<TickerItem entry={entry} />
								<span
									aria-hidden
									className="mx-[44px] select-none font-mono text-[13px] leading-none text-text-3"
								>
									◆
								</span>
							</div>
						))}
					</div>
				) : (
					<div className="px-5">
						<TickerItem entry={entries[0]} />
					</div>
				)}
			</div>

			{/* Soft edge fades so items don't pop in/out at the panel borders. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 w-[36px]"
				style={{
					background:
						"linear-gradient(to right, var(--color-panel) 10%, rgba(37, 37, 44, 0))",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 right-0 w-[36px]"
				style={{
					background:
						"linear-gradient(to left, var(--color-panel) 10%, rgba(37, 37, 44, 0))",
				}}
			/>
		</section>
	);
}
