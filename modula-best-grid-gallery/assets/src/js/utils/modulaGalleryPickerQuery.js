/**
 * REST query used by the Gutenberg gallery picker preload.
 *
 * WordPress REST `per_page` max is 100; -1 is rejected.
 *
 * @return {{ post_status: string, per_page: number }} Query for getEntityRecords.
 */
export function getModulaGalleryPickerQuery() {
	return {
		post_status: 'publish',
		per_page: 100,
	};
}
