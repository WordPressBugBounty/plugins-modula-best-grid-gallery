import { useEffect, useRef } from '@wordpress/element';

/**
 * Sync takeover auxiliary column from active category / nested stack frame.
 *
 * @param {{
 *   categories: Array<{name: string, auxiliaryPanel?: {kind: string} | null}>,
 *   activeCategory: string,
 *   stack: Array<{ auxiliaryPanel?: {kind: string} | null }>,
 *   auxiliary: { openedFrom?: string } | null | undefined,
 *   openFromCategory: (categoryName: string, descriptor: object) => void,
 *   closePanel: () => void,
 * }} args
 */
export function useTakeoverAuxiliarySync({
	categories,
	activeCategory,
	stack,
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
		const top = stack.length > 0 ? stack[stack.length - 1] : null;
		const stackAux =
			top &&
			top.auxiliaryPanel &&
			typeof top.auxiliaryPanel === 'object' &&
			typeof top.auxiliaryPanel.kind === 'string' &&
			top.auxiliaryPanel.kind !== ''
				? top.auxiliaryPanel
				: null;
		const catAux =
			stack.length === 0 &&
			cat?.auxiliaryPanel &&
			typeof cat.auxiliaryPanel === 'object' &&
			typeof cat.auxiliaryPanel.kind === 'string' &&
			cat.auxiliaryPanel.kind !== ''
				? cat.auxiliaryPanel
				: null;
		const desc = stackAux || catAux;
		if (desc) {
			openFromCategory(activeCategory, desc);
		} else if (auxiliaryRef.current?.openedFrom === 'category') {
			closePanel();
		}
	}, [categories, activeCategory, stack, openFromCategory, closePanel]);
}
