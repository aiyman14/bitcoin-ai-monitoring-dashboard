import type { AssetConfig } from "@/lib/assets";
import type { PriceSnapshot } from "@/lib/data";
import {
	formatCurrency,
	formatDateTime,
	formatSignedPercent,
} from "@/lib/format";
import { Eyebrow } from "./Eyebrow";

type PriceCalloutProps = {
	asset: AssetConfig;
	price: PriceSnapshot | null;
};

export function PriceCallout({ asset, price }: PriceCalloutProps) {
	const change24h = price?.change24h ?? null;
	const changeText =
		change24h === null
			? "24h move unavailable"
			: formatSignedPercent(change24h);
	const isPositive = change24h !== null && change24h >= 0;

	const pillClass =
		change24h === null
			? "border border-border-strong bg-panel-2 text-text-2"
			: isPositive
				? "border border-positive/45 bg-positive/20 text-positive-fg"
				: "border border-negative/45 bg-negative/20 text-negative-fg";

	return (
		<section className="panel px-8 py-7">
			<Eyebrow>Latest close</Eyebrow>
			<h2 className="display-2 mt-[14px]">
				{asset.displayName} price context
			</h2>

			{price ? (
				<div className="mt-[22px] grid grid-cols-1 items-end gap-7 border-t border-border pt-[22px] md:grid-cols-[auto_1fr]">
					<p className="m-0 font-display text-[52px] font-bold leading-none tracking-[-0.04em] text-bitcoin-500 tabular-nums md:text-[72px]">
						{formatCurrency(price.latestClose)}
					</p>
					<div className="flex flex-col gap-[10px] pb-2">
						<p className="m-0 text-sm leading-6 text-text-2">
							<span
								className={`mr-2 inline-block rounded-[2px] px-[10px] py-[3px] font-mono text-[12px] font-semibold tracking-[0.02em] tabular-nums ${pillClass}`}
							>
								{changeText}
							</span>
							since the nearest hourly close one day earlier.
						</p>
						<p className="m-0 font-mono text-[11px] uppercase tracking-[0.04em] text-text-3">
							As of {formatDateTime(price.asOf)}
						</p>
					</div>
				</div>
			) : (
				<p className="mt-5 text-sm leading-6 text-text-2">
					Hourly price artifact unavailable.
				</p>
			)}
		</section>
	);
}
