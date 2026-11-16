/**
 * When gallery type is `template`, ensure layout content blocks exist as real
 * rows in the preview items list (same path as Add → content block). They are
 * unsaved changes until the editor save (ADR 0059).
 *
 * Must run where the preview Redux store exists (live preview controller),
 * not in the takeover shell — the shell mounts before the lazy preview store.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { seedTemplateContentBlocksForLayout } from '../logic/applyTemplateLayoutSideEffects';

/**
 * @param {{
 *   store: import('@reduxjs/toolkit').Store|null|undefined,
 *   galleryType: string,
 *   templateLayout: string,
 * }} args
 */
export function useTemplateLayoutSideEffects({
	store,
	galleryType,
	templateLayout,
}) {
	useEffect(() => {
		if (!store || String(galleryType || '') !== 'template') {
			return undefined;
		}

		const slug = String(templateLayout || '').trim() || 'split-stack';
		const runSeedIfNeeded = () =>
			seedTemplateContentBlocksForLayout(store, slug);

		runSeedIfNeeded();
		/* Re-check after Redux updates (e.g. an undo or a hydration removed a block). */
		return store.subscribe(runSeedIfNeeded);
	}, [store, galleryType, templateLayout]);
}
