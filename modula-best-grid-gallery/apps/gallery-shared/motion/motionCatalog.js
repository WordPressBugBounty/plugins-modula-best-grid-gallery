/**
 * The Motion tab's Entrance and Hover menus, read from the animation catalog
 * (generated from includes/v2/motion/data/animation-catalog.php). The
 * gallery editor and the Pro Albums editor each import their generated copy
 * and bind it here, so both menus list their options with one rule; each
 * editor brings its own recommendation and plan locks.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { MOTION_AUTO, MOTION_CUSTOM } from './motionRuntime';

/** Gallery types value meaning "every gallery type". */
export const ALL_GALLERY_TYPES = 'all';

/**
 * @typedef {Object} AnimationPreset
 * @property {string}             id           Stored id (`sourcePresetId`, `motion.*`).
 * @property {'hover'|'entrance'} kind         Which Motion menu it belongs to.
 * @property {string}             label        Builder menu label.
 * @property {string}             description  One-line summary.
 * @property {'all'|string[]}     galleryTypes Gallery types it supports.
 * @property {boolean}            pro          Locked in Lite.
 * @property {Object}             composition  Hover: what applying it writes, `builder` (`hover.builder`) and `hover` (overlay colour and opacity). Entrance: `entrance`, the entrance motion it plays; empty for None.
 */

/**
 * @typedef {Object} MotionChoiceOption
 * @property {string}  value         Stored `motion.{kind}`.
 * @property {string}  label         Menu label.
 * @property {string}  [description] Line under the label (the recommendation's).
 * @property {boolean} disabled      Locked by the plan, or Custom, which the menu never chooses.
 * @property {boolean} pro           Show the PRO pill.
 */

/**
 * @typedef {Object} MotionChoiceContext
 * @property {string}                               value       Stored choice.
 * @property {string}                               recommended The preset `auto` plays for the layout.
 * @property {string}                               galleryType Layout type the presets must support (`general.type`, or an album type of the same name).
 * @property {(preset: AnimationPreset) => boolean} [isLocked]  The plan locks the preset.
 */

/**
 * @param {Object|undefined} entry       Catalog preset or primitive.
 * @param {string}           galleryType `general.type`.
 * @return {boolean} The entry supports the gallery type.
 */
export function supportsGalleryType(entry, galleryType) {
	const types = entry?.galleryTypes;
	return (
		types === ALL_GALLERY_TYPES ||
		(Array.isArray(types) && types.includes(galleryType))
	);
}

/**
 * The Motion menus' reads of one generated catalog.
 *
 * @param {Object} catalog Generated `modula-animation-catalog.js` default export.
 */
export function createMotionCatalog(catalog) {
	/**
	 * @param {'hover'|'entrance'} kind
	 * @return {AnimationPreset[]} Presets in catalog order.
	 */
	const getAnimationPresets = (kind) =>
		catalog.presets.filter((preset) => preset.kind === kind);

	/**
	 * The curated Motion menu: entries whose preset exists today, in menu
	 * order. Entries a later ticket still adds (`pending`) are left out.
	 *
	 * @param {'hover'|'entrance'} kind
	 * @return {{ id: string, label: string }[]} Menu entries with their short labels.
	 */
	const getMotionMenu = (kind) =>
		(catalog.menus[kind]?.items ?? [])
			.filter((item) => item.pending === undefined)
			.map(({ id, label }) => ({ id, label }));

	/**
	 * A Motion choice's name: its short menu label (planned entries
	 * included, so a recommendation can be named before its preset lands),
	 * else the preset's own label for a preset the menu leaves out.
	 *
	 * @param {'hover'|'entrance'} kind
	 * @param {string}             id   Preset id.
	 * @return {string} Label; empty for an unknown id.
	 */
	const getMotionChoiceLabel = (kind, id) => {
		const item = (catalog.menus[kind]?.items ?? []).find(
			(entry) => entry.id === id
		);
		if (item) {
			return item.label;
		}
		return (
			getAnimationPresets(kind).find((preset) => preset.id === id)
				?.label ?? ''
		);
	};

	/**
	 * @param {'hover'|'entrance'} kind
	 * @param {string}             galleryType `general.type`.
	 * @return {boolean} The Motion menu for this kind is hidden for the gallery type.
	 */
	const isMotionMenuHiddenForType = (kind, galleryType) =>
		(catalog.menus[kind]?.hiddenForTypes ?? []).includes(galleryType);

	/**
	 * @param {string} presetId Entrance preset id, as a choice resolves.
	 * @return {boolean} The preset animates (None and `custom` have nothing to replay).
	 */
	const entranceAnimates = (presetId) =>
		Boolean(
			getAnimationPresets('entrance').find(
				(preset) => preset.id === presetId
			)?.composition?.entrance
		);

	/**
	 * The menu for `motion.{kind}`:
	 * - "<Name> (recommended)" (`auto`) first;
	 * - the curated menu's presets for the layout type, without the entry
	 *   it recommends; the stored choice is always listed (an explicit
	 *   choice of the recommended entry stays when the layout changes);
	 * - a stored preset the menu leaves out, so no stored value is lost;
	 * - Custom while it is the choice.
	 *
	 * @param {'hover'|'entrance'}  kind
	 * @param {MotionChoiceContext} context
	 * @return {MotionChoiceOption[]} Options in menu order.
	 */
	const getMotionChoiceOptions = (
		kind,
		{ value, recommended, galleryType, isLocked = () => false }
	) => {
		const presets = new Map(
			getAnimationPresets(kind).map((preset) => [preset.id, preset])
		);
		const lockedPreset = (id) =>
			presets.has(id) && isLocked(presets.get(id));
		const menuIds = getMotionMenu(kind).map((item) => item.id);
		const listedIds = menuIds.filter(
			(id) =>
				id === value ||
				(id !== recommended &&
					supportsGalleryType(presets.get(id), galleryType))
		);
		if (presets.has(value) && !menuIds.includes(value)) {
			listedIds.push(value);
		}

		const recommendedLocked = lockedPreset(recommended);
		const options = [
			{
				value: MOTION_AUTO,
				label: sprintf(
					/* translators: %s: name of the animation recommended for the gallery type. */
					__('%s (recommended)', 'modula-best-grid-gallery'),
					getMotionChoiceLabel(kind, recommended)
				),
				description: __(
					'Picked for this layout, changes if you switch layouts',
					'modula-best-grid-gallery'
				),
				disabled: recommendedLocked,
				pro: recommendedLocked,
			},
			...listedIds.map((id) => {
				const locked = lockedPreset(id);
				return {
					value: id,
					label: getMotionChoiceLabel(kind, id),
					disabled: locked,
					pro: locked,
				};
			}),
		];
		if (value === MOTION_CUSTOM) {
			options.push({
				value: MOTION_CUSTOM,
				label: __('Custom', 'modula-best-grid-gallery'),
				disabled: true,
				pro: false,
			});
		}
		return options;
	};

	return {
		getAnimationPresets,
		getMotionMenu,
		getMotionChoiceLabel,
		isMotionMenuHiddenForType,
		entranceAnimates,
		getMotionChoiceOptions,
	};
}
