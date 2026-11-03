/**
 * The Filters tab's canvas, shared by the gallery editor and the Albums
 * editor: the bar's hint, then the visitor root with the static bar around a
 * neutral block. Only the visitor filters (maintainer, 2026-10-25): the
 * preview draws none of the items, it only counts them on the chips.
 *
 * @package
 */
import FiltersPreviewBar from './FiltersPreviewBar';
import FiltersPreviewHint from './FiltersPreviewHint';
import FiltersPreviewShell from './FiltersPreviewShell';
import FiltersPreviewStub from './FiltersPreviewStub';

/**
 * `rootId` is the gallery or album id; `items` are the rows the chips count
 * (gallery images, album members); `contentLabel` names the block.
 *
 * @param {{
 *   rootId: number,
 *   groupedSettings: Object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   items: Object[],
 *   contentLabel: string,
 *   barAriaLabel?: string,
 * }} props
 */
export default function FiltersPreviewPanel({
	rootId,
	groupedSettings,
	previewViewport,
	items,
	contentLabel,
	barAriaLabel,
}) {
	return (
		<div className="modula-gallery-takeover__filters-preview">
			<FiltersPreviewHint
				groupedSettings={groupedSettings}
				previewViewport={previewViewport}
			/>
			<FiltersPreviewShell
				rootId={rootId}
				groupedSettings={groupedSettings}
				previewViewport={previewViewport}
				bar={
					<FiltersPreviewBar
						groupedSettings={groupedSettings}
						previewViewport={previewViewport}
						items={items}
						ariaLabel={barAriaLabel}
					/>
				}
			>
				<FiltersPreviewStub label={contentLabel} />
			</FiltersPreviewShell>
		</div>
	);
}
