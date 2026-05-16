"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type NavArrowProps = {
	direction: "left" | "right";
	onClick: () => void;
	label: string;
	disabled?: boolean;
};

export function NavArrow({
	direction,
	onClick,
	label,
	disabled = false,
}: NavArrowProps) {
	const Icon = direction === "left" ? ChevronLeft : ChevronRight;
	const position = direction === "left" ? "-left-[18px]" : "-right-[18px]";
	const stateClasses = disabled
		? "cursor-not-allowed opacity-30"
		: "cursor-pointer hover:border-bitcoin-500 hover:bg-bitcoin-500 hover:text-[#1a1a1f] hover:shadow-comic-bitcoin";
	return (
		<button
			aria-label={label}
			className={`group absolute ${position} top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-border-strong bg-panel-2 text-foreground shadow-comic-sm transition-all ${stateClasses}`}
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			<Icon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={2.5} />
		</button>
	);
}

export function PositionCounter({
	index,
	total,
}: {
	index: number;
	total: number;
}) {
	return (
		<span className="font-mono text-sm font-semibold tracking-[0.04em] text-bitcoin-500">
			{String(index + 1).padStart(2, "0")}
			<span className="text-text-2"> / {String(total).padStart(2, "0")}</span>
		</span>
	);
}
