import { __ } from '@wordpress/i18n';

/**
 * @param {Record<string, string>|undefined|null} optionLabels
 * @param {unknown} opt
 */
export function getSelectOptionLabel(optionLabels, opt) {
	const key = String(opt);
	if (
		optionLabels &&
		typeof optionLabels === 'object' &&
		typeof optionLabels[key] === 'string' &&
		optionLabels[key] !== ''
	) {
		return optionLabels[key];
	}
	return key;
}

/**
 * @param {unknown} raw
 * @returns {Record<string, string>|null}
 */
export function normalizeOptionImages(raw) {
	if (raw && typeof raw === 'object') {
		return /** @type {Record<string, string>} */ (raw);
	}
	return null;
}

/** @param {{ fieldApi: { state: { meta: { isTouched?: boolean; errors?: string[] } } } } } props */
export function FieldValidationError({ fieldApi }) {
	const meta = fieldApi.state.meta;
	if (!meta.isTouched || !meta.errors?.length) {
		return null;
	}
	return (
		<p
			className="modula-gallery-takeover__aux-form-field-error"
			role="alert"
		>
			{meta.errors[0]}
		</p>
	);
}

/**
 * @param {string} label
 * @param {string} groupedPath
 */
export function UnsupportedAuxiliaryFallback({ label, groupedPath }) {
	return (
		<div
			className="modula-gallery-takeover__aux-form-field modula-gallery-takeover__aux-form-field--error"
			role="region"
			aria-label={label}
		>
			<p className="modula-gallery-takeover__aux-form-field-error">
				{__(
					'This control type is not available in the side panel. Use the sidebar.',
					'modula-best-grid-gallery'
				)}
			</p>
			<p className="modula-gallery-takeover__aux-form-field-fallback">
				<a href={`#modula-field-${groupedPath}`}>
					{__(
						'Jump to this field in the sidebar',
						'modula-best-grid-gallery'
					)}
				</a>
			</p>
		</div>
	);
}
