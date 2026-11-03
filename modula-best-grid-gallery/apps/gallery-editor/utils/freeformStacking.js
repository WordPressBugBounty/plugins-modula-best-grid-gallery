/** Freeform paint order: the steps and the history step shared by the Stacking box and the canvas toolbar. */
import { __ } from '@wordpress/i18n';

/**
 * Stacking steps with the canvas wording, in the canvas order. `action` is a
 * `changeFreeformStacking` step; `icon` is the canvas toolbar glyph (SVG path).
 * Forward/backward step past the nearest overlapping image only.
 *
 * @type {Array<{action: string, label: string, icon: string}>}
 */
export const FREEFORM_STACKING_STEPS = [
	{
		action: 'front',
		label: __('Bring to front', 'modula-best-grid-gallery'),
		icon: 'M4 4h11v11H4zM9 9h11v11H9z',
	},
	{
		action: 'forward',
		label: __('Move forward', 'modula-best-grid-gallery'),
		icon: 'M4 9h11v11H4zM9 4h11v11',
	},
	{
		action: 'backward',
		label: __('Move backward', 'modula-best-grid-gallery'),
		icon: 'M9 4h11v11H9zM4 9v11h11',
	},
	{
		action: 'back',
		label: __('Send to back', 'modula-best-grid-gallery'),
		// Arrow down to the bottom layer: two squares like the others would read as Bring to front.
		icon: 'M12 4v11M7 10l5 5 5-5M4 20h16',
	},
];

/**
 * @param {Object}   form       Gallery settings form.
 * @param {Object}   undoRedo   Settings history (`commitSettingsStep`).
 * @param {Object[]} placements Composition returned by `changeFreeformStacking`.
 */
export function commitFreeformStacking(form, undoRedo, placements) {
	undoRedo.commitSettingsStep(
		__('Change stacking', 'modula-best-grid-gallery'),
		() => form.setFieldValue('freeform.placements', placements)
	);
}
