/**
 * Build <picture> sources from item data.
 * Uses itemData.pictureSources if present, otherwise a single source from srcset + inferred type.
 *
 * @param {Object} itemData     - Raw item data (src, thumbnail, url, srcset, pictureSources)
 * @param {Function} getMimeType - getMimeTypeFromUrl or equivalent
 * @return {{ type: string, srcset: string }[]}
 */
export function getPictureSources(itemData, getMimeType) {
	const explicit = itemData?.pictureSources;
	if (Array.isArray(explicit) && explicit.length > 0) {
		return explicit
			.map((s) => ({
				type: s.type || getMimeType(s.srcset),
				srcset: s.srcset || s.srcSet || '',
			}))
			.filter((s) => s.srcset);
	}
	const srcset = itemData?.srcset || '';
	const src = itemData?.src || itemData?.thumbnail || itemData?.url || '';
	if (srcset) {
		return [
			{
				type: getMimeType(src),
				srcset,
			},
		];
	}
	return [];
}
