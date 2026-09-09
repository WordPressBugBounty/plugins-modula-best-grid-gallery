/**
 * Pagination lives under the Layout hub (nested sidebar drill), not a top-level category.
 *
 * @param {string} activeCategory Current takeover category id.
 * @param {{ groupedPaths?: string[] }[]} sidebarStack Nested sidebar frames.
 * @return {boolean} True when the Pagination nested panel is open.
 */
export function isPaginationSettingsPreviewActive(
	activeCategory,
	sidebarStack = []
) {
	if (activeCategory !== 'layout' || !Array.isArray(sidebarStack)) {
		return false;
	}

	const topFrame = sidebarStack[sidebarStack.length - 1];
	if (!topFrame || !Array.isArray(topFrame.groupedPaths)) {
		return false;
	}

	return topFrame.groupedPaths.some(
		(path) => typeof path === 'string' && path.startsWith('pagination.')
	);
}
