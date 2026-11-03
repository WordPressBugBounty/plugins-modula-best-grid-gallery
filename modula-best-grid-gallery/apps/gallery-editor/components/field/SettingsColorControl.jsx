/**
 * A colour setting on admin-ui's ColorField. Every pick goes through
 * `normalizeColorForSave`, so the stored format stays what it was: rgba()
 * for settings that accept alpha, hex for the rest.
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ColorField } from 'admin-ui';
import { normalizeColorForSave } from '../../utils/cssColorValue';

/** The canvas's preset swatches (HE_PRESETS in the editor artboard). */
const SETTINGS_COLOR_PRESETS = [
	'#ffffff',
	'#f2f2ee',
	'#9a9a93',
	'#3a3a37',
	'#000000',
	'#1f1f1c',
	'#1d8a5b',
	'#e0a100',
	'#d9480f',
	'#c2255c',
];

/**
 * @param {Object}   props
 * @param {string}   props.id
 * @param {string}   props.label         Setting name; names the swatch button.
 * @param {*}        props.value         Stored CSS colour, or '' when cleared.
 * @param {Function} props.onChange      Receives the normalized colour, or ''.
 * @param {boolean}  [props.disabled]
 * @param {boolean}  [props.acceptAlpha] Offer opacity and store rgba().
 * @param {boolean}  [props.clearable]   Offer a button that stores ''.
 * @param {string}   [props.clearLabel]  That button's text; "Inherit" by default.
 */
export default function SettingsColorControl({
	id,
	label,
	value,
	onChange,
	disabled = false,
	acceptAlpha = false,
	clearable = false,
	clearLabel = __('Inherit', 'modula-best-grid-gallery'),
}) {
	const [open, setOpen] = useState(false);
	const stored = typeof value === 'string' ? value.trim() : '';

	return (
		<ColorField
			id={id}
			label={label}
			value={stored}
			open={open && !disabled}
			onOpenChange={setOpen}
			presets={SETTINGS_COLOR_PRESETS}
			opacity={acceptAlpha}
			clearLabel={clearable ? clearLabel : ''}
			disabled={disabled}
			onChange={(next) => {
				if (next === '') {
					onChange('');
					return;
				}
				const normalized = normalizeColorForSave(next, {
					acceptAlpha,
				});
				if (normalized) {
					onChange(normalized);
				}
			}}
		/>
	);
}
