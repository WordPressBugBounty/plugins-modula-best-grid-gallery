/**
 * Short labels for the fixed 72px sidebar rail (icon + caption).
 * Full category titles stay on accessible names (aria-label).
 */

import { __ } from '@wordpress/i18n';

/** @type {Record<string, string>} */
const RAIL_SHORT_LABELS = {
	interaction: __('Interact', 'modula-best-grid-gallery'),
	protection: __('Protect', 'modula-best-grid-gallery'),
};

/**
 * @param {{ name?: string, title?: string }} category
 * @return {string}
 */
export function getSidebarRailNavLabel(category) {
	const name = typeof category?.name === 'string' ? category.name : '';
	if (name && Object.prototype.hasOwnProperty.call(RAIL_SHORT_LABELS, name)) {
		return RAIL_SHORT_LABELS[name];
	}
	return typeof category?.title === 'string' ? category.title : '';
}
