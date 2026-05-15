import { AssetSelector } from "@/components/AssetSelector";
import { PatternDashboard } from "@/components/PatternDashboard";
import { PriceCallout } from "@/components/PriceCallout";
import { TableauEmbed } from "@/components/TableauEmbed";
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

	return (
		<main className="mx-auto flex min-h-screen max-w-[1200px] flex-col gap-10 px-4 py-6 text-surface-700 sm:px-6 lg:px-8 lg:py-10">
			<header className="flex flex-col gap-5 rounded-xl border border-surface-200 bg-gradient-to-br from-bitcoin-50/70 via-white to-white p-6 md:flex-row md:items-end md:justify-between">
				<div className="max-w-3xl">
					<h1 className="mt-2 text-4xl font-semibold tracking-normal text-surface-900 md:text-5xl">
						{asset.displayName} Market Monitor
					</h1>
					<p className="mt-4 text-base leading-relaxed text-surface-700">
						{description}
					</p>
					{asOf ? (
						<p className="mt-3 text-[13px] font-medium text-surface-700">
							As of {formatDateTime(asOf)}
						</p>
					) : null}
				</div>
				<div className="flex flex-col gap-3 md:items-end">
					<Suspense
						fallback={
							<div className="h-10 w-40 rounded-lg border border-surface-200 bg-white" />
						}
					>
						<AssetSelector assets={ASSETS} selectedAssetId={asset.id} />
					</Suspense>
					<div className="rounded-xl border border-surface-200 bg-white/80 px-4 py-3 text-[13px] font-medium leading-5 text-surface-700">
						{DISCLAIMER}
					</div>
				</div>
			</header>

			<PriceCallout asset={asset} price={price} />

			<TableauEmbed
				asset={asset}
				caption="What this tells you: Long history frames the current moment."
				title={`${asset.displayName}'s price since 2014`}
			/>

			<TableauEmbed
				asset={asset}
				caption="What this tells you: Typical daily moves set useful context."
				title={`A normal day in ${asset.displayName}`}
			/>

			<TableauEmbed
				asset={asset}
				caption="What this tells you: Recent movement connects to the match window."
				title="Where the market is right now"
			/>

			<Suspense
				fallback={
					<div className="rounded-xl border border-surface-200 bg-white p-6" />
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
