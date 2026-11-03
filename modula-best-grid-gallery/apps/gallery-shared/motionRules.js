/**
 * Public Motion-rules surface for `gallery-shared`: what a stored
 * `motion.*` choice plays, shared by the gallery runtime and the editor's
 * Motion menus so both resolve a choice with one implementation, and the
 * options those menus list (the gallery editor's and the Pro Albums
 * editor's). Import from `gallery-shared/motionRules`; unlike the `preview`
 * barrel it loads no components, so editor unit tests can import it.
 *
 * @package
 */

export {
	MOTION_AUTO,
	MOTION_CUSTOM,
	getMotionRecommendation,
	getMotionSpeedScale,
	getPlayedHoverBuilder,
	resolveMotionChoice,
} from './motion/motionRuntime';
export {
	ALL_GALLERY_TYPES,
	createMotionCatalog,
	supportsGalleryType,
} from './motion/motionCatalog';
