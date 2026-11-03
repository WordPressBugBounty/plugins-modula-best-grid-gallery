import { useEffect, useRef } from '@wordpress/element';

/**
 * Sync the takeover auxiliary column with the active category: open the
 * category's own panel, and close a panel the settings opened (the hover
 * effect builder) when the tab changes.
 *
 * @param {{
 *   categories: Array<{name: string, auxiliaryPanel?: {kind: string} | null}>,
 *   activeCategory: string,
 *   auxiliary: { openedFrom?: string } | null | undefined,
 *   openFromCategory: (categoryName: string, descriptor: object) => void,
 *   closePanel: () => void,
 * }} args
 */
export function useTakeoverAuxiliarySync({
	categories,
	activeCategory,
	auxiliary,
	openFromCategory,
	closePanel,
}) {
	const auxiliaryRef = useRef(auxiliary);
	auxiliaryRef.current = auxiliary;

	useEffect(() => {
		if (auxiliaryRef.current?.openedFrom === 'chrome') {
			return;
		}
		const cat = categories.find((c) => c.name === activeCategory);
		const catAux =
			cat?.auxiliaryPanel &&
			typeof cat.auxiliaryPanel === 'object' &&
			typeof cat.auxiliaryPanel.kind === 'string' &&
			cat.auxiliaryPanel.kind !== ''
				? cat.auxiliaryPanel
				: null;
		if (catAux) {
			openFromCategory(activeCategory, catAux);
			return;
		}
		const openedFrom = auxiliaryRef.current?.openedFrom;
		if (openedFrom === 'category' || openedFrom === 'settings') {
			closePanel();
		}
	}, [categories, activeCategory, openFromCategory, closePanel]);
}
