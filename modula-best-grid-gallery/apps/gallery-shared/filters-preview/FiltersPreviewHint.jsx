/**
 * The line above the Filters tab preview: the bar is hidden, or Collapse on
 * phones needs the phone or tablet canvas. Shared by the gallery editor and the
 * Albums editor.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	buildFilteringFromSettings,
	isFilterBarPhoneDevice,
	resolveFilterBarCollapsibleActionText,
	shouldUseCollapsibleFilterBar,
} from '../utils/filterBarModel';

/**
 * @param {{
 *   groupedSettings: Object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 * }} props
 * @return {import('react').ReactElement|null} The hint, or none.
 */
export default function FiltersPreviewHint({
	groupedSettings,
	previewViewport,
}) {
	const filtersSettings = groupedSettings?.filters || {};

	if (!buildFilteringFromSettings(groupedSettings).enabled) {
		return (
			<p className="modula-gallery-takeover__filters-preview-hint">
				{__(
					'The filter bar is hidden. Turn on “Show the filter bar” to preview it here.',
					'modula-best-grid-gallery'
				)}
			</p>
		);
	}

	const showCollapseOnPhonesHint =
		!isFilterBarPhoneDevice(previewViewport) &&
		shouldUseCollapsibleFilterBar({
			enableCollapsibleFilters: filtersSettings.enableCollapsibleFilters,
			dropdownFilters: filtersSettings.dropdownFilters,
			enableMobileDropdownFilters:
				filtersSettings.enableMobileDropdownFilters,
			isPhone: true,
		});
	if (!showCollapseOnPhonesHint) {
		return null;
	}

	return (
		<p className="modula-gallery-takeover__filters-preview-hint">
			{sprintf(
				/* translators: %s: collapse button label, e.g. Filter by */
				__(
					'Collapse on phones only applies on a phone or tablet canvas. Switch the canvas to Phone or Tablet to preview the “%s” button.',
					'modula-best-grid-gallery'
				),
				resolveFilterBarCollapsibleActionText(filtersSettings)
			)}
		</p>
	);
}
