/**
 * Apply loading-effect and accessibility root classes on the PHP gallery container.
 *
 * - inView ON: `modula-loaded-scale` is added by useGalleryInView when the gallery
 *   scrolls into the viewport (defer animation until then).
 * - inView OFF: `modula-loaded-effects` is added immediately so each tile animates
 *   as soon as its image finishes loading.
 * - Visitor frontend (not the editor preview): `modula-respect-reduced-motion`
 *   so CSS/JS honor `prefers-reduced-motion` and drop all gallery motion,
 *   whatever the gallery's reduced-motion setting (utils/reducedMotion.js).
 * - Motion may not play here (useGalleryMotionAllowed, e.g. a phone with
 *   Animate on phones off): `modula-motion-held`, so hover moves and the
 *   loading effects hold still (_hover-v2.scss).
 * - themeInheritControls ON: `modula--theme-inherit-controls` so chrome CSS skips
 *   opinionated pagination/filter control paint.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { isGalleryTypeWithoutLoadingEffects } from '../constants/galleryLayoutDefaults';
import { isSettingsEditorPreview } from '../utils/displayContext';
import {
	THEME_INHERIT_CONTROLS_ROOT_CLASS,
	isThemeInheritControlsOn,
} from '../utils/themeInheritControls';

/** Visitor root: its motion follows `prefers-reduced-motion` (_hover-v2.scss, the lightbox). */
const REDUCED_MOTION_ROOT_CLASS = 'modula-respect-reduced-motion';

/** Root whose motion holds still here and now (_hover-v2.scss). */
const MOTION_HELD_ROOT_CLASS = 'modula-motion-held';

/**
 * @param {HTMLElement} host
 * @return {HTMLElement|null}
 */
function resolveGalleryRoot(host) {
	return (
		host.closest('.modula.modula-gallery') ||
		host.closest('.modula-gallery-modern')
	);
}

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {Object}                                      config
 * @param {{ displayContext?: string }|null|undefined}  [metadata]
 * @param {boolean}                                     motionAllowed The gallery's motion may play (useGalleryMotionAllowed).
 */
export function useGalleryRootClasses(
	hostRef,
	config,
	metadata,
	motionAllowed
) {
	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		const root = resolveGalleryRoot(host);
		if (!root) {
			return undefined;
		}

		if (isSettingsEditorPreview(metadata)) {
			root.classList.remove(REDUCED_MOTION_ROOT_CLASS);
		} else {
			root.classList.add(REDUCED_MOTION_ROOT_CLASS);
		}

		return () => {
			root.classList.remove(REDUCED_MOTION_ROOT_CLASS);
		};
	}, [hostRef, metadata?.displayContext]);

	useEffect(() => {
		const host = hostRef.current;
		const root = host ? resolveGalleryRoot(host) : null;
		if (!root || motionAllowed) {
			return undefined;
		}
		root.classList.add(MOTION_HELD_ROOT_CLASS);
		return () => {
			root.classList.remove(MOTION_HELD_ROOT_CLASS);
		};
	}, [hostRef, motionAllowed]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		const root = resolveGalleryRoot(host);
		if (!root) {
			return undefined;
		}

		if (isThemeInheritControlsOn(config?.themeInheritControls)) {
			root.classList.add(THEME_INHERIT_CONTROLS_ROOT_CLASS);
		} else {
			root.classList.remove(THEME_INHERIT_CONTROLS_ROOT_CLASS);
		}

		return () => {
			root.classList.remove(THEME_INHERIT_CONTROLS_ROOT_CLASS);
		};
	}, [hostRef, config?.themeInheritControls]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		const root = resolveGalleryRoot(host);
		if (!root) {
			return undefined;
		}

		if (isGalleryTypeWithoutLoadingEffects(config?.type)) {
			return undefined;
		}

		const loadedScale = Number(config?.loadedScale ?? 100);
		const loadedRotate = Number(config?.loadedRotate) || 0;
		const loadedHSlide = Number(config?.loadedHSlide) || 0;
		const loadedVSlide = Number(config?.loadedVSlide) || 0;
		const hasLoadedFx =
			loadedScale !== 100 ||
			loadedRotate !== 0 ||
			loadedHSlide !== 0 ||
			loadedVSlide !== 0;

		if (config?.inView || !hasLoadedFx) {
			return undefined;
		}

		root.classList.add('modula-loaded-effects');
		return () => {
			root.classList.remove('modula-loaded-effects');
		};
	}, [
		hostRef,
		config?.type,
		config?.inView,
		config?.loadedScale,
		config?.loadedRotate,
		config?.loadedHSlide,
		config?.loadedVSlide,
	]);
}
