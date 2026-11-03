/**
 * The editor asks the preview gallery to play an entrance again: the Motion
 * tab's replay button, and its peek while an Entrance option is highlighted.
 * `useGalleryEntrance` listens in the settings-editor preview only.
 *
 * @package
 */

/** Window event the preview gallery listens to. */
export const ENTRANCE_REPLAY_EVENT = 'modula-entrance-replay';

/**
 * @param {string} [entrance] A `motion.entrance` choice to play instead of the stored one (the peek).
 */
export function requestEntranceReplay(entrance) {
	if (typeof window === 'undefined') {
		return;
	}
	window.dispatchEvent(
		new window.CustomEvent(ENTRANCE_REPLAY_EVENT, {
			detail: { entrance },
		})
	);
}
