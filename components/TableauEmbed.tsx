import type { AssetConfig } from "@/lib/assets";

type TableauEmbedProps = {
	asset: AssetConfig;
	caption?: string;
	description?: string;
	title?: string;
	workbookUrl?: string;
};

const EMBED_PARAMS = ":embed=y&:display_count=no&:showVizHome=no";

function buildEmbedUrl(rawUrl: string): string {
	const trimmed = rawUrl.trim();
	const separator = trimmed.includes("?") ? "&" : "?";
	return `${trimmed}${separator}${EMBED_PARAMS}`;
}

export function TableauEmbed({
	asset,
	caption,
	description,
	title,
	workbookUrl,
}: TableauEmbedProps) {
	const resolvedUrl =
		workbookUrl?.trim() || asset.tableauWorkbookUrl?.trim() || "";
	const embedUrl = resolvedUrl ? buildEmbedUrl(resolvedUrl) : null;
	const panelTitle = title ?? `${asset.displayName} market view`;
	const panelCaption =
		caption ?? "What this tells you: Visual market context, held in Tableau.";

	return (
		<section className="rounded-xl border border-surface-200 bg-white p-6">
			<h2 className="text-2xl font-semibold tracking-normal text-surface-900">
				{panelTitle}
			</h2>
			<p className="mt-1 text-[13px] font-medium text-surface-700">
				{panelCaption}
			</p>
			{embedUrl ? (
				<iframe
					className="mt-5 aspect-video w-full rounded-xl border border-surface-200"
					src={embedUrl}
					title={panelTitle}
				/>
			) : (
				<p className="mt-5 text-sm leading-6 text-surface-700">
					Visual coming soon
				</p>
			)}
			{description ? (
				<p className="mt-5 text-sm leading-7 text-surface-700">
					{description}
				</p>
			) : null}
		</section>
	);
}
