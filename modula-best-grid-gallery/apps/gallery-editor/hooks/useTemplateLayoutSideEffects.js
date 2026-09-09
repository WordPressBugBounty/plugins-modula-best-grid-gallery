/**
 * When gallery type is `template`, ensure layout content blocks exist as real
 * rows in the preview items list (same path as Add → content block).
 *
 * Must run where the preview Redux store exists (live preview controller),
 * not in the takeover shell — the shell mounts before the lazy preview store.
 *
 * @package
 */

import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { useEffect, useRef } from '@wordpress/element';
import { useQueryClient } from '@tanstack/react-query';
import {
	seedTemplateContentBlocksForLayout,
	templateLayoutNeedsReconcile,
} from '../logic/applyTemplateLayoutSideEffects';

/**
 * @param {{
 *   galleryId: number,
 *   store: import('@reduxjs/toolkit').Store|null|undefined,
 *   galleryType: string,
 *   templateLayout: string,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
 * }} args
 */
export function useTemplateLayoutSideEffects({
	galleryId,
	store,
	galleryType,
	templateLayout,
	runPersistTask,
}) {
	const queryClient = useQueryClient();
	const seedingRef = useRef(false);

	useEffect(() => {
		if (!store || !galleryId) {
			return undefined;
		}
		if (String(galleryType || '') !== 'template') {
			return undefined;
		}

		const slug = String(templateLayout || '').trim() || 'split-stack';

		const runSeedIfNeeded = () => {
			if (seedingRef.current) {
				return;
			}
			const core = asGalleryItemList(store.getState().items.items);
			if (!templateLayoutNeedsReconcile(core, slug)) {
				return;
			}

			seedingRef.current = true;
			void seedTemplateContentBlocksForLayout(
				store,
				galleryId,
				slug,
				runPersistTask,
				queryClient
			)
				.catch((err) => {
					// eslint-disable-next-line no-console
					console.error(
						'[modula] template content block seed failed',
						err
					);
				})
				.finally(() => {
					seedingRef.current = false;
				});
		};

		runSeedIfNeeded();
		/* Re-check after Redux updates (e.g. bootstrap hydrate wiped embedded rows). */
		const unsubscribe = store.subscribe(runSeedIfNeeded);

		return () => {
			unsubscribe();
		};
	}, [
		galleryId,
		store,
		galleryType,
		templateLayout,
		runPersistTask,
		queryClient,
	]);
}
