import { AssetSelector } from "@/components/AssetSelector";
import { Eyebrow } from "@/components/Eyebrow";
import { PatternDashboard } from "@/components/PatternDashboard";
import { PriceCallout } from "@/components/PriceCallout";
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
	const description = `A dashboard built to help you make sense of what ${asset.displayName} is doing right now. Instead of trying to predict where the market is going, it compares today's patterns to similar moments in the past and shows you what tended to happen afterward, so you can interpret today's market with real historical context.`;

	const tableauSlides = [
		{
			title: `${asset.displayName}'s price since 2014`,
			caption:
				"What this tells you: The long arc Bitcoin has lived through, with every boom and crash visible.",
			description: `Every point on this orange shape is one day of ${asset.displayName} trading since September 17, 2014. The vertical axis is spaced so the early years (when ${asset.displayName} was around $300) and the recent years (above $100,000) are both clearly readable. On a regular axis the early years would compress into a flat line at the bottom. Drag the slider on the right side to zoom into any specific period, like the 2021 peak, the 2022 crash, or the 2024 ETF rally. ${asset.displayName} has gone through multiple boom and crash cycles, and seeing that full history gives you a feel for the kinds of past moments the pattern recognition below is comparing today's market to.`,
			workbookUrl: asset.tableauWorkbookUrls?.long,
		},
		{
			title: `A normal day in ${asset.displayName}`,
			caption:
				"What this tells you: How big a normal Bitcoin day actually is, so you can tell when today is unusual.",
			description: `Each bar in this chart represents a 1% slice of how much ${asset.displayName} moved on a given day. The horizontal axis is the size of the daily move, from steep drops on the left to big jumps on the right. The vertical axis counts how many days in ${asset.displayName}'s history fell into each slice. The tallest bars sit close to 0%, which tells you most ${asset.displayName} days are actually small moves, while rare extreme days like the lonely bar near -40% (the March 2020 COVID crash) sit alone in the tails. Drag the slider on the right to compare different eras, since a normal day in 2024 may look very different from a normal day in 2018. Calibrating what counts as a normal ${asset.displayName} day helps you read the recent ones with the right expectations before the pattern recognition tries to match today against history.`,
			workbookUrl: asset.tableauWorkbookUrls?.histogram,
		},
		{
			title: "Where the market is right now",
			caption:
				"What this tells you: Where Bitcoin is sitting right now, the same window the pattern recognition is comparing against history.",
			description: `This chart zooms into the last 90 days of ${asset.displayName}'s daily closing price, so you can see exactly where the market is sitting heading into today. The horizontal axis is the calendar; the vertical axis is the price in US dollars, trimmed so the recent waves are visible rather than flattened against zero. The long-history chart above gave you the multi-year arc, and the histogram showed you what a normal ${asset.displayName} day looks like. This view zooms in on the moment that everyone is actually watching right now. The pattern recognition section below takes the most recent 24 hours, 72 hours, or week from this same data and asks one question: when has ${asset.displayName} looked like this before, and what tended to happen next?`,
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

			<PriceCallout asset={asset} price={price} />

			<TableauCarousel asset={asset} defaultIndex={0} slides={tableauSlides} />

			<Suspense
				fallback={
					<div className="panel min-h-[200px] px-8 py-7" />
				}
			>
				<PatternDashboard
					asset={asset}
					disclaimer={DISCLAIMER}
					patterns={patterns}
				/>
			</Suspense>
		</main>
	);
}
