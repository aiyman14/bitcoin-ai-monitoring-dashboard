"use client";

import type { AssetConfig } from "@/lib/assets";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AssetSelectorProps = {
	assets: AssetConfig[];
	selectedAssetId: string;
};

export function AssetSelector({ assets, selectedAssetId }: AssetSelectorProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const enabledFallback = assets.find((asset) => asset.enabled) ?? assets[0];
	const urlAssetId = searchParams.get("asset");
	const selectedAsset =
		assets.find((asset) => asset.enabled && asset.id === urlAssetId) ??
		assets.find((asset) => asset.enabled && asset.id === selectedAssetId) ??
		enabledFallback;

	function selectAsset(nextAssetId: string) {
		const nextAsset = assets.find(
			(asset) => asset.enabled && asset.id === nextAssetId,
		);
		if (!nextAsset) {
			return;
		}
		const params = new URLSearchParams(searchParams.toString());
		params.set("asset", nextAsset.id);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	}

	// caret SVG embedded as data URI so we get an orange chevron without
	// pulling in a separate icon for a one-off element
	const caret =
		"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23F7931A' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>";

	return (
		<select
			aria-label="Asset"
			className="cursor-pointer appearance-none rounded-panel border-[1.5px] border-border-strong bg-panel-2 py-[10px] pl-[14px] pr-9 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-foreground outline-none transition-colors hover:border-bitcoin-500 focus:border-bitcoin-500"
			onChange={(event) => selectAsset(event.target.value)}
			style={{
				backgroundImage: `url("${caret}")`,
				backgroundRepeat: "no-repeat",
				backgroundPosition: "right 12px center",
			}}
			value={selectedAsset?.id}
		>
			{assets
				.filter((asset) => asset.enabled)
				.map((asset) => (
					<option key={asset.id} value={asset.id}>
						{asset.id.replace("-USD", "")}
					</option>
				))}
			<option disabled value="__coming_soon__">
				More coming soon
			</option>
		</select>
	);
}
