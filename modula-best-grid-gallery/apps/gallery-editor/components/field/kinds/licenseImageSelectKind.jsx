/**
 * Settings-editor adapter: schema `licenseImageSelect` → admin-ui PresetTiles,
 * each license with its badge image.
 */
import { __ } from '@wordpress/i18n';
import { PresetTiles } from 'admin-ui';
import { resolveModulaPluginAssetUrl } from '../../../utils/resolveModulaPluginAssetUrl';
import { isNil } from '../../../logic/isNil';
import { ControlHelp, describedByHelp } from './ControlHelp';

/**
 * @param {Record<string, unknown>|undefined} optionImages
 * @param {string}                            key
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
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderLicenseImageSelectKind({
	control,
	controlId,
	label: settingLabel,
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
			...(imageUrl ? { preview: <img src={imageUrl} alt="" /> } : {}),
		};
	});

	const current = isNil(value) || value === '' ? 'none' : String(value);

	return (
		<>
			<PresetTiles
				id={controlId}
				className="modula-settings-editor__license-tiles"
				aria-label={
					settingLabel ||
					__('License type', 'modula-best-grid-gallery')
				}
				aria-describedby={describedByHelp(controlId, help)}
				columns={2}
				options={options}
				value={current}
				onChange={onChange}
				disabled={disabled}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}
