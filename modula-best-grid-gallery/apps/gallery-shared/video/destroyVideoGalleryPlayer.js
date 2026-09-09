/**
 * Tear down mounted YT / Vimeo / HTML5 players.
 *
 * @package
 */

/**
 * @param {{ current: * }} playerRef
 * @return {Promise<void>}
 */
export async function destroyVideoGalleryPlayer(playerRef) {
	const player = playerRef?.current;
	if (!player) {
		return;
	}

	try {
		if (typeof player.destroy === 'function') {
			player.destroy();
		} else if (typeof player.destroy === 'undefined' && player.pause) {
			player.pause();
		}
	} catch {
		// Player may already be detached.
	}

	playerRef.current = null;
}
