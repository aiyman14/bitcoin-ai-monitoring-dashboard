import { AssetSelector } from "@/components/AssetSelector";
import { Eyebrow } from "@/components/Eyebrow";
import { PatternDashboard } from "@/components/PatternDashboard";
import { PriceTicker } from "@/components/PriceTicker";
import { TableauCarousel } from "@/components/TableauCarousel";
import { ASSETS } from "@/lib/assets";
import {
	readHourlyRows,
	readPatternArtifacts,
	summarizePrice,
} from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { Suspense } from "react";

const DISCLAIMER =
	"Educational monitoring tool. Not financial advice. Historical similarity is not predictive.";

export default async function Home() {
	const enabledAssets = ASSETS.filter((asset) => asset.enabled);
	const asset = enabledAssets[0] ?? ASSETS[0];
	const [patterns, hourlyRows] = await Promise.all([
		readPatternArtifacts(asset),
		readHourlyRows(asset),
	]);
	const price = summarizePrice(hourlyRows);
	const defaultPattern = patterns["24h"] ?? Object.values(patterns)[0] ?? null;
	const asOf = defaultPattern?.as_of ?? price?.asOf ?? null;
	const description = `The dashboard does not predict where ${asset.displayName} is going. It compares the recent hours of trading against similar moments in ${asset.displayName}'s history and shows what tended to follow them.`;

	const tableauSlides = [
		{
			title: `${asset.displayName}'s price since 2014`,
			caption:
				"What this tells you: Every boom and crash in Bitcoin's history at a single glance.",
			description: `This chart shows daily closing prices for ${asset.displayName} from September 17, 2014 to today. The y-axis is logarithmic: each gridline is a 10x step, so $300 in 2014 and $100,000+ today are both legible. Drag the slider on the right to zoom into any period, like the 2021 peak, the 2022 crash, or the 2024 ETF rally.`,
			workbookUrl: asset.tableauWorkbookUrls?.long,
		},
		{
			title: `A normal day in ${asset.displayName}`,
			caption:
				"What this tells you: How big a typical Bitcoin day is, and how rare the extreme ones are.",
			description: `Each bar groups ${asset.displayName} days by daily percent change. The x-axis is the size of the daily move, from drops on the left to gains on the right. The y-axis counts how many days fell into each bin. Most days cluster near 0 percent, while extreme days like the -40 percent bar from the March 2020 COVID crash sit alone in the tails. Drag the slider on the right to compare different eras, since a normal day in 2024 looks different from a normal day in 2018.`,
			workbookUrl: asset.tableauWorkbookUrls?.histogram,
		},
		{
			title: "Where the market is right now",
			caption:
				"What this tells you: The recent 90 days of Bitcoin, the same window the pattern recognition compares against history.",
			description: `The last 90 days of ${asset.displayName}'s daily closing price. The x-axis is the calendar; the y-axis is price in US dollars, trimmed so recent moves are visible. The pattern recognition section below takes the most recent 24 hours, 72 hours, or 7 days from this same data and asks one question: when has ${asset.displayName} looked like this before, and what tended to follow?`,
			workbookUrl: asset.tableauWorkbookUrls?.zoom,
		},
	];

	return (
		<main className="mx-auto flex min-h-screen max-w-[1200px] flex-col gap-7 px-4 pb-20 pt-10 text-text-2 sm:px-6 lg:px-8">
			<header className="panel relative grid grid-cols-1 items-stretch gap-8 px-9 py-9 md:grid-cols-[1fr_auto]">
				<div className="min-w-0">
					<Eyebrow>Market monitor</Eyebrow>
					<h1 className="display-1 mt-4">
						{asset.displayName}{" "}
						<span className="text-bitcoin-500">Market Monitor</span>
					</h1>
					<p className="mt-[14px] max-w-[60ch] text-[15px] leading-[1.6] text-text-2">
						{description}
					</p>
					{asOf ? (
						<p className="mt-[14px] font-mono text-[11px] uppercase tracking-[0.04em] text-text-3">
							As of {formatDateTime(asOf)}
						</p>
					) : null}
				</div>
				<div className="flex flex-col items-start gap-[14px] md:items-end">
					<Suspense
						fallback={
							<div className="h-10 w-40 rounded-panel border-[1.5px] border-border-strong bg-panel-2" />
						}
					>
						<AssetSelector assets={ASSETS} selectedAssetId={asset.id} />
					</Suspense>
					<div className="max-w-[260px] rounded-panel border border-dashed border-border-strong px-[14px] py-3 font-mono text-[11px] leading-[1.55] text-text-2 md:text-right">
						{DISCLAIMER}
					</div>
				</div>
			</header>

			<PriceTicker price={price} />

			<TableauCarousel asset={asset} defaultIndex={0} slides={tableauSlides} />

			<Suspense fallback={<div className="panel min-h-[200px] px-8 py-7" />}>
				<PatternDashboard
					asset={asset}
					disclaimer={DISCLAIMER}
					patterns={patterns}
				/>
			</Suspense>
		</main>
	);
}
