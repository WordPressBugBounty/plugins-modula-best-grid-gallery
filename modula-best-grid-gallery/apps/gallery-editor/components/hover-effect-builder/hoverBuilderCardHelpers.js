/**
 * Hover builder card: moving the slot chips. The tile classes and vars the
 * card previews are gallery-shared's (`gallery-shared/hover/hoverTile`).
 */
import { SLOT_IDS } from 'gallery-shared/hover/hoverBuilderKeys';

/**
 * @param {Record<string, {x:number,y:number}>} currentPos
 * @param {'title'|'caption'|'social'}          slot
 * @param {{x:number,y:number}}                 next
 * @param {string[]}                            linkedOverlaySlots
 * @return {Record<string, {x:number,y:number}>}
 */
export function buildCommittedSlotPositions(
	currentPos,
	slot,
	next,
	linkedOverlaySlots
) {
	let nextPos = {
		...currentPos,
		[slot]: next,
	};
	const linkedSlots = Array.isArray(linkedOverlaySlots)
		? linkedOverlaySlots.filter((id) => SLOT_IDS.includes(id))
		: [];
	const shouldMoveLinked =
		linkedSlots.length > 1 &&
		linkedSlots.includes(slot) &&
		(slot === 'title' || slot === 'caption' || slot === 'social');
	if (!shouldMoveLinked) {
		return nextPos;
	}

	const from = currentPos[slot];
	const dx = next.x - from.x;
	const dy = next.y - from.y;
	/** @param {'title'|'caption'|'social'} slotId */
	const nextSlotPos = (slotId) => ({
		x: linkedSlots.includes(slotId)
			? Math.min(100, Math.max(0, Math.round(currentPos[slotId].x + dx)))
			: currentPos[slotId].x,
		y: linkedSlots.includes(slotId)
			? Math.min(100, Math.max(0, Math.round(currentPos[slotId].y + dy)))
			: currentPos[slotId].y,
	});

	nextPos = {
		...nextPos,
		title: nextSlotPos('title'),
		caption: nextSlotPos('caption'),
		social: nextSlotPos('social'),
	};
	return nextPos;
}
