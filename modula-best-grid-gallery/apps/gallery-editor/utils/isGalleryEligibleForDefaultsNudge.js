/**
 * Whether the empty-state nudge for applying a saved default should show.
 *
 * @param {{
 *   galleryId?: number,
 *   postStatus?: string,
 *   itemCount?: number,
 *   hasPresets?: boolean,
 *   dismissed?: boolean,
 * }} params
 * @returns {boolean}
 */
export function isGalleryEligibleForDefaultsNudge({
	galleryId = 0,
	postStatus = '',
	itemCount = 0,
	hasPresets = false,
	dismissed = false,
}) {
	if (dismissed || !hasPresets || galleryId <= 0 || itemCount > 0) {
		return false;
	}
	const status = String(postStatus || '').toLowerCase();
	return status === 'auto-draft' || status === 'draft';
}

const NUDGE_DISMISS_KEY = 'modula_defaults_nudge_dismissed';

/**
 * @param {number} galleryId
 * @returns {boolean}
 */
export function isDefaultsNudgeDismissedForGallery(galleryId) {
	if (typeof window === 'undefined' || galleryId <= 0) {
		return false;
	}
	try {
		const raw = window.sessionStorage.getItem(NUDGE_DISMISS_KEY);
		if (!raw) {
			return false;
		}
		const ids = JSON.parse(raw);
		return Array.isArray(ids) && ids.includes(galleryId);
	} catch {
		return false;
	}
}

/**
 * @param {number} galleryId
 */
export function dismissDefaultsNudgeForGallery(galleryId) {
	if (typeof window === 'undefined' || galleryId <= 0) {
		return;
	}
	try {
		const raw = window.sessionStorage.getItem(NUDGE_DISMISS_KEY);
		const ids = raw ? JSON.parse(raw) : [];
		const next = Array.isArray(ids) ? [...ids, galleryId] : [galleryId];
		window.sessionStorage.setItem(NUDGE_DISMISS_KEY, JSON.stringify(next));
	} catch {
		// ignore
	}
}
