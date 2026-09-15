/**
 * Dual-class aliases for Justified Grid Gallery–era item chrome hooks.
 *
 * Why we keep emitting `jtg-*`: years of customer (and Compatible Pro Defaults)
 * CSS target `.jtg-title` / `.jtg-description` / `.jtg-social`. Renaming those
 * nodes to `modula-*` alone silently broke Customizer/theme rules. We keep the
 * legacy class on the same nodes alongside the current `modula-*` names so
 * shallow selectors keep matching. See docs/adr/0029-jtg-legacy-css-aliases.md.
 *
 * Does not restore nested wrappers (e.g. `.jtg-body`) or gallery root ids —
 * only title / caption / social class hooks on the existing nodes.
 */

/** Overlay / below-image title node. */
export const ITEM_TITLE_CLASS_NAME = 'modula-title jtg-title';

/**
 * Caption node. `jtg-description` stays primary (product CSS + customer CSS);
 * `modula-description` is the forward-looking twin.
 */
export const ITEM_DESCRIPTION_CLASS_NAME = 'jtg-description modula-description';

/** Inline social row inside figc / below-caption. */
export const ITEM_SOCIAL_CLASS_NAME = 'modula-social jtg-social';

/**
 * @param {string} [extra] Additional classes (e.g. BEM modifiers).
 * @return {string}
 */
export function buildItemTitleClassName(extra = '') {
	return [ITEM_TITLE_CLASS_NAME, extra].filter(Boolean).join(' ');
}

/**
 * @param {string} [extra]
 * @return {string}
 */
export function buildItemDescriptionClassName(extra = '') {
	return [ITEM_DESCRIPTION_CLASS_NAME, extra].filter(Boolean).join(' ');
}

/**
 * @param {string} [extra]
 * @return {string}
 */
export function buildItemSocialClassName(extra = '') {
	return [ITEM_SOCIAL_CLASS_NAME, extra].filter(Boolean).join(' ');
}
