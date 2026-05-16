import type { AssetConfig } from "@/lib/assets";

type TableauEmbedProps = {
	asset: AssetConfig;
	title?: string;
	workbookUrl?: string;
};

const EMBED_PARAMS = ":embed=y&:display_count=no&:showVizHome=no";

function buildEmbedUrl(rawUrl: string): string {
	const trimmed = rawUrl.trim();
	const separator = trimmed.includes("?") ? "&" : "?";
	return `${trimmed}${separator}${EMBED_PARAMS}`;
}

/**
 * Bare iframe-only embed. The surrounding chrome (panel, title,
 * caption, description) lives in TableauCarousel.
 */
export function TableauEmbed({ asset, title, workbookUrl }: TableauEmbedProps) {
	const resolvedUrl =
		workbookUrl?.trim() || asset.tableauWorkbookUrl?.trim() || "";
	const embedUrl = resolvedUrl ? buildEmbedUrl(resolvedUrl) : null;
	const iframeTitle = title ?? `${asset.displayName} market view`;

	if (!embedUrl) {
		return (
			<div className="flex h-full min-h-[380px] items-center justify-center rounded-[3px] border-[1.5px] border-border bg-panel-3 p-6 font-mono text-sm text-text-2">
				Visual coming soon
			</div>
		);
	}

	return (
		<iframe
			className="block aspect-video h-full w-full rounded-[3px] border-[1.5px] border-border bg-panel-3"
			src={embedUrl}
			title={iframeTitle}
		/>
	);
}
