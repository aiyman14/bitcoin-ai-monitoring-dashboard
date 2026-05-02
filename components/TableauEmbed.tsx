import type { AssetConfig } from "@/lib/assets";

type TableauEmbedProps = {
	asset: AssetConfig;
};

const EMBED_PARAMS = ":embed=y&:display_count=no&:showVizHome=no";

function buildEmbedUrl(rawUrl: string): string {
	const trimmed = rawUrl.trim();
	const separator = trimmed.includes("?") ? "&" : "?";
	return `${trimmed}${separator}${EMBED_PARAMS}`;
}

export function TableauEmbed({ asset }: TableauEmbedProps) {
	const workbookUrl = asset.tableauWorkbookUrl?.trim();
	const embedUrl = workbookUrl ? buildEmbedUrl(workbookUrl) : null;

	return (
		<section className="rounded-md border border-border bg-white p-5">
			<p className="text-xs font-medium uppercase tracking-normal text-muted">
				Tableau workbook
			</p>
			<h2 className="mt-2 text-xl font-semibold">
				{asset.displayName} market view
			</h2>
			<p className="mt-1 text-xs text-muted">
				How to read this: Use Tableau for visual market context.
			</p>
			{embedUrl ? (
				<iframe
					className="mt-5 aspect-video w-full rounded-md border border-border"
					src={embedUrl}
					title={`${asset.displayName} Tableau workbook`}
				/>
			) : (
				<p className="mt-5 text-sm text-muted">Tableau workbook coming soon</p>
			)}
		</section>
	);
}
