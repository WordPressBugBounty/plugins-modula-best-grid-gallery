/**
 * Overflow policy for v2 content_block tile content shells.
 *
 * Horizontal scrollbars on poster typography are a UX bug; clip X and allow Y
 * only when copy genuinely exceeds the slot.
 *
 * @package
 */

/**
 * @return {{ overflowX: 'hidden', overflowY: 'auto' }}
 */
export function resolveContentBlockTileOverflow() {
	return {
		overflowX: 'hidden',
		overflowY: 'auto',
	};
}
