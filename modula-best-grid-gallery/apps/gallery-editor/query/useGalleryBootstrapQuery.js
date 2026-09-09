import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * Coerce post ID for React Query keys / REST paths so "1560" and 1560 share one cache.
 *
 * @param {unknown} galleryId
 * @return {number|unknown} Numeric ID when parseable, otherwise the original argument.
 */
export function normalizeGalleryPostId(galleryId) {
	if (galleryId === null || galleryId === undefined || galleryId === '') {
		return galleryId;
	}
	const n = Number(galleryId);
	return Number.isFinite(n) ? n : galleryId;
}

/**
 * @param {number} galleryId Gallery post ID.
 * @return {import('@tanstack/react-query').QueryKey} Stable bootstrap cache key for this gallery.
 */
export function getGalleryBootstrapQueryKey(galleryId) {
	const id = normalizeGalleryPostId(galleryId);
	return ['modula', 'gallery-bootstrap', id, 'settings_editor'];
}

/**
 * @param {number} galleryId Gallery post ID.
 * @return {Promise<Object>} Bootstrap payload (items, metadata, server settings snapshot).
 */
export function fetchGalleryBootstrapPayload(galleryId) {
	const id = normalizeGalleryPostId(galleryId);
	return apiFetch({
		path: `modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
	});
}

/**
 * Full gallery bootstrap (items + metadata + pagination/filtering + server settings snapshot).
 * Merge `{ ...data, settings: formValues }` for a reactive preview.
 *
 * @param {number} galleryId Gallery post ID.
 */
export function useGalleryBootstrapQuery(galleryId) {
	const id = normalizeGalleryPostId(galleryId);
	return useQuery({
		queryKey: getGalleryBootstrapQueryKey(id),
		enabled: Boolean(id),
		queryFn: () => fetchGalleryBootstrapPayload(id),
	});
}
