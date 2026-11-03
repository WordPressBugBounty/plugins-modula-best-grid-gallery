/**
 * The appearance preferences an editor offers, in menu order.
 */
import { __ } from '@wordpress/i18n';
import {
	APPEARANCE_DARK,
	APPEARANCE_LIGHT,
	APPEARANCE_SYSTEM,
} from './settingsEditorAppearance';

export const APPEARANCE_PREFERENCE_CHOICES = [
	{
		value: APPEARANCE_LIGHT,
		label: __('Light', 'modula-best-grid-gallery'),
	},
	{
		value: APPEARANCE_DARK,
		label: __('Dark', 'modula-best-grid-gallery'),
	},
	{
		value: APPEARANCE_SYSTEM,
		label: __('System', 'modula-best-grid-gallery'),
	},
];

/**
 * @param {string} preference Stored preference (light, dark or system).
 * @return {string} Its menu label; System for a value the menu does not offer,
 *                  which the appearance context resolves the same way.
 */
export function getAppearancePreferenceLabel(preference) {
	const choice =
		APPEARANCE_PREFERENCE_CHOICES.find(
			(entry) => entry.value === preference
		) ??
		APPEARANCE_PREFERENCE_CHOICES.find(
			(entry) => entry.value === APPEARANCE_SYSTEM
		);
	return choice.label;
}
