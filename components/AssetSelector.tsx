import type { AssetConfig } from "@/lib/assets";

export function AssetSelector({ assets }: { assets: AssetConfig[] }) {
  return (
    <select className="h-10 rounded-md border border-border bg-white px-3 text-sm" defaultValue={assets[0]?.id}>
      {assets.map((asset) => (
        <option disabled={!asset.enabled} key={asset.id} value={asset.id}>
          {asset.displayName}
        </option>
      ))}
    </select>
  );
}
