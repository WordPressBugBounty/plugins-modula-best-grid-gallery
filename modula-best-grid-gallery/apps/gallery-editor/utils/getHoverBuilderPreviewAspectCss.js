/**
 * CSS `aspect-ratio` value for the Hover builder preview card, aligned with focal crop hints
 * (`getFocusModalCropHints`): uniform grid tile, story portrait, else a sensible default.
 *
 * @package
 */

import { getLayoutPolicy } from 'gallery-shared/preview';

/**
 * @param {Record<string, unknown>|null|undefined} groupedSettings
 * @return {string} CSS aspect-ratio value from layout policy.
 */
export function getHoverBuilderPreviewAspectCss(groupedSettings) {
	return getLayoutPolicy(groupedSettings).derived.tileAspectCss;
}
