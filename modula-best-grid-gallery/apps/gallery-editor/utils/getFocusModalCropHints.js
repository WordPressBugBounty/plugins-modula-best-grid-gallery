import {
	resolveUniformGridTileAspect,
} from 'gallery-shared/preview';

/**
 * Derive react-easy-crop `aspect` hints from gallery settings (v2 grouped form values).
 * Only layouts with a single, well-defined cell aspect should suggest a lock.
 *
 * Custom grid (`custom-grid`) uses a per-image span (`width`×`height` in cells); see
 * `getCustomGridItemFocusAspect` + `FocusPointModal` (not grouped settings).
 *
 * @param {Object|null|undefined} groupedSettings - `general`, `layout`, etc.
 * @return {{
 *   suggestedAspect: number|null,
 *   canLockToLayout: boolean,
 *   layoutHint: string|null,
 *   showMatchLayoutToggle: boolean
 * }}
 */
export function getFocusModalCropHints(groupedSettings) {
	const none = {
		suggestedAspect: null,
		canLockToLayout: false,
		layoutHint: null,
		showMatchLayoutToggle: false,
	};

	if (!groupedSettings || typeof groupedSettings !== 'object') {
		return { ...none };
	}

	const type =
		groupedSettings.general?.type &&
		typeof groupedSettings.general.type === 'string'
			? groupedSettings.general.type
			: '';

	/**
	 * Uniform grid: cells share CSS `aspect-ratio` from `layout.uniformGridTileAspect`.
	 * Fixed cell height mode is URL-driven (`modula_uniform_mode=fixed`), not v2.
	 */
	if (type === 'uniform-grid') {
		const tile = resolveUniformGridTileAspect(
			groupedSettings.layout?.uniformGridTileAspect,
			groupedSettings.layout?.uniformGridTileAspectCustom
		);
		return {
			suggestedAspect: tile.ratio,
			canLockToLayout: true,
			layoutHint: tile.label,
			showMatchLayoutToggle: true,
		};
	}

	/**
	 * Story layout: editor preview strips use portrait tiles (9:16) to match the phone frame;
	 * focal crop should default to the same aspect as on the front.
	 */
	if (type === 'story') {
		return {
			suggestedAspect: 9 / 16,
			canLockToLayout: true,
			layoutHint: '9:16',
			showMatchLayoutToggle: true,
		};
	}

	return { ...none };
}

export const FOCUS_MATCH_LAYOUT_SESSION_KEY = 'modula-focus-match-layout';
