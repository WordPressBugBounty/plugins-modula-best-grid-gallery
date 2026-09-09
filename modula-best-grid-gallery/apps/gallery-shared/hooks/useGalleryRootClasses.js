/**
 * Apply loading-effect and accessibility root classes on the PHP gallery container.
 *
 * - inView ON: `modula-loaded-scale` is added by useGalleryInView when the gallery
 *   scrolls into the viewport (defer animation until then).
 * - inView OFF: `modula-loaded-effects` is added immediately so each tile animates
 *   as soon as its image finishes loading.
 * - respectReducedMotion ON (visitor frontend only): `modula-respect-reduced-motion`
 *   so CSS/JS can honor `prefers-reduced-motion` and drop gallery motion.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { isGalleryTypeWithoutLoadingEffects } from '../constants/galleryLayoutDefaults';
import { isSettingsEditorPreview } from '../utils/displayContext';
import { isRespectReducedMotionSettingOn } from '../utils/reducedMotion';

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {Object} config
 * @param {{ displayContext?: string }|null|undefined} [metadata]
 */
export function useGalleryRootClasses(hostRef, config, metadata) {
	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		const root =
			host.closest('.modula.modula-gallery') ||
			host.closest('.modula-gallery-modern');
		if (!root) {
			return undefined;
		}

		const applyClass =
			!isSettingsEditorPreview(metadata) &&
			isRespectReducedMotionSettingOn(config);
		if (applyClass) {
			root.classList.add('modula-respect-reduced-motion');
		} else {
			root.classList.remove('modula-respect-reduced-motion');
		}

		return () => {
			root.classList.remove('modula-respect-reduced-motion');
		};
	}, [hostRef, config?.respectReducedMotion, metadata?.displayContext]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		const root =
			host.closest('.modula.modula-gallery') ||
			host.closest('.modula-gallery-modern');
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
