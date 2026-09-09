/**
 * Shared content block edit form state (preview modal + reorder modal).
 */
import {
	BLOCK_FONT_FAMILY_CSS,
	DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY,
	DEFAULT_BLOCK_BACKGROUND_POSITION,
	DEFAULT_BLOCK_BACKGROUND_REPEAT,
	DEFAULT_BLOCK_BACKGROUND_SIZE,
	DEFAULT_BLOCK_FONT_PRESET,
	DEFAULT_BLOCK_PADDING_PRESET,
	DEFAULT_CONTENT_BLOCK_BACKGROUND,
	contrastingForegroundForBackground,
	normalizeBlockBackgroundImageId,
	normalizeBlockBackgroundOverlayOpacity,
	normalizeBlockBackgroundPosition,
	normalizeBlockBackgroundRepeat,
	normalizeBlockBackgroundSize,
	solidContrastingForegroundForBackground,
} from 'gallery-shared/preview';
import {
	formatHexColor,
	formatRgbaColor,
	parseCssColor,
} from './cssColorValue';

/**
 * TinyMCE options for content-block body (paragraphs, lists, alignment).
 * Merged into WpClassicCaptionEditor defaults.
 */
export const CONTENT_BLOCK_BODY_TINYMCE_OPTIONS = Object.freeze({
	wpautop: true,
	forced_root_block: 'p',
	forced_br_newlines: false,
	force_p_newlines: true,
	toolbar1:
		'formatselect bold italic link bullist numlist blockquote alignleft aligncenter alignright',
});

/**
 * Compose CompactColorControl value from stored color + overlay opacity.
 * Always RGBA-capable; when a background image is set and the stored color is
 * opaque, picker alpha mirrors `blockBackgroundOverlayOpacity`.
 *
 * @param {string}  bgColor Hex / rgb / rgba (empty = transparent).
 * @param {number}  opacityPct
 * @param {boolean} hasImage
 * @return {string} Hex, rgba, or empty.
 */
export function composeContentBlockBgPickerValue(
	bgColor,
	opacityPct,
	hasImage
) {
	const raw = typeof bgColor === 'string' ? bgColor.trim() : '';
	if (!raw) {
		return '';
	}
	const parts = parseCssColor(raw);
	if (!parts) {
		return '';
	}
	if (parts.a < 1) {
		return formatRgbaColor(parts);
	}
	if (hasImage) {
		const a = Math.max(0, Math.min(100, Number(opacityPct) || 0)) / 100;
		return formatRgbaColor({ ...parts, a });
	}
	return formatHexColor(parts);
}

/**
 * Split picker onChange into persisted color + overlay opacity.
 * Empty / alpha 0 → transparent (`''`). Opaque → hex; translucent → rgba.
 *
 * @param {string}  raw
 * @param {Object}  opts
 * @param {boolean} opts.hasImage
 * @param {number}  [opts.previousOpacity]
 * @return {{ bg: string, blockBackgroundOverlayOpacity: number }}
 */
export function splitContentBlockBgPickerValue(
	raw,
	{ hasImage, previousOpacity } = {}
) {
	const value = typeof raw === 'string' ? raw.trim() : '';
	const fallbackOpacity = normalizeBlockBackgroundOverlayOpacity(
		previousOpacity ?? DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY
	);
	if (!value || value.toLowerCase() === 'transparent') {
		return {
			bg: '',
			blockBackgroundOverlayOpacity: fallbackOpacity,
		};
	}
	const parts = parseCssColor(value);
	if (!parts || parts.a === 0) {
		return {
			bg: '',
			blockBackgroundOverlayOpacity: fallbackOpacity,
		};
	}
	const bg = parts.a < 1 ? formatRgbaColor(parts) : formatHexColor(parts);
	return {
		bg,
		blockBackgroundOverlayOpacity: hasImage
			? Math.round(Math.max(0, Math.min(1, parts.a)) * 100)
			: fallbackOpacity,
	};
}

/**
 * @param {Object} row Bootstrap / Redux content_block row.
 * @return {Object} Initial editor state.
 */
export function createContentBlockEditInitialState(row) {
	const padRaw = String(row.blockPaddingPreset || '')
		.trim()
		.toLowerCase();
	const fontRaw = String(row.blockFontPreset || '')
		.trim()
		.toLowerCase();
	const rawBg =
		typeof row.blockBackgroundColor === 'string'
			? row.blockBackgroundColor.trim()
			: null;
	return {
		title: String(row.title || '').trim(),
		description: String(row.description || '').trim(),
		blockBodyHtml: String(row.blockBodyHtml || '<p></p>'),
		/* Explicit '' = transparent; missing/null → same default (transparent). */
		bg: rawBg === null ? DEFAULT_CONTENT_BLOCK_BACKGROUND : rawBg,
		fgHex:
			typeof row.blockTextColor === 'string'
				? row.blockTextColor.trim()
				: '',
		blockPaddingPreset: ['tight', 'default', 'medium', 'generous'].includes(
			padRaw
		)
			? padRaw
			: DEFAULT_BLOCK_PADDING_PRESET,
		blockFontPreset: Object.prototype.hasOwnProperty.call(
			BLOCK_FONT_FAMILY_CSS,
			fontRaw
		)
			? fontRaw
			: DEFAULT_BLOCK_FONT_PRESET,
		blockBackgroundImageId: normalizeBlockBackgroundImageId(
			row.blockBackgroundImageId
		),
		blockBackgroundImageUrl:
			typeof row.blockBackgroundImageUrl === 'string'
				? row.blockBackgroundImageUrl.trim()
				: '',
		blockBackgroundOverlayOpacity: normalizeBlockBackgroundOverlayOpacity(
			row.blockBackgroundOverlayOpacity ??
				DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY
		),
		blockBackgroundSize: normalizeBlockBackgroundSize(
			row.blockBackgroundSize ?? DEFAULT_BLOCK_BACKGROUND_SIZE
		),
		blockBackgroundPosition: normalizeBlockBackgroundPosition(
			row.blockBackgroundPosition ?? DEFAULT_BLOCK_BACKGROUND_POSITION
		),
		blockBackgroundRepeat: normalizeBlockBackgroundRepeat(
			row.blockBackgroundRepeat ?? DEFAULT_BLOCK_BACKGROUND_REPEAT
		),
	};
}

/**
 * @param {Object|null} row
 * @return {string} Stable DOM/editor id suffix for the row.
 */
export function contentBlockRowStableKey(row) {
	if (!row) {
		return 'none';
	}
	return String(row.embeddedId || row.id || 'new').replace(
		/[^a-zA-Z0-9_-]/g,
		'-'
	);
}

/**
 * @param {Object} state Content block form state.
 * @return {Object} Fields for saveMergedGalleryItems merge.
 */
export function contentBlockStateToSaveFields(state) {
	const fgOut =
		state.fgHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(state.fgHex)
			? state.fgHex
			: '';
	const imageId = normalizeBlockBackgroundImageId(
		state.blockBackgroundImageId
	);
	const bgRaw = typeof state.bg === 'string' ? state.bg.trim() : '';
	const bgParts = bgRaw ? parseCssColor(bgRaw) : null;
	let blockBackgroundColor = '';
	if (bgParts && bgParts.a > 0) {
		blockBackgroundColor =
			bgParts.a < 1 ? formatRgbaColor(bgParts) : formatHexColor(bgParts);
	}
	return {
		title: state.title.trim(),
		description: state.description.trim(),
		blockBodyHtml: state.blockBodyHtml,
		blockBackgroundColor,
		blockTextColor: fgOut,
		blockPaddingPreset: state.blockPaddingPreset,
		blockFontPreset: state.blockFontPreset,
		blockBackgroundImageId: imageId,
		/* Live preview only — stripped before POST via EMBEDDED_ROW_COMPUTED_SAVE_KEYS. */
		blockBackgroundImageUrl: imageId
			? typeof state.blockBackgroundImageUrl === 'string'
				? state.blockBackgroundImageUrl.trim()
				: ''
			: '',
		blockBackgroundOverlayOpacity: normalizeBlockBackgroundOverlayOpacity(
			state.blockBackgroundOverlayOpacity
		),
		blockBackgroundSize: normalizeBlockBackgroundSize(
			state.blockBackgroundSize
		),
		blockBackgroundPosition: normalizeBlockBackgroundPosition(
			state.blockBackgroundPosition
		),
		blockBackgroundRepeat: normalizeBlockBackgroundRepeat(
			state.blockBackgroundRepeat
		),
	};
}

/**
 * @param {Object} state
 * @return {string} Resolved text color for preview.
 */
export function resolveContentBlockTextColor(state) {
	if (state.fgHex) {
		return state.fgHex;
	}
	const hasImage =
		normalizeBlockBackgroundImageId(state.blockBackgroundImageId) > 0 ||
		(typeof state.blockBackgroundImageUrl === 'string' &&
			state.blockBackgroundImageUrl.trim() !== '');
	if (hasImage) {
		return solidContrastingForegroundForBackground(state.bg);
	}
	return contrastingForegroundForBackground(state.bg);
}
