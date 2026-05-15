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
		<section className="rounded-xl border border-surface-200 bg-white p-6">
			<p className="text-[13px] font-medium uppercase tracking-normal text-surface-700">
				Tableau workbook
			</p>
			<h2 className="mt-2 text-2xl font-semibold tracking-normal text-surface-900">
				{asset.displayName} market view
			</h2>
			<p className="mt-1 text-[13px] font-medium text-surface-700">
				How to read this: Use Tableau for visual market context.
			</p>
			{embedUrl ? (
				<iframe
					className="mt-5 aspect-video w-full rounded-xl border border-surface-200"
					src={embedUrl}
					title={`${asset.displayName} Tableau workbook`}
				/>
			) : (
				<p className="mt-5 text-sm leading-6 text-surface-700">
					Tableau workbook coming soon
				</p>
			)}
		</section>
	);
}
