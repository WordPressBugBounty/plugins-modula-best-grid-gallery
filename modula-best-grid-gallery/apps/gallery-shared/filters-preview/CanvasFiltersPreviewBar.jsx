/**
 * The Filters tab's static bar (`FiltersPreviewBar`) on the editor canvas,
 * where the gallery draws the visitor's bar (Lite ticket 96). It reads the
 * preview store the canvas renders: the live settings, the previewed device
 * and every item, which its chips count. Nothing in it filters. It carries
 * its alignment and colours itself (`canvasFiltersPreviewBarStyle`).
 *
 * @package
 */
import { useMemo } from '@wordpress/element';
import { shallowEqual, useSelector } from 'react-redux';
import FiltersPreviewBar from './FiltersPreviewBar';
import { canvasFiltersPreviewBarStyle } from './canvasFiltersPreviewBarStyle';

const NO_ITEMS = [];

/**
 * @param {Object} state Gallery store state.
 * @return {{ settings: Object, previewViewport: string|undefined, items: Object[] }} What the bar draws from.
 */
function selectCanvasFilterBarInputs(state) {
	return {
		settings: state.gallery.settings,
		previewViewport: state.gallery.config?.previewViewport,
		items: state.items.items ?? NO_ITEMS,
	};
}

/**
 * The context takes the component, not an element: an editor that names its
 * bar otherwise provides a wrapper that passes `ariaLabel`. Without it, the
 * Filters tab's default.
 *
 * @param {{ ariaLabel?: string }} props
 */
export default function CanvasFiltersPreviewBar({ ariaLabel }) {
	const { settings, previewViewport, items } = useSelector(
		selectCanvasFilterBarInputs,
		shallowEqual
	);
	const filtersSettings = settings?.filters;
	const style = useMemo(
		() => canvasFiltersPreviewBarStyle(filtersSettings),
		[filtersSettings]
	);

	return (
		<FiltersPreviewBar
			groupedSettings={settings}
			previewViewport={previewViewport}
			items={items}
			ariaLabel={ariaLabel}
			style={style}
		/>
	);
}
