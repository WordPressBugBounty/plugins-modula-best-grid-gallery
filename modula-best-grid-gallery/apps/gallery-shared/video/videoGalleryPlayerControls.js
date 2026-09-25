/**
 * Video gallery main player: remount identity + in-place unmute/play.
 *
 * Remount inputs intentionally exclude user interaction — flipping that flag
 * must unmute/play the already-mounted provider, not tear it down.
 *
 * @package
 */

/**
 * Values that may remount the main video provider.
 *
 * @param {Object|null|undefined} video
 * @return {{
 *   playbackUrl: string|null,
 *   youtubeId: string|null,
 *   vimeoId: string|null,
 *   kind: string|null,
 *   autoplayThumbnail: boolean,
 *   loopVideos: boolean,
 *   poster: string|null,
 * }}
 */
export function getVideoGalleryPlayerRemountInputs(video) {
	return {
		playbackUrl: video?.playbackUrl ?? null,
		youtubeId: video?.youtubeId ?? null,
		vimeoId: video?.vimeoId ?? null,
		kind: video?.kind ?? null,
		autoplayThumbnail: !!video?.autoplayThumbnail,
		loopVideos: !!video?.loopVideos,
		poster: video?.poster ?? null,
	};
}

/**
 * Whether a fresh mount should start muted (autoplay thumbnail before gesture).
 *
 * @param {boolean} autoplayThumbnail
 * @param {boolean} userHasInteracted
 * @return {boolean}
 */
export function resolveVideoGalleryStartMuted(
	autoplayThumbnail,
	userHasInteracted
) {
	return !!autoplayThumbnail && !userHasInteracted;
}

/**
 * When the active clip ends: advance playlist, or keep looping the same clip.
 *
 * @param {boolean} loopVideos
 * @return {boolean}
 */
export function shouldAdvancePlaylistOnVideoEnd(loopVideos) {
	return !loopVideos;
}

/**
 * Unmute and play an already-mounted provider in place.
 *
 * @param {Object}          args
 * @param {string}          [args.kind]
 * @param {*}               [args.player]
 * @param {HTMLVideoElement|Object|null} [args.html5El]
 */
export function playVideoGalleryPlayer({ kind, player, html5El } = {}) {
	if (kind === 'youtube' && player && typeof player.playVideo === 'function') {
		if (typeof player.unMute === 'function') {
			player.unMute();
		}
		player.playVideo();
		return;
	}

	if (kind === 'vimeo' && player && typeof player.play === 'function') {
		if (typeof player.setMuted === 'function') {
			player.setMuted(false);
		}
		player.play();
		return;
	}

	if (html5El) {
		html5El.muted = false;
		const playResult = html5El.play?.();
		if (playResult && typeof playResult.catch === 'function') {
			playResult.catch(() => {});
		}
	}
}
