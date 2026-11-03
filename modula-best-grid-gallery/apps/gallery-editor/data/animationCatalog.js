/**
 * Animation catalog (`npm run generate:settings-schemas` / `build:gallery-editor`):
 * hover builder primitives, entrance motions, built-in presets and the curated
 * Motion menus. Source: includes/v2/motion/data/animation-catalog.php, which
 * PHP reads too; the gallery runtime plays the entrances from its own
 * projection (gallery-shared/motion/modula-motion-runtime.json). The menu
 * reads are gallery-shared's (`createMotionCatalog`), shared with the Pro
 * Albums editor.
 */
import { createMotionCatalog } from 'gallery-shared/motionRules';
import catalog from '../generated/modula-animation-catalog';

/*
 * What a stored Motion choice plays (the recommendation per gallery type,
 * `auto` and `custom`) is the gallery runtime's one rule, as
 * `Motion_Settings::resolve()` in PHP.
 */
export {
	ALL_GALLERY_TYPES,
	MOTION_AUTO,
	MOTION_CUSTOM,
	getMotionRecommendation,
	resolveMotionChoice,
	supportsGalleryType,
} from 'gallery-shared/motionRules';

/**
 * @typedef {Object} AnimationPrimitive
 * @property {string}         id              Stored id (a `hover.builder` value, or an entrance preset's motion).
 * @property {string}         label           Builder menu label.
 * @property {string[]}       triggers        When it plays: `hover`, or `in-view` for an entrance motion.
 * @property {boolean}        scalesWithSpeed Its timing follows the Motion speed.
 * @property {'all'|string[]} galleryTypes    Gallery types it supports.
 * @property {boolean}        pro             Needs Compatible Pro.
 */

/**
 * @typedef {import('gallery-shared/motion/motionCatalog').AnimationPreset} AnimationPreset
 */

/** The gallery's catalog, read by the Motion menus. */
export const galleryMotionCatalog = createMotionCatalog(catalog);

export const {
	getAnimationPresets,
	getMotionMenu,
	getMotionChoiceLabel,
	isMotionMenuHiddenForType,
} = galleryMotionCatalog;

/**
 * @param {'card'|'graphic'|'layer'|'entrance'} kind
 * @return {AnimationPrimitive[]} The kind's primitives in menu order; empty for an unknown kind.
 */
export function getAnimationPrimitives(kind) {
	return catalog.primitives[kind]?.items ?? [];
}
