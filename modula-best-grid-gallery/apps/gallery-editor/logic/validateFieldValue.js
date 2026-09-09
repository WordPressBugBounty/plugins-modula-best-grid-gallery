/**
 * Client-side validation from nested schema (subset). Server remains authority.
 *
 * @param {Object} field Form schema field with .schema
 * @param {*}      value Current value
 * @return {{ valid: boolean, message?: string }} Validation result; message set when invalid.
 */
export function validateFieldValue(field, value) {
	if (
		field.control?.kind === 'actionButton' ||
		field.control?.kind === 'heading' ||
		field.control?.kind === 'speedupHelp' ||
		field.control?.kind === 'infoCallout' ||
		field.control?.kind === 'hoverEffectBuilder' ||
		field.control?.kind === 'exifResultPreview' ||
		field.control?.kind === 'deeplinkUrlPreview' ||
		field.control?.kind === 'galleryDefaultsShell' ||
		field.control?.kind === 'instagramAccount'
	) {
		return { valid: true };
	}
	const sch = field.schema;
	if (!sch || typeof sch !== 'object') {
		return { valid: true };
	}

	const type = sch.type;

	if (type === 'boolean') {
		const ok =
			typeof value === 'boolean' ||
			value === '0' ||
			value === '1' ||
			value === 0 ||
			value === 1 ||
			value === null ||
			value === undefined;
		if (!ok) {
			return { valid: false, message: 'Expected boolean.' };
		}
		return { valid: true };
	}

	if (type === 'integer') {
		const n =
			typeof value === 'string' ? parseInt(value, 10) : Number(value);
		if (!Number.isFinite(n)) {
			return { valid: false, message: 'Expected a number.' };
		}
		if (sch.minimum !== undefined && n < sch.minimum) {
			return { valid: false, message: `Must be ≥ ${sch.minimum}.` };
		}
		if (sch.maximum !== undefined && n > sch.maximum) {
			return { valid: false, message: `Must be ≤ ${sch.maximum}.` };
		}
		return { valid: true };
	}

	if (type === 'string') {
		if (value === null || value === undefined) {
			return { valid: true };
		}
		if (
			value === '' &&
			Array.isArray(sch.enum) &&
			sch.enum.includes('default')
		) {
			return { valid: true };
		}
		if (typeof value !== 'string') {
			return { valid: false, message: 'Expected text.' };
		}
		if (
			Array.isArray(sch.enum) &&
			sch.enum.length > 0 &&
			!sch.enum.includes(value)
		) {
			return { valid: false, message: 'Value not in allowed list.' };
		}
		return { valid: true };
	}

	if (type === 'array') {
		if (value === null || value === undefined) {
			return { valid: true };
		}
		if (!Array.isArray(value)) {
			return { valid: false, message: 'Expected list.' };
		}
		if (typeof sch.minItems === 'number' && value.length < sch.minItems) {
			return {
				valid: false,
				message: `At least ${sch.minItems} item(s).`,
			};
		}
		if (typeof sch.maxItems === 'number' && value.length > sch.maxItems) {
			return {
				valid: false,
				message: `At most ${sch.maxItems} item(s).`,
			};
		}
		return { valid: true };
	}

	if (type === 'object') {
		if (value === null || value === undefined || value === '') {
			return { valid: true };
		}
		if (typeof value !== 'object' || Array.isArray(value)) {
			return { valid: false, message: 'Expected object.' };
		}
		return { valid: true };
	}

	return { valid: true };
}
