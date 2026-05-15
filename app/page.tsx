import { ASSETS } from "@/lib/assets";
import {
	readHourlyRows,
	readPatternArtifacts,
	readSignalArtifact,
	summarizePrice,
} from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { AssetSelector } from "@/components/AssetSelector";
import { PatternDashboard } from "@/components/PatternDashboard";
import { PriceCallout } from "@/components/PriceCallout";
import { SignalCallout } from "@/components/SignalCallout";
import { TableauEmbed } from "@/components/TableauEmbed";
import { Suspense } from "react";

const DISCLAIMER =
	"Educational monitoring tool. Not financial advice. Historical similarity is not predictive.";

export default async function Home() {
	const enabledAssets = ASSETS.filter((asset) => asset.enabled);
	const asset = enabledAssets[0] ?? ASSETS[0];
	const [patterns, signal, hourlyRows] = await Promise.all([
		readPatternArtifacts(asset),
		readSignalArtifact(asset),
		readHourlyRows(asset),
	]);
	const price = summarizePrice(hourlyRows);
	const defaultPattern = patterns["24h"] ?? Object.values(patterns)[0] ?? null;
	const asOf = defaultPattern?.as_of ?? signal?.as_of ?? price?.asOf ?? null;

	return (
		<main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8">
			<header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-sm font-medium text-muted">
						Pattern recognition with measured ranges.
					</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
						{asset.displayName} Market Monitor - A Responsible AI Dashboard
					</h1>
					{asOf ? (
						<p className="mt-3 text-sm text-muted">
							As of {formatDateTime(asOf)}
						</p>
					) : null}
				</div>
				<div className="flex flex-col gap-3 md:items-end">
					<Suspense
						fallback={
							<div className="h-10 w-40 rounded-md border border-border bg-white" />
						}
					>
						<AssetSelector assets={ASSETS} selectedAssetId={asset.id} />
					</Suspense>
					<div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-muted">
						{DISCLAIMER}
					</div>
				</div>
			</header>

			<Suspense
				fallback={
					<div className="rounded-md border border-border bg-white p-5" />
				}
			>
				<PatternDashboard asset={asset} patterns={patterns} />
			</Suspense>

			<section className="grid gap-5 md:grid-cols-2">
				<PriceCallout asset={asset} price={price} />
				<SignalCallout asset={asset} signal={signal} />
			</section>

			<TableauEmbed asset={asset} />
		</main>
	);
}
