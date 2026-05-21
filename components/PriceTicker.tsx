"use client";

import type { PriceSnapshot } from "@/lib/data";
import {
	formatCurrency,
	formatDateTime,
	formatSignedPercent,
} from "@/lib/format";
import { useEffect, useMemo, useState } from "react";

type PriceTickerProps = {
	price: PriceSnapshot | null;
};

type TickerState = {
	label: string;
	value: string;
	valueClassName?: string;
};

const INTERVAL_MS = 4000;
const SLIDE_MS = 420;

function getChangeClassName(change24h: number): string {
	return change24h >= 0 ? "text-positive-fg" : "text-negative-fg";
}

function TickerLine({ state }: { state: TickerState }) {
	return (
		<span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap font-mono text-[15px] leading-none tracking-[0.01em] tabular-nums">
			<span className="text-bitcoin-500">$</span>
			<span className="text-text-2">{state.label}</span>
			<span className={state.valueClassName ?? "text-foreground"}>
				{state.value}
			</span>
		</span>
	);
}

export function PriceTicker({ price }: PriceTickerProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [nextIndex, setNextIndex] = useState(0);
	const [isSliding, setIsSliding] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const pause = () => setIsPaused(true);
	const resume = () => setIsPaused(false);

	const states = useMemo<TickerState[]>(() => {
		if (!price) {
			return [{ label: "market data unavailable", value: "" }];
		}

		return [
			{
				label: "btc-usd:",
				value: formatCurrency(price.latestClose),
			},
			{
				label: "24h change:",
				value:
					price.change24h === null
						? "unavailable"
						: formatSignedPercent(price.change24h, 2),
				valueClassName:
					price.change24h === null
						? "text-foreground"
						: getChangeClassName(price.change24h),
			},
			{
				label: "last refreshed:",
				value: formatDateTime(price.asOf),
			},
		];
	}, [price]);

	useEffect(() => {
		setActiveIndex(0);
		setNextIndex(states.length > 1 ? 1 : 0);
		setIsSliding(false);
	}, [states.length]);

	useEffect(() => {
		if (states.length < 2 || isPaused || isSliding) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setNextIndex((activeIndex + 1) % states.length);
			setIsSliding(true);
		}, INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [activeIndex, isPaused, isSliding, states.length]);

	useEffect(() => {
		if (!isSliding) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setActiveIndex(nextIndex);
			setNextIndex((nextIndex + 1) % states.length);
			setIsSliding(false);
		}, SLIDE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [isSliding, nextIndex, states.length]);

	const current = states[activeIndex] ?? states[0];
	const next = states[nextIndex] ?? states[0];

	return (
		<section
			data-price-ticker
			className="panel h-[60px] overflow-hidden px-5 py-0"
			onMouseEnter={pause}
			onMouseLeave={resume}
			onPointerEnter={pause}
			onPointerLeave={resume}
		>
			<div className="relative flex h-full items-center">
				<div
					className={`absolute left-0 top-1/2 w-full min-w-0 -translate-y-1/2 transition-transform duration-[420ms] ease-out ${
						isSliding ? "-translate-x-[120%]" : "translate-x-0"
					}`}
				>
					<TickerLine state={current} />
				</div>
				{states.length > 1 ? (
					<div
						className={`absolute left-0 top-1/2 w-full min-w-0 -translate-y-1/2 transition-transform duration-[420ms] ease-out ${
							isSliding ? "translate-x-0" : "translate-x-[120%]"
						}`}
					>
						<TickerLine state={next} />
					</div>
				) : null}
			</div>
		</section>
	);
}
