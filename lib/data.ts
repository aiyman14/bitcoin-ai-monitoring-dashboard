import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AssetConfig } from "./assets";

export async function readAssetJson<T>(asset: AssetConfig, fileName: string): Promise<T | null> {
  try {
    const raw = await readFile(join(process.cwd(), "data", asset.id, fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
