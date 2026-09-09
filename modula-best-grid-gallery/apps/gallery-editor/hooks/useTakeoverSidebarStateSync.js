import { useEffect } from '@wordpress/element';
import {
	parseHashFragment,
	replaceSettingsEditorHash,
	resolveEditorCategoryFromHash,
} from '../logic/settingsEditorHash';

/**
 * Keeps takeover sidebar active category in sync with URL hash.
 *
 * @param {{
 *   categories: Array<{name: string}>,
 *   activeCategory: string,
 *   setActiveCategory: (next: string) => void,
 * }} args
 */
export function useTakeoverSidebarStateSync({
	categories,
	activeCategory,
	setActiveCategory,
}) {
	useEffect(() => {
		replaceSettingsEditorHash(activeCategory);
	}, [activeCategory]);

	useEffect(() => {
		const onHashChange = () => {
			const names = categories.map((c) => c.name);
			const fragment = parseHashFragment();
			// Ignore non-`#!` hashes (deeplinks) and unknown fragments — do not
			// fall back to the first category and clobber the user's selection.
			const resolved = resolveEditorCategoryFromHash(fragment, names);
			if (resolved) {
				setActiveCategory(resolved);
			}
		};
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, [categories, setActiveCategory]);
}
