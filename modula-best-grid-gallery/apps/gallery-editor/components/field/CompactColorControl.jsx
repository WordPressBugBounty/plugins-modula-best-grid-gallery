/**
 * Compact color: swatch opens picker; hex/rgba field optional (default row) or inside popover (swatch row).
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import {
	Button,
	TextControl,
	Flex,
	FlexItem,
	ColorPicker,
	Dropdown,
} from '@wordpress/components';
import { normalizeColorForSave } from '../../utils/cssColorValue';

/** Above `.modula-gallery-modal` (z-index: 1_000_000); popover is portaled to `body`. */
const COLOR_DROPDOWN_POPOVER_Z_INDEX = 1_000_001;

/**
 * @param {'bottom-end'|'bottom-start'} placement
 */
function colorDropdownPopoverProps(placement) {
	return {
		placement,
		style: { zIndex: COLOR_DROPDOWN_POPOVER_Z_INDEX },
	};
}

/**
 * @param {unknown} value
 * @return {boolean}
 */
function isEmptyColor(value) {
	return typeof value !== 'string' || value.trim() === '';
}

/**
 * @param {Object}        props
 * @param {string}        props.value
 * @param {Function}      props.onChange
 * @param {boolean}       props.disabled
 * @param {boolean}       [props.enableAlpha]  When true, picker allows alpha and saves `rgba(...)`.
 * @param {boolean}       [props.clearable]    Empty value = cleared; chip shows clear label.
 * @param {string}        [props.clearLabel]   Clear button + empty chip label (default: Inherit).
 * @param {'default'|'swatch'} [props.variant]  swatch = chip (square + value), opens picker
 */
export default function CompactColorControl({
	value,
	onChange,
	disabled,
	enableAlpha = false,
	clearable = false,
	clearLabel,
	variant = 'default',
}) {
	const emptyLabel =
		typeof clearLabel === 'string' && clearLabel.trim()
			? clearLabel.trim()
			: __('Inherit', 'modula-best-grid-gallery');
	const empty = clearable && isEmptyColor(value);
	const color = empty
		? enableAlpha
			? 'rgba(0,0,0,1)'
			: '#000000'
		: typeof value === 'string' && value.trim() !== ''
			? value.trim()
			: enableAlpha
				? 'rgba(0,0,0,1)'
				: '#000000';
	const displayValue = empty
		? emptyLabel
		: enableAlpha
			? color
			: color.toUpperCase();
	const [draft, setDraft] = useState(empty ? '' : color);
	const [prevColor, setPrevColor] = useState(color);
	const [prevEmpty, setPrevEmpty] = useState(empty);
	if (color !== prevColor || empty !== prevEmpty) {
		setPrevColor(color);
		setPrevEmpty(empty);
		setDraft(empty ? '' : color);
	}

	const commitColor = (raw) => {
		const next = normalizeColorForSave(raw, { acceptAlpha: enableAlpha });
		if (next) {
			onChange(next);
		}
	};

	const clearToInherit = () => {
		onChange('');
	};

	const isSwatch = variant === 'swatch';
	const textLabel = enableAlpha
		? __('Color value', 'modula-best-grid-gallery')
		: __('Hex', 'modula-best-grid-gallery');

	const dropdownInner = (
		<div className="modula-settings-editor__color-dropdown-inner">
			<ColorPicker
				color={color}
				onChange={(c) => commitColor(c)}
				enableAlpha={enableAlpha}
			/>
			{isSwatch ? (
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					className="modula-settings-editor__color-dropdown-hex"
					value={draft}
					onChange={(v) => {
						setDraft(v);
						commitColor(v);
					}}
					onBlur={() => setDraft(empty ? '' : color)}
					disabled={disabled}
					label={textLabel}
					hideLabelFromVision
					autoComplete="off"
				/>
			) : null}
			{clearable ? (
				<Button
					variant="tertiary"
					className="modula-settings-editor__color-clear"
					onClick={clearToInherit}
					disabled={disabled || empty}
				>
					{emptyLabel}
				</Button>
			) : null}
		</div>
	);

	const swatchToggle = ({ isOpen, onToggle }) => (
		<Button
			variant="secondary"
			onClick={onToggle}
			aria-expanded={isOpen}
			aria-label={
				empty
					? sprintf(
							/* translators: %s: clear / inherit label. */
							__('Open color picker (%s)', 'modula-best-grid-gallery'),
							emptyLabel
						)
					: __('Open color picker', 'modula-best-grid-gallery')
			}
			disabled={disabled}
			className={`modula-settings-editor__color-swatch-btn${
				isSwatch
					? ' modula-settings-editor__color-swatch-btn--chip'
					: ''
			}${empty ? ' modula-settings-editor__color-swatch-btn--inherit' : ''}`}
		>
			<span
				className={`modula-settings-editor__color-swatch${
					empty
						? ' modula-settings-editor__color-swatch--inherit'
						: ''
				}`}
				style={empty ? undefined : { backgroundColor: color }}
				aria-hidden
			/>
			{isSwatch ? (
				<span
					className="modula-settings-editor__color-swatch-hex"
					aria-hidden
				>
					{displayValue}
				</span>
			) : null}
		</Button>
	);

	if (isSwatch) {
		return (
			<div className="modula-settings-editor__color-compact-wrap modula-settings-editor__color-compact-wrap--swatch">
				<Dropdown
					className="modula-settings-editor__color-dropdown-wrap"
					contentClassName="modula-settings-editor__color-dropdown"
					focusOnMount={false}
					popoverProps={colorDropdownPopoverProps('bottom-end')}
					renderToggle={swatchToggle}
					renderContent={() => dropdownInner}
				/>
			</div>
		);
	}

	return (
		<div className="modula-settings-editor__color-compact-wrap">
			<Flex
				gap={3}
				align="center"
				className="modula-settings-editor__color-compact"
			>
				<FlexItem>
					<Dropdown
						className="modula-settings-editor__color-dropdown-wrap"
						contentClassName="modula-settings-editor__color-dropdown"
						focusOnMount={false}
						popoverProps={colorDropdownPopoverProps('bottom-start')}
						renderToggle={swatchToggle}
						renderContent={() => dropdownInner}
					/>
				</FlexItem>
				<FlexItem isBlock>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						value={draft}
						onChange={(v) => {
							setDraft(v);
							commitColor(v);
						}}
						onBlur={() => setDraft(empty ? '' : color)}
						disabled={disabled}
						label={
							enableAlpha
								? __('Color value', 'modula-best-grid-gallery')
								: __(
										'Hex color value',
										'modula-best-grid-gallery'
									)
						}
						hideLabelFromVision
						autoComplete="off"
					/>
				</FlexItem>
			</Flex>
		</div>
	);
}
