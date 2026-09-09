/**
 * Gallery type select: schema.proEnhancements → control.optionGates;
 * schema.editorOptionGroups / control.optionGroups order the MenuSelect.
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {object|null|undefined} pe
 * @return {Record<string, { kind: 'requiresPro'|'requiresExtension', extensionSlug?: string }>|null}
 */
export function buildOptionGatesFromProEnhancements(pe) {
	if (!pe || typeof pe !== 'object') {
		return null;
	}
	/** @type {Record<string, { kind: 'requiresPro'|'requiresExtension', extensionSlug?: string }>} */
	const gates = {};
	for (const t of pe.base || []) {
		if (typeof t === 'string' && t !== '') {
			gates[t] = { kind: 'requiresPro' };
		}
	}
	for (const [extSlug, types] of Object.entries(pe.extensionBased || {})) {
		if (!Array.isArray(types) || typeof extSlug !== 'string') {
			continue;
		}
		for (const t of types) {
			if (typeof t === 'string' && t !== '') {
				gates[t] = {
					kind: 'requiresExtension',
					extensionSlug: extSlug,
				};
			}
		}
	}
	return Object.keys(gates).length ? gates : null;
}

/**
 * @param {unknown} raw
 * @return {{ id: string, label: string, values: string[] }[]}
 */
function normalizeOptionGroups(raw) {
	if (!Array.isArray(raw)) {
		return [];
	}
	const groups = [];
	raw.forEach((group, index) => {
		if (!group || typeof group !== 'object') {
			return;
		}
		const valuesSrc = Array.isArray(group.values)
			? group.values
			: Array.isArray(group.options)
				? group.options
				: [];
		const values = valuesSrc
			.map((entry) => {
				if (typeof entry === 'string' || typeof entry === 'number') {
					return String(entry);
				}
				if (entry && typeof entry === 'object' && 'value' in entry) {
					return String(entry.value ?? '');
				}
				return '';
			})
			.filter(Boolean);
		if (!values.length) {
			return;
		}
		groups.push({
			id:
				typeof group.id === 'string' && group.id.trim()
					? group.id.trim()
					: `group-${index}`,
			label: typeof group.label === 'string' ? group.label : '',
			values,
		});
	});
	return groups;
}

/**
 * @param {Object} field
 * @return {Object}
 */
export function patchGeneralGalleryTypeField(field) {
	if (field.groupedPath !== 'general.type') {
		return field;
	}
	const pe =
		field.schema && typeof field.schema === 'object'
			? field.schema.proEnhancements
			: null;
	const optionGates = buildOptionGatesFromProEnhancements(pe);

	const schemaOptions = Array.isArray(field.control?.options)
		? field.control.options.map(String).filter(Boolean)
		: [];

	let optionGroups = normalizeOptionGroups(
		field.control?.optionGroups ?? field.schema?.editorOptionGroups
	);

	/*
	 * Keep only values that exist on the schema enum; append any enum values
	 * missing from groups so new types always surface without a JS hardcode.
	 */
	const allowed = new Set(schemaOptions);
	if (allowed.size) {
		optionGroups = optionGroups
			.map((group) => ({
				...group,
				values: group.values.filter((value) => allowed.has(value)),
			}))
			.filter((group) => group.values.length > 0);
	}

	const orderedFromGroups = optionGroups.flatMap((group) => group.values);
	const known = new Set(orderedFromGroups);
	const extras = schemaOptions.filter((value) => !known.has(value));
	if (extras.length) {
		optionGroups = [
			...optionGroups,
			{
				id: 'other',
				label: __('Other', 'modula-best-grid-gallery'),
				values: extras,
			},
		];
	}

	return {
		...field,
		control: {
			...field.control,
			options: [...orderedFromGroups, ...extras],
			...(optionGroups.length ? { optionGroups } : {}),
			...(optionGates ? { optionGates } : {}),
		},
	};
}
