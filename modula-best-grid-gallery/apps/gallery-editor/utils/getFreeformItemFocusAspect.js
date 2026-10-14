import {
	freeformOccurrenceIds,
	resolveFreeformComposition,
} from 'gallery-shared/preview';
import { getCellSpanFocusAspect } from './getCellSpanFocusAspect';

/**
 * Freeform: focus aspect of one catalog item's tile, from the same resolved
 * composition the preview paints (so default-placed tiles match too).
 *
 * @param {Object}                  args
 * @param {Object[]}                args.items        Preview catalog in store order.
 * @param {number|null|undefined}   args.storeIndex   Catalog index of the item.
 * @param {Object[]|null|undefined} [args.placements] Saved `config.freeformPlacements`.
 * @return {{ ratio: number, label: string }|null} Null when the item is absent.
 */
export function getFreeformItemFocusAspect({ items, storeIndex, placements }) {
	if (!Number.isInteger(storeIndex) || !items[storeIndex]) {
		return null;
	}
	const composition = resolveFreeformComposition(
		freeformOccurrenceIds(items),
		placements,
		items
	);
	const { w, h } = composition[storeIndex];
	return getCellSpanFocusAspect(w, h);
}
