/**
 * The gallery's entrance (Motion → Entrance and Speed): each item plays it
 * once, as it enters view, while the gallery's motion may play
 * (useGalleryMotionAllowed: not under reduced motion, not on a phone with
 * Animate on phones off). The loading effects are the entrance's `custom`
 * choice and keep their CSS runtime (GalleryDynamicStyle).
 *
 * An item waits hidden (`data-modula-entrance="pending"`, styled in
 * apps/frontend-gallery/_gallery-shell.scss) until it enters view, so it
 * never shows before its entrance starts.
 *
 * In the settings-editor preview a new choice or speed plays at once on the
 * shown items, and the editor can ask for a replay or a peek
 * (`requestEntranceReplay`). The playback is `useTileEntrance`'s.
 *
 * @package
 */

import { useCallback } from '@wordpress/element';
import {
	galleryTypeOf,
	getMotionSpeedScale,
	resolveGalleryEntrance,
	resolveMotionChoice,
} from '../motion/motionRuntime';
import { isSettingsEditorPreview } from '../utils/displayContext';
import { useTileEntrance } from './useTileEntrance';

/** The gallery's tiles. */
const GALLERY_TILE_SELECTOR = '.modula-item';

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef  Gallery React host.
 * @param {Object}                                      settings Grouped settings.
 * @param {Object}                                      metadata
 * @param {boolean}                                     allowed  The gallery's motion may play (useGalleryMotionAllowed).
 */
export function useGalleryEntrance(hostRef, settings, metadata, allowed) {
	const galleryType = galleryTypeOf(settings);
	const resolveChoice = useCallback(
		(choice) => resolveMotionChoice('entrance', choice, galleryType),
		[galleryType]
	);

	useTileEntrance(hostRef, {
		presetId: resolveGalleryEntrance(settings),
		speedScale: getMotionSpeedScale(settings?.motion?.speed),
		allowed,
		preview: isSettingsEditorPreview(metadata),
		resolveChoice,
		tileSelector: GALLERY_TILE_SELECTOR,
	});
}
