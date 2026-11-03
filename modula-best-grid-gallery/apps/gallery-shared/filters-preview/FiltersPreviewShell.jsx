/**
 * The Filters tab preview's visitor root: the filter bar's colours and
 * alignment (`buildFilterBarDynamicCss`) and its positions around the
 * content (the panel's neutral block), as the visitor lays them out.
 *
 * @package
 */
import { useMemo } from '@wordpress/element';
import { buildFilterBarDynamicCss } from '../utils/buildFilterBarDynamicCss';
import {
	buildFilteringFromSettings,
	resolveFilterBarPlacements,
	resolveFilterLayoutPreviewViewport,
	resolveFilterLayoutShellClass,
	resolveFilterPositioning,
} from '../utils/filterBarModel';
import { galleryRootSelector } from '../utils/galleryRootSelector';
import {
	THEME_INHERIT_CONTROLS_ROOT_CLASS,
	isThemeInheritControlsOn,
} from '../utils/themeInheritControls';

/**
 * `rootId` is the gallery or album id of the root (`#modula-{id}`); `bar` is
 * drawn at each position the settings give, while the bar shows.
 *
 * @param {{
 *   rootId: number,
 *   groupedSettings: Object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   bar: import('react').ReactElement,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function FiltersPreviewShell({
	rootId,
	groupedSettings,
	previewViewport,
	bar,
	children,
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
	// The tablet and phone stack side bars by it, as the canvas (Lite ticket 101).
	const filterLayoutViewport =
		resolveFilterLayoutPreviewViewport(previewViewport);
	const { enabled: showFilterBar } = useMemo(
		() => buildFilteringFromSettings(groupedSettings),
		[groupedSettings]
	);

	const themeInheritClass = isThemeInheritControlsOn(
		groupedSettings?.pagination?.themeInheritControls
	)
		? ` ${THEME_INHERIT_CONTROLS_ROOT_CLASS}`
		: '';
	const shellClass = `modula modula-gallery modula-gallery-modern modula-gallery-initialized modula-gallery-chrome-ready modula-gallery-takeover__filters-preview-shell${themeInheritClass}`;

	const rootSelector = galleryRootSelector(rootId);
	const filterDynamicCss = useMemo(
		() =>
			buildFilterBarDynamicCss(
				rootSelector,
				groupedSettings?.filters || {},
				{}
			),
		[rootSelector, groupedSettings]
	);

	return (
		<div id={`modula-${rootId}`} className={shellClass}>
			{showFilterBar && filterDynamicCss ? (
				<style>{filterDynamicCss}</style>
			) : null}
			<div
				className={filterLayoutShellClass}
				data-preview-viewport={filterLayoutViewport}
			>
				{showFilterBar && filterPlacements.before ? bar : null}
				{children}
				{showFilterBar && filterPlacements.after ? bar : null}
			</div>
		</div>
	);
}
