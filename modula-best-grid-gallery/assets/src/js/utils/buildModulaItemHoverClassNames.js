/**
 * Gallery item outer classes: composable hover v2 (`hover_builder`) or legacy `effect-*`.
 *
 * @param {Record<string, unknown>} settings Block / gallery settings (flat).
 * @return {string} Space-separated classes (includes `modula-item`).
 */

/** Layouts that never use below-image captions (keep hover title/caption slots). */
const GALLERY_TYPES_WITHOUT_BELOW_IMAGE_CAPTIONS = [
	'story',
	'bnb',
	'parallax-masonry',
];

export function buildModulaItemHoverClassNames(settings) {
	const galleryType = String(settings?.type || '').trim();
	if (galleryType === 'story') {
		return 'modula-item';
	}
	const captionBelow =
		settings?.contentPlacement === 'below-image' &&
		!GALLERY_TYPES_WITHOUT_BELOW_IMAGE_CAPTIONS.includes(galleryType);
	const hb = settings?.hover_builder;
	if (hb && typeof hb === 'object') {
		const parts = [
			'modula-item',
			'modula-hover-v2',
			'modula-hover-v2--free-slots',
		];
		let card = typeof hb.cardTreatment === 'string' ? hb.cardTreatment : '';
		const dimRaw = hb.dimOverlay;
		let dimOn = dimRaw === true || dimRaw === 1 || dimRaw === '1';
		if (card === 'dim') {
			dimOn = true;
			card = 'none';
		}
		if (card && card !== 'none') {
			parts.push(`modula-hover-card--${card}`);
		}
		if (dimOn) {
			parts.push('modula-hover-card--dim-addon');
		}
		const slots = [
			['title', 'titleEnter', 'titleVisibility'],
			['caption', 'captionEnter', 'captionVisibility'],
			['social', 'socialEnter', 'socialVisibility'],
		];
		for (const [slot, enterKey, visibilityKey] of slots) {
			if (captionBelow && (slot === 'title' || slot === 'caption')) {
				continue;
			}
			const vis =
				typeof hb[visibilityKey] === 'string'
					? hb[visibilityKey]
					: 'on-hover';
			if (vis === 'on-hover') {
				parts.push(`modula-hover-visibility--${slot}--on-hover`);
			} else if (
				vis === 'always' ||
				vis === 'hide-on-hover' ||
				vis === 'hidden'
			) {
				parts.push(`modula-hover-visibility--${slot}--${vis}`);
			}
			const ent = typeof hb[enterKey] === 'string' ? hb[enterKey] : '';
			if (vis === 'on-hover' && ent && ent !== 'none') {
				parts.push(`modula-hover-enter--${slot}--${ent}`);
			}
			if (vis === 'hide-on-hover' && ent && ent !== 'none') {
				parts.push(`modula-hover-exit--${slot}--${ent}`);
			}
		}
		return parts.join(' ');
	}
	const effect =
		typeof settings?.effect === 'string' && settings.effect !== ''
			? settings.effect
			: 'none';
	if (effect !== 'none') {
		return `modula-item effect-${effect}`;
	}
	return 'modula-item';
}
