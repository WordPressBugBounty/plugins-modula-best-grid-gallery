/**
 * The per-device switch of a responsive setting (Desktop / Tablet / Mobile)
 * as admin-ui's icon Segmented. The chosen device is the caller's local
 * state: it picks which value is edited and never follows the preview
 * device (spec "Kept as today").
 */
import { __ } from '@wordpress/i18n';
import { DesktopIcon, PhoneIcon, Segmented, TabletIcon } from 'admin-ui';

/** The devices a responsive setting stores, in stored order. */
export const DEVICE_KEYS = ['desktop', 'tablet', 'mobile'];

const DEVICES = {
	desktop: {
		icon: <DesktopIcon />,
		label: __('Desktop', 'modula-best-grid-gallery'),
	},
	tablet: {
		icon: <TabletIcon />,
		label: __('Tablet', 'modula-best-grid-gallery'),
	},
	mobile: {
		icon: <PhoneIcon />,
		label: __('Mobile', 'modula-best-grid-gallery'),
	},
};

/**
 * @param {string} key
 * @return {Object|null} The known device, or null.
 */
function knownDevice(key) {
	const normalized = String(key).toLowerCase();

	return Object.prototype.hasOwnProperty.call(DEVICES, normalized)
		? DEVICES[normalized]
		: null;
}

/**
 * @param {string} key
 * @return {string} Device name; an unknown key shows as given.
 */
export function deviceLabel(key) {
	return knownDevice(key)?.label ?? String(key);
}

/**
 * @param {Object}                                 props
 * @param {Array<{ value: string, label: string }>} props.devices  Device keys and names; a key without an icon shows its name.
 * @param {string}                                 props.value
 * @param {Function}                               props.onChange Receives the device key.
 * @param {string}                                 props.label    Group name ("Gutter").
 * @param {boolean}                                [props.disabled]
 */
export default function DeviceSwitch({
	devices,
	value,
	onChange,
	label,
	disabled = false,
}) {
	const options = devices.map((device) => {
		const icon = knownDevice(device.value)?.icon;
		return {
			value: device.value,
			label: device.label,
			...(icon ? { icon } : {}),
		};
	});

	return (
		<Segmented
			className="modula-settings-editor__device-switch"
			aria-label={label}
			options={options}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}
