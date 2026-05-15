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
	const changeColor =
		price?.change24h === null || price === null
			? "text-surface-700"
			: price.change24h >= 0
				? "text-positive"
				: "text-negative";

	return (
		<section className="rounded-xl border border-surface-200 bg-white p-6">
			<p className="text-[13px] font-medium uppercase tracking-normal text-surface-700">
				Latest close
			</p>
			<h2 className="mt-2 text-2xl font-semibold tracking-normal text-surface-900">
				{asset.displayName} price context
			</h2>
			<p className="mt-1 text-[13px] font-medium text-surface-700">
				How to read this: Tracks latest close and one-day move.
			</p>
			{price ? (
				<div className="mt-5">
					<p className="text-4xl font-semibold tracking-normal text-bitcoin-500 tabular-nums">
						{formatCurrency(price.latestClose)}
					</p>
					<p className="mt-2 text-sm leading-6 text-surface-700">
						<span className={`font-medium tabular-nums ${changeColor}`}>
							{changeText}
						</span>{" "}
						since the nearest hourly close one day earlier.
					</p>
					<p className="mt-4 text-[13px] font-medium text-surface-700">
						As of {formatDateTime(price.asOf)}
					</p>
				</div>
			) : (
				<p className="mt-5 text-sm leading-6 text-surface-700">
					Hourly price artifact unavailable.
				</p>
			)}
		</section>
	);
}
