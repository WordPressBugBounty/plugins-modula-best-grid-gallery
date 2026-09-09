/**
 * Takeover Filters category: isolated filter bar preview with real positioning.
 */
import {
	buildFilterBarDynamicCss,
	buildFilteringFromSettings,
	galleryRootSelector,
	resolveFilterBarCollapsibleActionText,
	resolveFilterBarPlacements,
	resolveFilterLayoutShellClass,
	resolveFilterPositioning,
	shouldUseCollapsibleFilterBar,
} from 'gallery-shared/preview';
import { useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import FiltersPreviewFallback from './FiltersPreviewFallback';
import FiltersPreviewGalleryStub from './FiltersPreviewGalleryStub';
import FiltersPreviewBar from './FiltersPreviewBar';

/**
 * @param {{
 *   galleryId: number,
 *   groupedSettings: object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 * }} props
 */
export default function FiltersPreviewPanel({
	galleryId,
	groupedSettings,
	previewViewport,
}) {
	const filterPositioning = resolveFilterPositioning({}, groupedSettings);
	const filterPlacements = useMemo(
		() => resolveFilterBarPlacements(filterPositioning),
		[filterPositioning]
	);
	const filterLayoutShellClass = resolveFilterLayoutShellClass(
		filterPositioning,
		true
	);
	const { availableFilters, enabled: showFilterBar } = useMemo(
		() => buildFilteringFromSettings(groupedSettings),
		[groupedSettings]
	);

	const rootSelector = galleryRootSelector(galleryId);
	const filterDynamicCss = useMemo(
		() =>
			buildFilterBarDynamicCss(
				rootSelector,
				groupedSettings?.filters || {},
				{}
			),
		[rootSelector, groupedSettings]
	);

	if (!availableFilters.length) {
		return <FiltersPreviewFallback />;
	}

	if (!showFilterBar) {
		return (
			<div className="modula-gallery-takeover__filters-preview">
				<p className="modula-gallery-takeover__filters-preview-hint">
					{__(
						'The filter bar is hidden. Turn on “Show the filter bar” to preview it here.',
						'modula-best-grid-gallery'
					)}
				</p>
				<div
					id={`modula-${galleryId}`}
					className="modula modula-gallery modula-gallery-modern modula-gallery-initialized modula-gallery-chrome-ready modula-gallery-takeover__filters-preview-shell"
					data-preview-viewport={previewViewport}
				>
					<div className={filterLayoutShellClass}>
						<FiltersPreviewGalleryStub />
					</div>
				</div>
			</div>
		);
	}

	const filtersSettings = groupedSettings?.filters || {};
	const showCollapseOnPhonesHint =
		previewViewport !== 'mobile' &&
		shouldUseCollapsibleFilterBar({
			enableCollapsibleFilters: filtersSettings.enableCollapsibleFilters,
			dropdownFilters: filtersSettings.dropdownFilters,
			enableMobileDropdownFilters:
				filtersSettings.enableMobileDropdownFilters,
			isPhone: true,
		});
	const collapseLabel =
		resolveFilterBarCollapsibleActionText(filtersSettings);

	return (
		<div className="modula-gallery-takeover__filters-preview">
			{showCollapseOnPhonesHint ? (
				<p className="modula-gallery-takeover__filters-preview-hint">
					{sprintf(
						/* translators: %s: collapse button label, e.g. Filter by */
						__(
							'Collapse on phones only applies on a phone-sized canvas. Switch to Phone above to preview the “%s” button.',
							'modula-best-grid-gallery'
						),
						collapseLabel
					)}
				</p>
			) : null}
			<div
				id={`modula-${galleryId}`}
				className="modula modula-gallery modula-gallery-modern modula-gallery-initialized modula-gallery-chrome-ready modula-gallery-takeover__filters-preview-shell"
				data-preview-viewport={previewViewport}
			>
				{filterDynamicCss ? <style>{filterDynamicCss}</style> : null}
				<div className={filterLayoutShellClass}>
					{filterPlacements.before ? (
						<FiltersPreviewBar
							groupedSettings={groupedSettings}
							previewViewport={previewViewport}
						/>
					) : null}
					<FiltersPreviewGalleryStub />
					{filterPlacements.after ? (
						<FiltersPreviewBar
							groupedSettings={groupedSettings}
							previewViewport={previewViewport}
						/>
					) : null}
				</div>
			</div>
		</div>
	);
}
