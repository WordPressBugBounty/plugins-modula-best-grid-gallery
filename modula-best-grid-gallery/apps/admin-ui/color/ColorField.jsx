import { useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { PlusIcon } from '../icons/icons';
import { Range } from '../range/Range';
import { formatColor, normalizeHex, parseColor } from './color';

const FULL_HEX_DIGITS = /^[0-9a-f]{6}$/i;

/**
 * The value as the button shows it: "#1D8A5B", or "#000000 · 45%" when
 * translucent. A value that is not a hex or rgb() colour shows as stored.
 *
 * @param {import('./color').ColorParts|null} parts
 * @param {string}                            value
 * @return {string} Readout.
 */
function colorReadout(parts, value) {
	if ('' === value) {
		return __('None', 'modula-best-grid-gallery');
	}
	if (null === parts) {
		return value;
	}
	const hex = parts.hex.toUpperCase();

	return parts.alpha < 1 ? `${hex} · ${Math.round(parts.alpha * 100)}%` : hex;
}

/**
 * A colour setting: a swatch button that opens, under it, preset swatches,
 * a hex field, the browser's colour picker ("+ Custom") and an opacity
 * slider under a checkerboard-to-colour bar, its value on the caption line.
 * The value is the stored CSS colour (hex, or rgba() when translucent).
 *
 * The button is named from `label` and the current value; it exposes
 * `aria-expanded`. Escape in the open panel closes it and returns focus to
 * the button. The caller owns `open`, so it can keep one panel open at a
 * time. The panel opens in the flow under the button, as on the canvas, not
 * as a Popover.
 *
 * A setting stored as hex only passes `opacity={false}`, so it stays hex. A
 * setting whose empty value means "none" passes `clearLabel` for a button
 * that empties it. A value that is not a hex or rgb() colour (a gradient)
 * shows as stored and changes only when a colour is picked.
 *
 * @param {Object}   props
 * @param {string}   props.label          Setting name ("Dim color").
 * @param {string}   props.value          CSS colour, or empty for none.
 * @param {Function} props.onChange       Receives the CSS colour, or '' from Clear.
 * @param {boolean}  props.open
 * @param {Function} props.onOpenChange   Receives the next boolean.
 * @param {string[]} props.presets        Hex colours offered as swatches.
 * @param {boolean}  [props.opacity=true] Offer the opacity slider.
 * @param {string}   [props.clearLabel]   Text of a button that empties the value ("No color").
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.id]           Button id.
 * @param {string}   [props.className]
 */
export function ColorField({
	label,
	value,
	onChange,
	open,
	onOpenChange,
	presets,
	opacity = true,
	clearLabel = '',
	disabled = false,
	id,
	className = '',
}) {
	const generated = useId();
	const baseId = id || `modula-admin-color-${generated}`;
	const panelId = `${baseId}-panel`;
	const buttonRef = useRef(null);
	// What is typed in the hex field, until it is a whole colour.
	const [hexDraft, setHexDraft] = useState(null);
	const parts = parseColor(value);
	const hex = parts?.hex ?? '#000000';
	// Without the slider every pick is opaque, so the value stays hex.
	const alpha = opacity ? (parts?.alpha ?? 1) : 1;
	const alphaPercent = Math.round(alpha * 100);
	const readout = colorReadout(parts, value);

	const pick = (nextHex, nextAlpha = alpha) => {
		setHexDraft(null);
		onChange?.(formatColor({ hex: nextHex, alpha: nextAlpha }));
	};

	// Only a whole six-digit colour is applied, so "#1d8" on the way to
	// "#1d8a5b" does not flash a different colour.
	const onHexInput = (text) => {
		setHexDraft(text);
		const digits = text.trim().replace(/^#/, '');
		if (FULL_HEX_DIGITS.test(digits)) {
			onChange?.(formatColor({ hex: `#${digits}`, alpha }));
		}
	};

	const closeFromPanel = (event) => {
		if ('Escape' !== event.key) {
			return;
		}
		// Only this panel closes, not a dialog around it (as in Popover).
		event.preventDefault();
		event.stopPropagation();
		onOpenChange(false);
		buttonRef.current?.focus();
	};

	return (
		<div
			className={['modula-admin-color', open ? 'is-open' : '', className]
				.filter(Boolean)
				.join(' ')}
		>
			<button
				ref={buttonRef}
				id={baseId}
				type="button"
				className="modula-admin-color__button"
				aria-label={sprintf(
					/* translators: 1: setting name, 2: colour, e.g. #1D8A5B · 45%. */
					__('%1$s: %2$s. Change color', 'modula-best-grid-gallery'),
					label,
					readout
				)}
				aria-expanded={open}
				aria-controls={panelId}
				disabled={disabled}
				onClick={() => {
					setHexDraft(null);
					onOpenChange(!open);
				}}
			>
				<span
					className="modula-admin-color__swatch"
					style={{ '--modula-admin-color-value': value }}
					aria-hidden="true"
				/>
				{readout}
			</button>
			{/* Escape is a shortcut; every control inside keeps its own keys. */}
			{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
			<div
				id={panelId}
				className="modula-admin-color__panel"
				hidden={!open}
				onKeyDown={closeFromPanel}
			>
				<div
					className="modula-admin-color__presets"
					role="group"
					aria-label={__('Preset colors', 'modula-best-grid-gallery')}
				>
					{presets.map((preset) => (
						<button
							key={preset}
							type="button"
							className="modula-admin-color__preset"
							style={{ '--modula-admin-color-value': preset }}
							aria-label={sprintf(
								/* translators: %s: hex colour, e.g. #1D8A5B. */
								__('Use %s', 'modula-best-grid-gallery'),
								preset.toUpperCase()
							)}
							title={preset.toUpperCase()}
							aria-pressed={normalizeHex(preset) === hex}
							onClick={() => pick(normalizeHex(preset))}
						/>
					))}
				</div>
				<div className="modula-admin-color__inputs">
					<label
						className="modula-admin-color__caption"
						htmlFor={`${baseId}-hex`}
					>
						{__('Hex', 'modula-best-grid-gallery')}
					</label>
					<input
						id={`${baseId}-hex`}
						type="text"
						className="modula-admin-text-input modula-admin-color__hex"
						spellCheck="false"
						autoComplete="off"
						value={hexDraft ?? hex.toUpperCase()}
						onChange={(event) => onHexInput(event.target.value)}
						onBlur={() => setHexDraft(null)}
					/>
					<label
						className="modula-admin-color__custom"
						htmlFor={`${baseId}-custom`}
					>
						<PlusIcon />
						{__('Custom', 'modula-best-grid-gallery')}
						<input
							id={`${baseId}-custom`}
							type="color"
							aria-label={__(
								'Custom color',
								'modula-best-grid-gallery'
							)}
							value={hex}
							onChange={(event) => pick(event.target.value)}
						/>
					</label>
				</div>
				{opacity ? (
					<div className="modula-admin-color__opacity">
						{/* The slider announces the value; the line repeats it for sight. */}
						<span className="modula-admin-color__opacity-line">
							<label
								className="modula-admin-color__caption"
								htmlFor={`${baseId}-alpha`}
							>
								{__('Opacity', 'modula-best-grid-gallery')}
							</label>
							<span
								className="modula-admin-color__opacity-value"
								aria-hidden="true"
							>
								{`${alphaPercent}%`}
							</span>
						</span>
						<span
							className="modula-admin-color__alpha-bar"
							style={{ '--modula-admin-color-value': hex }}
							aria-hidden="true"
						/>
						<Range
							id={`${baseId}-alpha`}
							min={0}
							max={100}
							unit="%"
							value={alphaPercent}
							onChange={(percent) => pick(hex, percent / 100)}
						/>
					</div>
				) : null}
				{clearLabel ? (
					<Button
						variant="link"
						className="modula-admin-color__clear"
						disabled={'' === value}
						onClick={() => {
							setHexDraft(null);
							onChange?.('');
						}}
					>
						{clearLabel}
					</Button>
				) : null}
			</div>
		</div>
	);
}
