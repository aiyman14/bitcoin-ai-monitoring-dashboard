"use client";

import type { AssetConfig } from "@/lib/assets";
import { useState } from "react";
import { NavArrow, PositionCounter } from "./CarouselChrome";
import { Eyebrow } from "./Eyebrow";
import { TableauEmbed } from "./TableauEmbed";

type TableauSlide = {
	title: string;
	caption: string;
	description: string;
	workbookUrl?: string;
};

type TableauCarouselProps = {
	asset: AssetConfig;
	slides: TableauSlide[];
	defaultIndex?: number;
};

/**
 * Single panel that swaps between the three Tableau visuals.
 * Header shows active title + caption. Big iframe in the middle.
 * Description below. Chevrons on the sides bound to the slide range
 * (left disabled at slide 0, right disabled at the last slide).
 */
export function TableauCarousel({
	asset,
	slides,
	defaultIndex = 0,
}: TableauCarouselProps) {
	const [index, setIndex] = useState(defaultIndex);
	const total = slides.length;
	const slide = slides[index] ?? slides[0];
	const atStart = index === 0;
	const atEnd = index === total - 1;

	const go = (delta: number) => {
		const next = index + delta;
		if (next < 0 || next >= total) return;
		setIndex(next);
	};

	return (
		<section className="panel relative px-8 py-7">
			<div className="mb-2 grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto]">
				<div className="min-w-0">
					<Eyebrow>Market context</Eyebrow>
					<h2 className="display-2 mt-[14px]">{slide.title}</h2>
				</div>
				<div className="flex items-center pt-1">
					<PositionCounter index={index} total={total} />
				</div>
			</div>

			<div className="relative mt-[18px] flex items-stretch">
				<NavArrow
					direction="left"
					disabled={atStart}
					label="Previous visual"
					onClick={() => go(-1)}
				/>
				<div className="flex-1 rounded-[3px] border-[1.5px] border-border bg-panel-3 p-5">
					<TableauEmbed
						asset={asset}
						title={slide.title}
						workbookUrl={slide.workbookUrl}
					/>
				</div>
				<NavArrow
					direction="right"
					disabled={atEnd}
					label="Next visual"
					onClick={() => go(1)}
				/>
			</div>

			<p className="mt-6 text-[14px] leading-[1.7] text-text-2">
				{slide.description}
			</p>
		</section>
	);
}
