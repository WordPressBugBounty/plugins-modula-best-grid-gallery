/**
 * New from preset menu model for the New gallery editor choice.
 *
 * Lite only reads `galleryPresets` and `defaultGalleryPresetId` from the listing
 * bootstrap; Pro Defaults fills them through `modula_gallery_listing_config`.
 */

/**
 * `classicEditor` is false when the preset layout is one the classic editor
 * can't show (e.g. Freeform); rows without the flag (older Pro) keep true.
 *
 * @typedef {{ id: number, title: string, summary: string, isDefault: boolean, classicEditor: boolean }} CreatePreset
 * @typedef {{ presets: CreatePreset[], defaultPreset: CreatePreset | null }} CreatePresetOptions
 */

/**
 * wp_localize_script() stringifies top-level scalars, so IDs may arrive as
 * numeric strings.
 *
 * @param {unknown} value Candidate ID.
 * @return {number} Positive integer ID, or 0.
 */
function toPresetId(value) {
	if (Number.isInteger(value)) {
		return value > 0 ? value : 0;
	}
	if ('string' === typeof value && /^\d+$/.test(value)) {
		return Number(value);
	}
	return 0;
}

/**
 * @param {unknown} row       Raw preset row.
 * @param {number}  defaultId Default preset ID (0 for none).
 * @return {CreatePreset | null} Normalized preset, or null when malformed.
 */
function toCreatePreset(row, defaultId) {
	if (!row || 'object' !== typeof row) {
		return null;
	}
	const id = toPresetId(row.id);
	const title = 'string' === typeof row.title ? row.title : '';
	if (!id || !title) {
		return null;
	}
	return {
		id,
		title,
		summary: 'string' === typeof row.summary ? row.summary : '',
		isDefault: id === defaultId,
		classicEditor: false !== row.classicEditor,
	};
}

/**
 * @param {CreatePreset[]} presets Normalized presets.
 * @return {CreatePresetOptions | null} Menu model, or null when no preset is offered.
 */
function toPresetOptions(presets) {
	if (!presets.length) {
		return null;
	}
	return {
		presets,
		defaultPreset: presets.find((preset) => preset.isDefault) ?? null,
	};
}

/**
 * @param {{ galleryPresets?: unknown, defaultGalleryPresetId?: unknown }} config Listing bootstrap.
 * @return {CreatePresetOptions | null} Menu model, or null when no preset is offered.
 */
export function getCreatePresetOptions(config) {
	const rows = Array.isArray(config?.galleryPresets)
		? config.galleryPresets
		: [];
	const defaultId = toPresetId(config?.defaultGalleryPresetId);
	return toPresetOptions(
		rows.map((row) => toCreatePreset(row, defaultId)).filter(Boolean)
	);
}

/**
 * The classic editor's New from preset list leaves out presets it would open
 * without their layout; they stay in the new editor's list.
 *
 * @param {CreatePresetOptions | null} options New editor menu model.
 * @return {CreatePresetOptions | null} Classic menu model, or null when no preset is left.
 */
export function getClassicPresetOptions(options) {
	if (!options) {
		return null;
	}
	return toPresetOptions(
		options.presets.filter((preset) => preset.classicEditor)
	);
}
