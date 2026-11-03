/**
 * Labels for gallery sort modes (the canvas toolbar's Sort popover).
 */
import { __ } from '@wordpress/i18n';

/**
 * `label` names the mode in the Sort by list; `toolbarLabel` is the shorter
 * name the Sort button shows after "Sort ·".
 *
 * @type {{ id: string, label: string, toolbarLabel: string }[] | null}
 */
let sortingMenuDefinitionCache = null;

/**
 * @return {{ id: string, label: string, toolbarLabel: string }[]}
 */
export function getSortingMenuDefinition() {
	if (!sortingMenuDefinitionCache) {
		sortingMenuDefinitionCache = [
			{
				id: 'manual',
				label: __('Drag and drop reorder', 'modula-best-grid-gallery'),
				toolbarLabel: __('Custom order', 'modula-best-grid-gallery'),
			},
			{
				id: 'dateCreatedNew',
				label: __(
					'Date created — newest first',
					'modula-best-grid-gallery'
				),
				toolbarLabel: __(
					'Date created, newest first',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'dateCreatedOld',
				label: __(
					'Date created — oldest first',
					'modula-best-grid-gallery'
				),
				toolbarLabel: __(
					'Date created, oldest first',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'dateModifiedFirst',
				label: __(
					'Date modified — most recent first',
					'modula-best-grid-gallery'
				),
				toolbarLabel: __(
					'Date modified, most recent first',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'dateModifiedLast',
				label: __(
					'Date modified — most recent last',
					'modula-best-grid-gallery'
				),
				toolbarLabel: __(
					'Date modified, most recent last',
					'modula-best-grid-gallery'
				),
			},
			{
				id: 'titleAZ',
				label: __('Title A–Z', 'modula-best-grid-gallery'),
				toolbarLabel: __('Title A–Z', 'modula-best-grid-gallery'),
			},
			{
				id: 'titleZA',
				label: __('Title Z–A', 'modula-best-grid-gallery'),
				toolbarLabel: __('Title Z–A', 'modula-best-grid-gallery'),
			},
			{
				id: 'random',
				label: __('Random', 'modula-best-grid-gallery'),
				toolbarLabel: __('Random', 'modula-best-grid-gallery'),
			},
		];
	}
	return sortingMenuDefinitionCache;
}
