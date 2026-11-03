import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

const MINUTE_MS = 60 * 1000;
// Twice a minute, so "N min ago" is never more than half a minute late.
const CLOCK_TICK_MS = 30 * 1000;

/**
 * Human label for the shared save state, as on the canvas: "All changes
 * saved" until the first save of the session, then the time since the last.
 *
 * @param {{ status: string, errorMessage?: string, savedAt?: number|null }} saveStatus
 * @param {number}                                                           nowMs      Clock the save time is measured against.
 * @return {string} Saved copy, Saving… / Unsaved changes, or the error message.
 */
export function getSaveStatusLabel(
	{ status, errorMessage = '', savedAt = null },
	nowMs
) {
	if (status === 'error' && errorMessage) {
		return errorMessage;
	}
	if (status === 'saving') {
		return __('Saving…', 'modula-best-grid-gallery');
	}
	if (status === 'unsaved') {
		return __('Unsaved changes', 'modula-best-grid-gallery');
	}
	if (!Number.isFinite(savedAt)) {
		return __('All changes saved', 'modula-best-grid-gallery');
	}
	const minutes = Math.floor(Math.max(0, nowMs - savedAt) / MINUTE_MS);
	if (minutes < 1) {
		return __('Saved just now', 'modula-best-grid-gallery');
	}
	return sprintf(
		/* translators: %d: minutes since the last save */
		_n(
			'Saved %d min ago',
			'Saved %d min ago',
			minutes,
			'modula-best-grid-gallery'
		),
		minutes
	);
}

/**
 * The save label, kept current while it shows a time since the last save.
 *
 * @param {{ status: string, errorMessage?: string, savedAt?: number|null }} saveStatus
 * @return {string} See getSaveStatusLabel.
 */
export function useSaveStatusLabel(saveStatus) {
	const [nowMs, setNowMs] = useState(() => Date.now());
	const showsSaveTime =
		saveStatus.status === 'saved' && Number.isFinite(saveStatus.savedAt);

	useEffect(() => {
		if (!showsSaveTime) {
			return undefined;
		}
		setNowMs(Date.now());
		const timer = window.setInterval(
			() => setNowMs(Date.now()),
			CLOCK_TICK_MS
		);
		return () => window.clearInterval(timer);
	}, [showsSaveTime, saveStatus.savedAt]);

	return getSaveStatusLabel(saveStatus, nowMs);
}
