/**
 * Settings-editor adapter: schema `licenseImageSelect` → shared-ui ImageSelect.
 */
import { __ } from '@wordpress/i18n';
import { ImageSelect } from 'shared-ui';
import { resolveModulaPluginAssetUrl } from '../../../utils/resolveModulaPluginAssetUrl';
import { isNil } from '../../../logic/isNil';

/**
 * @param {Record<string, unknown>|undefined} optionImages
 * @param {string} key
 * @return {string}
 */
function thumbForOption(optionImages, key) {
	if (!optionImages || typeof optionImages !== 'object') {
		return '';
	}
	const raw = optionImages[key];
	if (typeof raw !== 'string' || raw.trim() === '') {
		return '';
	}
	return resolveModulaPluginAssetUrl(raw.trim());
}

/**
 * @param {Object}           ctx
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderLicenseImageSelectKind({
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels =
		control.optionLabels && typeof control.optionLabels === 'object'
			? control.optionLabels
			: {};
	const optionImages =
		control.optionImages && typeof control.optionImages === 'object'
			? control.optionImages
			: {};
	const rawOptions = Array.isArray(control.options) ? control.options : [];
	const options = rawOptions.map((opt) => {
		const key = String(opt);
		const label =
			typeof labels[key] === 'string' && labels[key].trim()
				? labels[key].trim()
				: key;
		const imageUrl = thumbForOption(optionImages, key);
		return {
			value: key,
			label,
			...(imageUrl ? { imageUrl } : {}),
		};
	});

	const current = isNil(value) || value === '' ? 'none' : String(value);

	return (
		<ImageSelect
			value={current}
			options={options}
			onChange={onChange}
			disabled={disabled}
			help={help}
			listLabel={__('Select license type', 'modula-best-grid-gallery')}
			placeholder={__('Select…', 'modula-best-grid-gallery')}
		/>
	);
}
