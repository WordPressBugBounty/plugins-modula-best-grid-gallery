/**
 * Settings change payloads for the gallery editor history timeline popover.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	formatDefaultsFieldValue,
	getDefaultsFieldLabel,
} from './defaultsFieldDisplay';
import { listGroupedSettingsDiffs } from './describeSettingsChange';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';

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
 * @param {string}  groupId
 * @param {string}  key
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
