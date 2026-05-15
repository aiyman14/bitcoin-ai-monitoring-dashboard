import assetsData from "./assets.json";

export type TableauWorkbookUrls = {
	long?: string;
	histogram?: string;
	zoom?: string;
};

export type AssetConfig = {
	id: string;
	binanceSymbol: string;
	yahooSymbol: string;
	displayName: string;
	accentColor: string;
	enabled: boolean;
	tableauWorkbookUrl?: string;
	tableauWorkbookUrls?: TableauWorkbookUrls;
};

export const ASSETS: AssetConfig[] = assetsData as AssetConfig[];
