/**
 * Labels for gallery sort modes (preview chrome + reorder panel).
 */
import { __ } from '@wordpress/i18n';

/**
 * @type {{ id: string, label: string }[] | null}
 */
let sortingMenuDefinitionCache = null;

/**
 * @return {{ id: string, label: string }[]}
 */
export function getSortingMenuDefinition() {
	if (!sortingMenuDefinitionCache) {
		sortingMenuDefinitionCache = [
			{
				id: 'manual',
				label: __('Drag and drop reorder', 'modula-best-grid-gallery'),
			},
			{
				id: 'dateCreatedNew',
				label: __(
					'Date created — newest first',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'dateCreatedOld',
				label: __(
					'Date created — oldest first',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'dateModifiedFirst',
				label: __(
					'Date modified — most recent first',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'dateModifiedLast',
				label: __(
					'Date modified — most recent last',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'titleAZ',
				label: __('Title A–Z', 'modula-best-grid-gallery'),
			},
			{
				id: 'titleZA',
				label: __('Title Z–A', 'modula-best-grid-gallery'),
			},
			{
				id: 'random',
				label: __('Random', 'modula-best-grid-gallery'),
			},
		];
	}
	return sortingMenuDefinitionCache;
}

/**
 * @param {string} mode
 * @return {string}
 */
export function getSortingModeLabel(mode) {
	const rows = getSortingMenuDefinition();
	const found = rows.find((r) => r.id === mode);
	return found ? found.label : __('Sorting', 'modula-best-grid-gallery');
}
