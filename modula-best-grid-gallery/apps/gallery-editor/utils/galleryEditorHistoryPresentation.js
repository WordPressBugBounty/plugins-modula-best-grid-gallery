/**
 * Presentation helpers for the gallery editor history timeline popover.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { humanTimeDiff } from '@wordpress/date';
import {
	formatDefaultsFieldValue,
	getDefaultsFieldLabel,
} from './defaultsFieldDisplay';
import { listGroupedSettingsDiffs } from './describeSettingsChange';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';

const JUST_NOW_MS = 2 * 60 * 1000;

/**
 * @param {string} groupId
 * @param {string} key
 * @return {boolean}
 */
function isColorSchemaKind(groupId, key) {
	const hit = getEnrichedFieldByGroupedPath(`${groupId}.${key}`);
	const kind = hit?.field?.control?.kind;
	return kind === 'color' || kind === 'parallaxOverlayColor';
}

/**
 * @param {string} groupId
 * @param {string} key
 * @param {unknown} value
 * @return {{ kind: 'color', color: string } | { kind: 'text', text: string }}
 */
function presentValue(groupId, key, value) {
	if (isColorSchemaKind(groupId, key)) {
		const color =
			typeof value === 'string' && value.trim() !== ''
				? value.trim()
				: String(value ?? '');
		return { kind: 'color', color };
	}
	const formatted = formatDefaultsFieldValue(groupId, key, value);
	const text =
		typeof formatted === 'string' && formatted.trim() !== ''
			? formatted.trim()
			: value === null || value === undefined
				? __('empty', 'modula-best-grid-gallery')
				: String(value);
	return { kind: 'text', text };
}

/**
 * Rich settings change payload for a history timeline row.
 *
 * @param {Record<string, Record<string, unknown>>|null|undefined} prev
 * @param {Record<string, Record<string, unknown>>|null|undefined} next
 * @return {{
 *   mode: 'single',
 *   fieldLabel: string,
 *   from: { kind: 'color', color: string } | { kind: 'text', text: string },
 *   to: { kind: 'color', color: string } | { kind: 'text', text: string },
 * } | { mode: 'multi', count: number } | null}
 */
export function buildSettingsHistoryChange(prev, next) {
	const diffs = listGroupedSettingsDiffs(prev, next);
	if (diffs.length === 0) {
		return null;
	}
	if (diffs.length > 1) {
		return { mode: 'multi', count: diffs.length };
	}
	const { groupId, key, from, to } = diffs[0];
	return {
		mode: 'single',
		fieldLabel: getDefaultsFieldLabel(groupId, key),
		from: presentValue(groupId, key, from),
		to: presentValue(groupId, key, to),
	};
}

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
 * @param {number} nowMs Frozen clock at popover open.
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
