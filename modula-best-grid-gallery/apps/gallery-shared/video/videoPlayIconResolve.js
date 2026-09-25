/**
 * Classic Pro play-icon SVG path catalog (viewBox 0 0 24 24).
 * Mirrored from Modula_Video::get_available_icons() — same keys as video.videoIconIcon.
 *
 * @package
 */

export const VIDEO_PLAY_ICON_VIEWBOX = '0 0 24 24';

/** @type {Record<string, string>} */
export const VIDEO_PLAY_ICON_PRESET_PATHS = {
	default: "M 17.421875 11.15625 L 9.171875 6.140625 C 8.433594 5.726562 7.5 6.257812 7.5 7.125 L 7.5 16.875 C 7.5 17.738281 8.429688 18.273438 9.171875 17.859375 L 17.421875 13.125 C 18.191406 12.699219 18.191406 11.585938 17.421875 11.15625 Z M 23.625 12 C 23.625 5.578125 18.421875 0.375 12 0.375 C 5.578125 0.375 0.375 5.578125 0.375 12 C 0.375 18.421875 5.578125 23.625 12 23.625 C 18.421875 23.625 23.625 18.421875 23.625 12 Z M 2.625 12 C 2.625 6.820312 6.820312 2.625 12 2.625 C 17.179688 2.625 21.375 6.820312 21.375 12 C 21.375 17.179688 17.179688 21.375 12 21.375 C 6.820312 21.375 2.625 17.179688 2.625 12 Z M 2.625 12 ",
	play: "M23 12l-22 12v-24l22 12zm-21 10.315l18.912-10.315-18.912-10.315v20.63z",
	google_play_1: "M1.571 23.664l10.531-10.501 3.712 3.701-12.519 6.941c-.476.264-1.059.26-1.532-.011l-.192-.13zm9.469-11.56l-10.04 10.011v-20.022l10.04 10.011zm6.274-4.137l4.905 2.719c.482.268.781.77.781 1.314s-.299 1.046-.781 1.314l-5.039 2.793-4.015-4.003 4.149-4.137zm-15.854-7.534c.09-.087.191-.163.303-.227.473-.271 1.056-.275 1.532-.011l12.653 7.015-3.846 3.835-10.642-10.612z",
	google_play_2: "M24 0v24h-24v-24h24zm-18.62 19.776l7.022-7.001 2.474 2.468-8.346 4.627c-.317.176-.706.173-1.021-.007l-.129-.087zm6.314-7.707l-6.694 6.674v-13.348l6.694 6.674zm4.182-2.758l3.27 1.813c.322.179.521.513.521.876s-.199.697-.521.876l-3.36 1.862-2.676-2.669 2.766-2.758zm-10.57-5.022l.203-.152c.315-.18.704-.183 1.021-.007l8.436 4.677-2.564 2.556-7.096-7.074z",
	google_play_3: "M19 0c2.762 0 5 2.239 5 5v14c0 2.761-2.238 5-5 5h-14c-2.761 0-5-2.239-5-5v-14c0-2.761 2.239-5 5-5h14zm-13.698 19.776l7.022-7.001 2.474 2.468-8.346 4.627c-.317.176-.706.173-1.021-.007l-.129-.087zm6.313-7.707l-6.693 6.674v-13.348l6.693 6.674zm4.183-2.758l3.27 1.813c.322.179.521.513.521.876s-.199.697-.521.876l-3.36 1.862-2.676-2.669 2.766-2.758zm-10.57-5.022l.203-.152c.315-.18.704-.183 1.021-.007l8.436 4.677-2.564 2.556-7.096-7.074z",
	google_play_4: "M12 0c-6.626 0-12 5.372-12 12 0 6.627 5.374 12 12 12 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm-4.667 18.804l6.143-6.125 2.166 2.158-7.303 4.049c-.278.154-.618.152-.894-.006l-.112-.076zm5.524-6.743l-5.857 5.839v-11.679l5.857 5.84zm3.659-2.413l2.862 1.586c.281.156.455.449.455.766s-.174.61-.455.766l-2.94 1.63-2.342-2.335 2.42-2.413zm-9.248-4.395l.177-.133c.276-.158.616-.16.894-.006l7.381 4.092-2.244 2.237-6.208-6.19z",
	google_play_5: "M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-3.715 15.832l5.266-5.25 1.856 1.85-6.259 3.47c-.238.132-.53.13-.766-.005l-.097-.065zm4.735-5.78l-5.02 5.005v-10.01l5.02 5.005zm3.137-2.068l2.452 1.359c.242.134.391.385.391.657s-.149.523-.391.657l-2.519 1.397-2.008-2.002 2.075-2.068zm-7.927-3.767l.152-.114c.236-.135.528-.137.766-.005l6.326 3.507-1.923 1.917-5.321-5.305z",
	simple_solid: "M3 22v-20l18 10-18 10z",
	solid_circle_break: "M9 16.985v-10.021l9 5.157-9 4.864zm4-14.98c5.046.504 9 4.782 9 9.97 0 1.467-.324 2.856-.892 4.113l1.738 1.006c.732-1.555 1.154-3.285 1.154-5.119 0-6.303-4.842-11.464-11-11.975v2.005zm-10.109 14.082c-.568-1.257-.891-2.646-.891-4.112 0-5.188 3.954-9.466 9-9.97v-2.005c-6.158.511-11 5.672-11 11.975 0 1.833.421 3.563 1.153 5.118l1.738-1.006zm17.213 1.734c-1.817 2.523-4.769 4.175-8.104 4.175s-6.288-1.651-8.105-4.176l-1.746 1.011c2.167 3.122 5.768 5.169 9.851 5.169 4.082 0 7.683-2.047 9.851-5.168l-1.747-1.011z",
	solid_circle: "M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-3 17v-10l9 5.146-9 4.854z",
	solid_circle_fill: "M13 2.004c5.046.504 9 4.783 9 9.97 0 1.467-.324 2.856-.892 4.113l1.738 1.005c.732-1.553 1.154-3.284 1.154-5.117 0-6.304-4.842-11.464-11-11.975v2.004zm-10.109 14.083c-.568-1.257-.891-2.646-.891-4.112 0-5.188 3.954-9.466 9-9.97v-2.005c-6.158.511-11 5.671-11 11.975 0 1.833.421 3.563 1.153 5.118l1.738-1.006zm17.213 1.734c-1.817 2.523-4.769 4.174-8.104 4.174s-6.288-1.651-8.105-4.175l-1.746 1.01c2.167 3.123 5.768 5.17 9.851 5.17 4.082 0 7.683-2.047 9.851-5.168l-1.747-1.011zm-8.104-13.863c-4.419 0-8 3.589-8 8.017s3.581 8.017 8 8.017 8-3.589 8-8.017-3.581-8.017-8-8.017zm-2 11.023v-6.013l6 3.152-6 2.861z",
	simple_solid_reverse: "M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-3 17v-10l9 5.146-9 4.854z",
};

/**
 * SVG path for a Play icon preset key.
 *
 * @param {unknown} key
 * @return {string}
 */
export function resolveVideoPlayIconPresetPath(key) {
	const k = typeof key === 'string' ? key.trim() : '';
	if (k && VIDEO_PLAY_ICON_PRESET_PATHS[k]) {
		return VIDEO_PLAY_ICON_PRESET_PATHS[k];
	}
	return VIDEO_PLAY_ICON_PRESET_PATHS.default;
}

/**
 * True when an authored custom image URL or attachment id is present.
 *
 * @param {Object|null|undefined} videoSettings
 * @return {boolean}
 */
function hasCustomPlayIconSource(videoSettings) {
	if (!videoSettings) {
		return false;
	}
	if (
		typeof videoSettings.customVideoIconUrl === 'string' &&
		videoSettings.customVideoIconUrl.trim() !== ''
	) {
		return true;
	}
	const raw = videoSettings.customVideoIcon;
	if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
		return true;
	}
	const id = parseInt(raw, 10);
	return Number.isFinite(id) && id > 0;
}

/**
 * Resolve custom play-icon URL from config.video.
 * Uses Image file / enriched URL when present — does not require useCustomIcon.
 *
 * @param {Object|null|undefined} videoSettings
 * @return {string}
 */
export function resolveVideoPlayIconCustomSrc(videoSettings) {
	if (!hasCustomPlayIconSource(videoSettings)) {
		return '';
	}
	if (
		typeof videoSettings.customVideoIconUrl === 'string' &&
		videoSettings.customVideoIconUrl.trim() !== ''
	) {
		return videoSettings.customVideoIconUrl.trim();
	}
	const raw = videoSettings.customVideoIcon;
	if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
		return raw.trim();
	}
	return '';
}

/**
 * Attachment ID for custom play icon when an Image file is set.
 *
 * @param {Object|null|undefined} videoSettings
 * @return {number}
 */
export function resolveVideoPlayIconAttachmentId(videoSettings) {
	if (!hasCustomPlayIconSource(videoSettings)) {
		return 0;
	}
	const id = parseInt(videoSettings.customVideoIcon, 10);
	return Number.isFinite(id) && id > 0 ? id : 0;
}
