import assetsData from "./assets.json";

export type AssetConfig = {
  id: string;
  binanceSymbol: string;
  yahooSymbol: string;
  displayName: string;
  accentColor: string;
  enabled: boolean;
  tableauWorkbookUrl?: string;
};

export const ASSETS: AssetConfig[] = assetsData as AssetConfig[];
