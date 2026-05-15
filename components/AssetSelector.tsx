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

	return (
		<select
			aria-label="Asset"
			className="h-10 rounded-lg border border-surface-200 bg-white px-3 text-sm font-medium text-surface-900 outline-none transition hover:border-bitcoin-100 focus:border-bitcoin-500 focus:ring-2 focus:ring-bitcoin-100"
			onChange={(event) => selectAsset(event.target.value)}
			value={selectedAsset?.id}
		>
			{assets.map((asset) => (
				<option disabled={!asset.enabled} key={asset.id} value={asset.id}>
					{asset.displayName}
				</option>
			))}
		</select>
	);
}
