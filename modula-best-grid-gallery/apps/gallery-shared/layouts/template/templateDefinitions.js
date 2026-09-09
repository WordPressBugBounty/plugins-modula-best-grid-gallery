/**
 * Handcrafted template gallery presets — slot maps, tiers, and content-block seeds.
 *
 * @package
 */

import { DEFAULT_CONTENT_BLOCK_BACKGROUND } from '../../utils/contentBlockContrast';

/** @typedef {'lite'|'pro'} TemplateTier */
/** @typedef {'image'|'content'} TemplateSlotRole */

/**
 * @typedef {Object} TemplateSlotDef
 * @property {string} id
 * @property {TemplateSlotRole} role
 * @property {number|null} [imageOrder] Index among image rows (0-based).
 * @property {string} [embeddedId] Fixed id for content_block rows.
 * @property {{ title?: string, description?: string, blockBodyHtml?: string, blockFontPreset?: string, blockPaddingPreset?: string, blockBackgroundColor?: string }} [seed]
 */

/**
 * @typedef {Object} TemplateDefinition
 * @property {string} slug
 * @property {string} label
 * @property {TemplateTier} tier
 * @property {number} imageSlotCount
 * @property {TemplateSlotDef[]} slots
 */

/** @type {Record<string, TemplateDefinition>} */
export const TEMPLATE_DEFINITIONS = {
	'split-stack': {
		slug: 'split-stack',
		label: 'Split Stack',
		tier: 'lite',
		imageSlotCount: 3,
		slots: [
			{ id: 'leftTop', role: 'image', imageOrder: 0 },
			{ id: 'leftBottom', role: 'image', imageOrder: 1 },
			{ id: 'rightHero', role: 'image', imageOrder: 2 },
		],
	},
	'asymmetric-trio': {
		slug: 'asymmetric-trio',
		label: 'Asymmetric Trio',
		tier: 'lite',
		imageSlotCount: 3,
		slots: [
			{ id: 'leftPortrait', role: 'image', imageOrder: 0 },
			{ id: 'rightTop', role: 'image', imageOrder: 1 },
			{ id: 'rightBottom', role: 'image', imageOrder: 2 },
		],
	},
	'offset-duo': {
		slug: 'offset-duo',
		label: 'Offset Duo',
		tier: 'lite',
		imageSlotCount: 3,
		slots: [
			{ id: 'banner', role: 'image', imageOrder: 0 },
			{ id: 'leftTall', role: 'image', imageOrder: 1 },
			{ id: 'rightSmall', role: 'image', imageOrder: 2 },
		],
	},
	'minimal-feature': {
		slug: 'minimal-feature',
		label: 'Minimal Feature',
		tier: 'lite',
		imageSlotCount: 3,
		slots: [
			{ id: 'hero', role: 'image', imageOrder: 0 },
			{ id: 'supportLeft', role: 'image', imageOrder: 1 },
			{ id: 'supportRight', role: 'image', imageOrder: 2 },
		],
	},
	'editorial-hero': {
		slug: 'editorial-hero',
		label: 'Editorial Hero',
		tier: 'pro',
		imageSlotCount: 4,
		slots: [
			{ id: 'topLeft', role: 'image', imageOrder: 0 },
			{ id: 'topRight', role: 'image', imageOrder: 1 },
			{ id: 'bottomLeft', role: 'image', imageOrder: 2 },
			{ id: 'bottomRight', role: 'image', imageOrder: 3 },
			{
				id: 'center',
				role: 'content',
				embeddedId: 'template-editorial-hero-center',
				seed: {
					title: 'We Craft Brands With Purpose',
					description: '',
					blockBodyHtml:
						"<p>Thoughtful design for brands that want to stand out with clarity and intention.</p><p><a href='#' class='modula-template-cta'>Explore our services</a></p>",
					blockFontPreset: 'serif',
					blockPaddingPreset: 'generous',
					blockBackgroundColor: DEFAULT_CONTENT_BLOCK_BACKGROUND,
				},
			},
		],
	},
	'magazine-spread': {
		slug: 'magazine-spread',
		label: 'Magazine Spread',
		tier: 'pro',
		imageSlotCount: 3,
		slots: [
			{ id: 'leftLarge', role: 'image', imageOrder: 0 },
			{ id: 'centerTall', role: 'image', imageOrder: 1 },
			{ id: 'rightSmall', role: 'image', imageOrder: 2 },
			{
				id: 'headline',
				role: 'content',
				embeddedId: 'template-magazine-spread-headline',
				seed: {
					title: 'Sugar, dessert & everything sweet',
					description: '',
					blockBodyHtml: '',
					blockFontPreset: 'display',
					blockPaddingPreset: 'tight',
					blockBackgroundColor: DEFAULT_CONTENT_BLOCK_BACKGROUND,
				},
			},
			{
				id: 'body',
				role: 'content',
				embeddedId: 'template-magazine-spread-body',
				seed: {
					title: '',
					description: '',
					blockBodyHtml:
						'<p>From intimate gatherings to grand celebrations, we create desserts that feel as special as the moment itself.</p>',
					blockFontPreset: 'default',
					blockPaddingPreset: 'tight',
					blockBackgroundColor: DEFAULT_CONTENT_BLOCK_BACKGROUND,
				},
			},
		],
	},
	'lookbook-ladder': {
		slug: 'lookbook-ladder',
		label: 'Lookbook Ladder',
		tier: 'pro',
		imageSlotCount: 5,
		slots: [
			{ id: 'step0', role: 'image', imageOrder: 0 },
			{ id: 'step1', role: 'image', imageOrder: 1 },
			{ id: 'step2', role: 'image', imageOrder: 2 },
			{ id: 'step3', role: 'image', imageOrder: 3 },
			{ id: 'step4', role: 'image', imageOrder: 4 },
		],
	},
	'corner-collage': {
		slug: 'corner-collage',
		label: 'Corner Collage',
		tier: 'pro',
		imageSlotCount: 5,
		slots: [
			{ id: 'topLeft', role: 'image', imageOrder: 0 },
			{ id: 'topRight', role: 'image', imageOrder: 1 },
			{ id: 'bottomLeft', role: 'image', imageOrder: 2 },
			{ id: 'bottomRight', role: 'image', imageOrder: 3 },
			{ id: 'accent', role: 'image', imageOrder: 4 },
		],
	},
	'portfolio-statement': {
		slug: 'portfolio-statement',
		label: 'Portfolio Statement',
		tier: 'pro',
		imageSlotCount: 4,
		slots: [
			{
				id: 'statement',
				role: 'content',
				embeddedId: 'template-portfolio-statement-copy',
				seed: {
					title: 'Selected work',
					description: '',
					blockBodyHtml:
						'<p>A curated glimpse into recent projects — crafted with care, built to last.</p>',
					blockFontPreset: 'serif',
					blockPaddingPreset: 'medium',
					blockBackgroundColor: DEFAULT_CONTENT_BLOCK_BACKGROUND,
				},
			},
			{ id: 'imgA', role: 'image', imageOrder: 0 },
			{ id: 'imgB', role: 'image', imageOrder: 1 },
			{ id: 'imgC', role: 'image', imageOrder: 2 },
			{ id: 'imgD', role: 'image', imageOrder: 3 },
		],
	},
	'editorial-cluster': {
		slug: 'editorial-cluster',
		label: 'Editorial Cluster',
		tier: 'pro',
		imageSlotCount: 6,
		slots: [
			{ id: 'a', role: 'image', imageOrder: 0 },
			{ id: 'b', role: 'image', imageOrder: 1 },
			{ id: 'c', role: 'image', imageOrder: 2 },
			{ id: 'd', role: 'image', imageOrder: 3 },
			{ id: 'e', role: 'image', imageOrder: 4 },
			{ id: 'f', role: 'image', imageOrder: 5 },
		],
	},
};

/** @type {string[]} */
export const TEMPLATE_LAYOUT_SLUGS = Object.keys(TEMPLATE_DEFINITIONS);

/** @type {Set<string>} */
const TEMPLATE_OWNED_EMBEDDED_IDS = (() => {
	/** @type {Set<string>} */
	const ids = new Set();
	for (const def of Object.values(TEMPLATE_DEFINITIONS)) {
		for (const slot of def.slots) {
			if (slot.role === 'content' && slot.embeddedId) {
				ids.add(String(slot.embeddedId));
			}
		}
	}
	return ids;
})();

/**
 * Fixed embeddedIds owned by template presets (not user-added content blocks).
 *
 * @param {string|undefined|null} id
 * @return {boolean}
 */
export function isTemplateOwnedEmbeddedId(id) {
	const key = String(id || '').trim();
	return key !== '' && TEMPLATE_OWNED_EMBEDDED_IDS.has(key);
}

/**
 * Template-preset content slots cannot be removed while gallery type is
 * `template` (the layout would re-seed them). User-added content blocks stay removable.
 *
 * @param {unknown} row
 * @param {string|undefined|null} galleryType
 * @return {boolean}
 */
export function isTemplateProtectedEmbeddedRow(row, galleryType) {
	if (String(galleryType || '') !== 'template') {
		return false;
	}
	if (!row || typeof row !== 'object') {
		return false;
	}
	const id = row.embeddedId || row.id;
	return isTemplateOwnedEmbeddedId(id);
}

/**
 * @param {string|undefined|null} slug
 * @returns {TemplateDefinition|null}
 */
export function getTemplateDefinition(slug) {
	const key = String(slug || '').trim();
	return TEMPLATE_DEFINITIONS[key] || null;
}

/**
 * @param {string|undefined|null} slug
 * @returns {number}
 */
export function getTemplateImageSlotCount(slug) {
	return getTemplateDefinition(slug)?.imageSlotCount ?? 0;
}

/**
 * @param {unknown[]} items
 * @returns {unknown[]}
 */
export function filterTemplateImageRows(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	return items.filter((row) => {
		if (!row || typeof row !== 'object') {
			return false;
		}
		const kind = String(row.itemKind || '').trim();
		if (kind === 'content_block' || kind === 'shortcode') {
			return false;
		}
		if (row.embeddedId || row.shortcodeRaw) {
			return false;
		}
		return true;
	});
}

/**
 * @param {unknown[]} items
 * @param {string} slug
 * @returns {{ slotted: Record<string, unknown|null>, overflowCount: number, imageCount: number }}
 */
export function mapTemplateItems(items, slug) {
	const def = getTemplateDefinition(slug);
	/** @type {Record<string, unknown|null>} */
	const slotted = {};
	if (!def) {
		return { slotted, overflowCount: 0, imageCount: 0 };
	}

	const imageRows = filterTemplateImageRows(items);
	const overflowCount = Math.max(0, imageRows.length - def.imageSlotCount);

	for (const slot of def.slots) {
		if (slot.role === 'image') {
			const order = slot.imageOrder ?? 0;
			slotted[slot.id] = imageRows[order] ?? null;
			continue;
		}
		if (slot.role === 'content' && slot.embeddedId) {
			const found = Array.isArray(items)
				? items.find(
						(row) =>
							row &&
							(String(row.embeddedId || row.id || '') ===
								slot.embeddedId ||
								String(row.id || '') === slot.embeddedId)
					)
				: null;
			/* Only real gallery rows — never a synthetic fallback (unlinked / unsavable). */
			slotted[slot.id] = found ?? null;
		}
	}

	return {
		slotted,
		overflowCount,
		imageCount: imageRows.length,
	};
}

/**
 * Build content_block rows to seed into the gallery items list (same shape as
 * “Add content block” / `buildNewContentBlockRow` — v2 embedded contract).
 *
 * @param {string} slug
 * @returns {Object[]}
 */
export function buildTemplateContentBlockSeeds(slug) {
	const def = getTemplateDefinition(slug);
	if (!def) {
		return [];
	}
	return def.slots
		.filter(
			(slot) => slot.role === 'content' && slot.embeddedId && slot.seed
		)
		.map((slot) => ({
			itemKind: 'content_block',
			embeddedId: slot.embeddedId,
			id: slot.embeddedId,
			afterAttachmentId: 0,
			afterOrdinal: 0,
			title: slot.seed?.title ?? '',
			description: slot.seed?.description ?? '',
			blockBodyHtml: slot.seed?.blockBodyHtml ?? '<p></p>',
			blockTextColor: '',
			blockFontPreset: slot.seed?.blockFontPreset ?? 'default',
			blockPaddingPreset: slot.seed?.blockPaddingPreset ?? 'default',
			blockBackgroundColor:
				slot.seed?.blockBackgroundColor ||
				DEFAULT_CONTENT_BLOCK_BACKGROUND,
			blockBackgroundImageId: 0,
			blockBackgroundOverlayOpacity: 45,
			blockBackgroundSize: 'cover',
			blockBackgroundPosition: 'center',
			blockBackgroundRepeat: 'no-repeat',
			width: 2,
			height: 2,
		}));
}
