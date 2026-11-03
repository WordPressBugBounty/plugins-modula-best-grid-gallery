import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * Freeform tiles move, resize and restack in Pro's desktop preview only;
 * tablet and mobile paint from the desktop composition.
 *
 * @param {string|undefined} device Preview device.
 * @return {boolean} Whether the Freeform surface takes gestures and draws its selection frame.
 */
export function canArrangeFreeform(device) {
	return getModulaSettingsEditorConfig().isPro && device === 'desktop';
}
