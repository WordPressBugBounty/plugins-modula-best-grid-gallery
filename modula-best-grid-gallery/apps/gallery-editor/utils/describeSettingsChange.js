/**
 * Human-readable one-line description of a settings edit (status-bar history step).
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	formatDefaultsFieldValue,
	getDefaultsFieldLabel,
} from './defaultsFieldDisplay';

/**
 * @param {unknown} a
 * @param {unknown} b
 * @return {boolean}
 */
function valuesEqual(a, b) {
	if (Object.is(a, b)) {
		return true;
	}
	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return false;
	}
}

/**
 * @param {Record<string, Record<string, unknown>>|null|undefined} prev
 * @param {Record<string, Record<string, unknown>>|null|undefined} next
 * @return {{ groupId: string, key: string, from: unknown, to: unknown }[]}
 */
export function listGroupedSettingsDiffs(prev, next) {
	const before = prev && typeof prev === 'object' ? prev : {};
	const after = next && typeof next === 'object' ? next : {};
	const groupIds = new Set([...Object.keys(before), ...Object.keys(after)]);
	/** @type {{ groupId: string, key: string, from: unknown, to: unknown }[]} */
	const diffs = [];
	for (const groupId of groupIds) {
		const prevGroup =
			before[groupId] && typeof before[groupId] === 'object'
				? before[groupId]
				: {};
		const nextGroup =
			after[groupId] && typeof after[groupId] === 'object'
				? after[groupId]
				: {};
		const keys = new Set([
			...Object.keys(prevGroup),
			...Object.keys(nextGroup),
		]);
		for (const key of keys) {
			const from = prevGroup[key];
			const to = nextGroup[key];
			if (valuesEqual(from, to)) {
				continue;
			}
			diffs.push({ groupId, key, from, to });
		}
	}
	return diffs;
}

/**
 * @param {string} groupId
 * @param {string} key
 * @param {unknown} value
 * @return {string}
 */
function formatStepValue(groupId, key, value) {
	if (value === true || value === 1 || value === '1') {
		return __('on', 'modula-best-grid-gallery');
	}
	if (value === false || value === 0 || value === '0') {
		return __('off', 'modula-best-grid-gallery');
	}
	if (typeof value === 'string') {
		const lowered = value.toLowerCase().trim();
		if (lowered === 'true' || lowered === '1') {
			return __('on', 'modula-best-grid-gallery');
		}
		if (lowered === 'false' || lowered === '0') {
			return __('off', 'modula-best-grid-gallery');
		}
	}
	const formatted = formatDefaultsFieldValue(groupId, key, value);
	if (typeof formatted === 'string' && formatted.trim() !== '') {
		return formatted.trim();
	}
	if (value === null || value === undefined) {
		return __('empty', 'modula-best-grid-gallery');
	}
	return String(value);
}

/**
 * Styleguide history chip: `Preview on hover → off`.
 *
 * @param {Record<string, Record<string, unknown>>|null|undefined} prev
 * @param {Record<string, Record<string, unknown>>|null|undefined} next
 * @return {string}
 */
export function describeSettingsChange(prev, next) {
	const diffs = listGroupedSettingsDiffs(prev, next);
	if (diffs.length === 0) {
		return '';
	}
	if (diffs.length > 1) {
		return sprintf(
			/* translators: %d: number of settings changed in one undo step */
			__('%d settings changed', 'modula-best-grid-gallery'),
			diffs.length
		);
	}
	const { groupId, key, to } = diffs[0];
	const label = getDefaultsFieldLabel(groupId, key);
	const valueText = formatStepValue(groupId, key, to);
	return sprintf(
		/* translators: 1: setting label, 2: new value */
		__('%1$s → %2$s', 'modula-best-grid-gallery'),
		label,
		valueText
	);
}
