import type { AssetConfig } from "@/lib/assets";
import type { PriceSnapshot } from "@/lib/data";
import {
	formatCurrency,
	formatDateTime,
	formatSignedPercent,
} from "@/lib/format";

type PriceCalloutProps = {
	asset: AssetConfig;
	price: PriceSnapshot | null;
};

export function PriceCallout({ asset, price }: PriceCalloutProps) {
	const changeText =
		price?.change24h === null || price === null
			? "24h move unavailable"
			: formatSignedPercent(price.change24h);

	return (
		<section className="rounded-md border border-border bg-white p-5">
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
				Latest close
			</p>
			<h2 className="mt-2 text-xl font-semibold">
				{asset.displayName} price context
			</h2>
			<p className="mt-1 text-xs text-muted">
				How to read this: Tracks latest close and one-day move.
			</p>
			{price ? (
				<div className="mt-5">
					<p className="text-4xl font-semibold tracking-normal">
						{formatCurrency(price.latestClose)}
					</p>
					<p className="mt-2 text-sm text-muted">
						{changeText} since the nearest hourly close one day earlier.
					</p>
					<p className="mt-4 text-xs text-muted">
						As of {formatDateTime(price.asOf)}
					</p>
				</div>
			) : (
				<p className="mt-5 text-sm text-muted">
					Hourly price artifact unavailable.
				</p>
			)}
		</section>
	);
}
