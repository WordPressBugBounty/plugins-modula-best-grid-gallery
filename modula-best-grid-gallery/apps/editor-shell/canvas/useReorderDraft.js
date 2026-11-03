/**
 * The Reorder dialog's draft over an editor's rows: the order the user
 * drags or moves with the arrows, until Save order. Each editor builds its
 * rows and saves the draft its own way.
 */
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import {
	dropReorderKey,
	moveReorderKey,
	reconcileReorderKeys,
} from './reorderDraft';

/**
 * @template {{ sortKey: string }} Row
 * @param {Row[]} rows The document's rows, in its order.
 * @return {{
 *   orderedRows: Row[],
 *   onDragEnd: (event: import('@dnd-kit/core').DragEndEvent) => void,
 *   moveOrderKey: (sortKey: string, offset: -1|1) => void,
 * }} The rows in draft order, and the two ways to change it.
 */
export function useReorderDraft(rows) {
	const [orderKeys, setOrderKeys] = useState(() =>
		rows.map((r) => r.sortKey)
	);

	useEffect(() => {
		const documentKeys = rows.map((r) => r.sortKey);
		setOrderKeys((draft) => reconcileReorderKeys(draft, documentKeys));
	}, [rows]);

	const orderedRows = useMemo(() => {
		const byKey = new Map(rows.map((r) => [r.sortKey, r]));
		return orderKeys.map((k) => byKey.get(k)).filter(Boolean);
	}, [orderKeys, rows]);

	const onDragEnd = useCallback(({ active, over }) => {
		if (!over) {
			return;
		}
		setOrderKeys((keys) =>
			dropReorderKey(keys, String(active.id), String(over.id))
		);
	}, []);

	const moveOrderKey = useCallback((sortKey, offset) => {
		setOrderKeys((keys) => moveReorderKey(keys, sortKey, offset));
	}, []);

	return { orderedRows, onDragEnd, moveOrderKey };
}
