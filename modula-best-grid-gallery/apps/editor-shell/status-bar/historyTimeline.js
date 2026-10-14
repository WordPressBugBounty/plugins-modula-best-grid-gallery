/**
 * History timeline presentation shared by the takeover status bar: relative
 * times and Just now / Earlier groups. Entries come from the owning editor.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { humanTimeDiff } from '@wordpress/date';

const JUST_NOW_MS = 2 * 60 * 1000;

/**
 * Relative time frozen against `nowMs` (no ticking).
 *
 * @param {number} committedAtMs
 * @param {number} nowMs
 * @return {string}
 */
export function formatHistoryRelativeTime(committedAtMs, nowMs) {
	if (
		!Number.isFinite(committedAtMs) ||
		!Number.isFinite(nowMs) ||
		committedAtMs > nowMs
	) {
		return '';
	}
	return humanTimeDiff(new Date(committedAtMs), new Date(nowMs));
}

/**
 * @param {number} ms
 * @return {string} Local HH:mm
 */
function formatClockHm(ms) {
	const d = new Date(ms);
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${hh}:${mm}`;
}

/**
 * @param {number} committedAtMs
 * @param {number} nowMs
 * @return {{ key: string, heading: string }}
 */
function groupMetaForCommittedAt(committedAtMs, nowMs) {
	const age = nowMs - committedAtMs;
	if (age < JUST_NOW_MS) {
		return {
			key: 'just-now',
			heading: __('Just now', 'modula-best-grid-gallery'),
		};
	}
	const clock = formatClockHm(committedAtMs);
	const minuteBucket = Math.floor(committedAtMs / 60_000);
	return {
		key: `earlier-${minuteBucket}`,
		heading: sprintf(
			/* translators: %s: local time HH:mm */
			__('Earlier · %s', 'modula-best-grid-gallery'),
			clock
		),
	};
}

/**
 * Timeline groups for the history popover (past → current → future by index).
 * Group headers still use JUST NOW / EARLIER · HH:mm from committedAt.
 *
 * @param {Array<{ index: number, committedAt?: number|null, [key: string]: unknown }>} entries
 * @param {number}                                                                      nowMs   Frozen clock at popover open.
 * @return {Array<{ key: string, heading: string, entries: typeof entries }>}
 */
export function groupHistoryTimelineEntries(entries, nowMs) {
	const list = Array.isArray(entries) ? [...entries] : [];
	list.sort((a, b) => a.index - b.index);

	/** @type {Array<{ key: string, heading: string, entries: typeof entries }>} */
	const groups = [];
	/** @type {Map<string, (typeof groups)[number]>} */
	const byKey = new Map();

	for (const entry of list) {
		const committedAt = Number.isFinite(entry.committedAt)
			? /** @type {number} */ (entry.committedAt)
			: nowMs;
		const meta = groupMetaForCommittedAt(committedAt, nowMs);
		let group = byKey.get(meta.key);
		if (!group) {
			group = { key: meta.key, heading: meta.heading, entries: [] };
			byKey.set(meta.key, group);
			groups.push(group);
		}
		group.entries.push(entry);
	}

	return groups;
}
