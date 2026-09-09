import { useRef, useState } from '@wordpress/element';
import CompactColorControl from '../CompactColorControl';

const DEFAULT_BASE_COLOR = '#000000';

function clampChannel(n) {
	return Math.max(0, Math.min(255, Number.isFinite(n) ? n : 0));
}

function toHex2(n) {
	return clampChannel(n).toString(16).padStart(2, '0');
}

function rgbToHex(r, g, b) {
	return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

function extractBaseColorFromGradient(value) {
	const raw = typeof value === 'string' ? value.trim() : '';
	if (raw === '') {
		return DEFAULT_BASE_COLOR;
	}
	// 6-digit must come first: ordered alternation would otherwise match the
	// first 3 chars of a full hex (e.g. #cd3c3c -> #cd3 -> #ccdd33).
	const hex = raw.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
	if (hex && hex[0]) {
		const found = hex[0].toLowerCase();
		if (found.length === 4) {
			return `#${found[1]}${found[1]}${found[2]}${found[2]}${found[3]}${found[3]}`;
		}
		return found;
	}
	const rgb = raw.match(
		/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
	);
	if (rgb) {
		return rgbToHex(
			parseInt(rgb[1], 10),
			parseInt(rgb[2], 10),
			parseInt(rgb[3], 10)
		);
	}
	return DEFAULT_BASE_COLOR;
}

function buildParallaxOverlayGradient(baseHex) {
	const color = extractBaseColorFromGradient(baseHex);
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);

	return `linear-gradient(180deg, rgba(${r},${g},${b},0.88) 0%, rgba(${r},${g},${b},0.5) 40%, rgba(${r},${g},${b},0.15) 72%, rgba(${r},${g},${b},0) 100%)`;
}

/**
 * Parallax overlay control: user picks only the base color; angle + fade stops stay fixed.
 *
 * The stored value is a full gradient string. Driving the color picker directly from that
 * stored value makes it lag: each change round-trips hex -> gradient -> store -> (heavy
 * parallax preview re-render) -> gradient -> hex before returning. While the picker waits,
 * its controlled color stays a stale/echoed value, so react-colorful keeps resetting the
 * pointer to the lagging color mid-drag - the "jitter".
 *
 * Fix: keep a local `baseHex` as the picker's source of truth so it updates synchronously,
 * and only resync from the stored value on genuine external changes (undo/redo, reset, type
 * switch) - never from our own gradient echoing back.
 *
 * @param {Object}   props
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 */
function ParallaxOverlayColorControl({ value, onChange, disabled }) {
	const lastEmittedRef = useRef(null);
	const [baseHex, setBaseHex] = useState(() =>
		extractBaseColorFromGradient(value)
	);
	const [seenValue, setSeenValue] = useState(value);

	// Adjust state during render (React pattern) when the stored value changes.
	if (value !== seenValue) {
		setSeenValue(value);
		// Ignore the echo of the gradient we just emitted; only react to external edits.
		if (value !== lastEmittedRef.current) {
			setBaseHex(extractBaseColorFromGradient(value));
		}
	}

	return (
		<div
			className={`modula-settings-editor__color-picker modula-settings-editor__color-picker--swatch${
				disabled ? ' is-disabled' : ''
			}`}
			aria-disabled={disabled || undefined}
		>
			<CompactColorControl
				value={baseHex}
				onChange={(nextHex) => {
					setBaseHex(nextHex);
					const gradient = buildParallaxOverlayGradient(nextHex);
					lastEmittedRef.current = gradient;
					onChange(gradient);
				}}
				disabled={disabled}
				variant="swatch"
			/>
		</div>
	);
}

/**
 * @param {Object}   ctx
 * @param {*}        ctx.value
 * @param {Function} ctx.onChange
 * @param {boolean}  ctx.disabled
 */
export function renderParallaxOverlayColorKind({ value, onChange, disabled }) {
	return (
		<ParallaxOverlayColorControl
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}
