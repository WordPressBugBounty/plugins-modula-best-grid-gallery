/**
 * Human-readable labels/values for gallery defaults summaries (shared with Pro bundle via platform API).
 */
import { __ } from '@wordpress/i18n';
import { GROUP_LABELS } from '../constants/editorStructure';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';

/**
 * @param {string} groupId
 * @returns {string}
 */
export function getDefaultsGroupLabel(groupId) {
	return GROUP_LABELS[groupId] || groupId;
}

/**
 * @param {string} groupId
 * @param {string} key
 * @returns {string}
 */
export function getDefaultsFieldLabel(groupId, key) {
	const hit = getEnrichedFieldByGroupedPath(`${groupId}.${key}`);
	const field = hit?.field;
	if (!field) {
		return key;
	}
	if (
		typeof field.editorLabel === 'string' &&
		field.editorLabel.trim() !== ''
	) {
		return field.editorLabel.trim();
	}
	if (typeof field.label === 'string' && field.label.trim() !== '') {
		return field.label.trim();
	}
	return key;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringifyFallback(value) {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'boolean') {
		return value
			? __('On', 'modula-best-grid-gallery')
			: __('Off', 'modula-best-grid-gallery');
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => stringifyFallback(item)).join(', ');
	}
	if (typeof value === 'object') {
		const obj = /** @type {Record<string, unknown>} */ (value);
		if (typeof obj.width === 'number' && typeof obj.height === 'number') {
			return `${obj.width}×${obj.height}`;
		}
		try {
			return JSON.stringify(value);
		} catch {
			return '';
		}
	}
	return String(value);
}

/**
 * @param {object|undefined} field
 * @param {unknown} value
 * @returns {string|undefined}
 */
function labelFromOptionMap(field, value) {
	if (!field || (typeof value !== 'string' && typeof value !== 'number')) {
		return undefined;
	}
	const maps = [
		field.schema?.optionLabels,
		field.control?.optionLabels,
		field.control?.options,
	];
	for (const map of maps) {
		if (!map || typeof map !== 'object') {
			continue;
		}
		if (Array.isArray(map)) {
			const hit = map.find(
				(opt) =>
					opt &&
					typeof opt === 'object' &&
					String(opt.value) === String(value)
			);
			if (hit && typeof hit.label === 'string') {
				return hit.label;
			}
			continue;
		}
		const labeled = map[String(value)];
		if (typeof labeled === 'string' && labeled !== '') {
			return labeled;
		}
	}
	return undefined;
}

/**
 * @param {string} groupId
 * @param {string} key
 * @param {unknown} value
 * @returns {string}
 */
export function formatDefaultsFieldValue(groupId, key, value) {
	const hit = getEnrichedFieldByGroupedPath(`${groupId}.${key}`);
	const labeled = labelFromOptionMap(hit?.field, value);
	if (labeled) {
		return labeled;
	}
	return stringifyFallback(value);
}
