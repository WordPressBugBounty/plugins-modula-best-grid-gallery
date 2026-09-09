import { __ } from '@wordpress/i18n';
import { isNil } from '../../../logic/isNil';

const WATERMARK_CELLS = [
	'top_left',
	'top_center',
	'top_right',
	'middle_left',
	'center',
	'middle_right',
	'bottom_left',
	'bottom_center',
	'bottom_right',
];

/**
 * 3×3 slots around a gallery: edge singles + dual top/bottom and left/right.
 *
 * @type {Array<{ value: string|null, placeholder?: boolean, dual?: 'vertical'|'horizontal' }>}
 */
const EDGE_SLOTS = [
	{ value: 'top_bottom', dual: 'vertical' },
	{ value: 'top' },
	{ value: 'left_right', dual: 'horizontal' },
	{ value: 'left' },
	{ value: null, placeholder: true },
	{ value: 'right' },
	{ value: null },
	{ value: 'bottom' },
	{ value: null },
];

/**
 * @param {string[]} options
 * @return {boolean}
 */
function isWatermarkOptions(options) {
	return options.some((key) => WATERMARK_CELLS.includes(key));
}

/**
 * 3×3 position matrix for watermark / overlay / filter-bar placement.
 *
 * @param {Object}           ctx
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderPositionGridKind({
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels = control.optionLabels || {};
	const options = Array.isArray(control.options)
		? control.options.map(String)
		: WATERMARK_CELLS;
	const watermarkLayout = isWatermarkOptions(options);
	const slots = watermarkLayout
		? WATERMARK_CELLS.map((key) => ({ value: key }))
		: EDGE_SLOTS;
	const available = new Set(options);
	const fallback = watermarkLayout
		? String(options[0] ?? 'bottom_left')
		: String(options[0] ?? 'top');
	const current = isNil(value) || value === '' ? fallback : String(value);
	const groupLabel =
		typeof control.ariaLabel === 'string' && control.ariaLabel.trim() !== ''
			? control.ariaLabel.trim()
			: watermarkLayout
				? __('Watermark position', 'modula-best-grid-gallery')
				: __('Where the bar sits', 'modula-best-grid-gallery');

	return (
		<div className="modula-settings-editor__position-grid">
			<div
				className={`modula-settings-editor__position-grid-matrix${
					watermarkLayout ? '' : ' is-edges'
				}`}
				role="radiogroup"
				aria-label={groupLabel}
			>
				{slots.map((slot, index) => {
					if (slot.placeholder) {
						return (
							<span
								key={`ph-${index}`}
								className="modula-settings-editor__position-grid-cell is-placeholder"
								aria-hidden="true"
							/>
						);
					}
					if (!slot.value) {
						return (
							<span
								key={`empty-${index}`}
								className="modula-settings-editor__position-grid-cell is-empty"
								aria-hidden="true"
							/>
						);
					}
					const key = slot.value;
					const isAvailable = available.has(key);
					const active = isAvailable && current === key;
					const rawLabel = labels[key] || key;
					const dualClass =
						slot.dual === 'vertical'
							? ' is-dual is-dual-vertical'
							: slot.dual === 'horizontal'
								? ' is-dual is-dual-horizontal'
								: '';
					return (
						<button
							key={key}
							type="button"
							role="radio"
							aria-checked={active}
							aria-label={rawLabel}
							disabled={disabled || !isAvailable}
							className={`modula-settings-editor__position-grid-cell${
								active ? ' is-active' : ''
							}${!isAvailable ? ' is-unavailable' : ''}${dualClass}`}
							onClick={() => {
								if (!disabled && isAvailable) {
									onChange(key);
								}
							}}
						/>
					);
				})}
			</div>
			{help ? (
				<p className="modula-settings-editor__field-help">{help}</p>
			) : null}
		</div>
	);
}
