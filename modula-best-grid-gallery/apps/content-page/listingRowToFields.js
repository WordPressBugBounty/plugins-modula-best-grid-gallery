/**
 * Listing row → labels/badges for gallery listing columns.
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { isProExpiredRow } from './listingProExpired';

const NAMED_HTML_ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: '\u00A0',
};

/**
 * Decode HTML entities in a listing title (WordPress `the_title` / wptexturize output).
 *
 * @param {unknown} title
 * @return {string}
 */
export function decodeListingTitle(title) {
	if (typeof title !== 'string') {
		return __('(no title)', 'modula-best-grid-gallery');
	}

	const decoded = title
		.replace(
			/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g,
			(match, entity) => {
				if (entity.charAt(0) === '#') {
					const isHex =
						entity.charAt(1) === 'x' || entity.charAt(1) === 'X';
					const code = isHex
						? parseInt(entity.slice(2), 16)
						: parseInt(entity.slice(1), 10);
					if (!Number.isFinite(code) || code < 0) {
						return match;
					}
					try {
						return String.fromCodePoint(code);
					} catch (e) {
						return match;
					}
				}
				const named = NAMED_HTML_ENTITIES[entity.toLowerCase()];
				return named !== undefined ? named : match;
			}
		)
		.trim();

	return decoded === ''
		? __('(no title)', 'modula-best-grid-gallery')
		: decoded;
}

/**
 * @typedef {Object} ListingRowItems
 * @property {number} images
 * @property {number} videos
 * @property {number} [blocks]     Content blocks.
 * @property {number} [shortcodes] Shortcode items.
 * @property {number} galleries
 * @property {number} total
 */

/**
 * @typedef {Object} ListingShortcodeRow
 * @property {string} id
 * @property {string} label
 * @property {string} code
 * @property {string} [description]
 */

/**
 * The row's one cover thumbnail. Without one, a gallery with content blocks
 * carries its layout miniature (drawing data, see listingMiniatureDrawing.js).
 *
 * @typedef {Object} ListingRowCover
 * @property {string}      url
 * @property {boolean}     isVideo
 * @property {Object|null} [miniature]
 */

/**
 * @typedef {Object} ListingRow
 * @property {number}                             id
 * @property {'gallery'|'album'}                  type
 * @property {string}                             title
 * @property {string}                             status
 * @property {string}                             [slug]
 * @property {string}                             [permalinkPrefix]
 * @property {string}                             [permalinkSuffix]
 * @property {boolean}                            isBeta
 * @property {boolean}                            [hasClassicSettingsBackup]
 * @property {boolean}                            [classicEditorPreferred]
 * @property {boolean}                            hasPassword
 * @property {boolean}                            hasProofing
 * @property {boolean}                            inAlbum
 * @property {string}                             thumbnailUrl
 * @property {string[]}                           [thumbnailUrls]
 * @property {string}                             layoutLabel
 * @property {string}                             [productType]              Type column filter key (`gallery:<type>`, `album:<type>`); empty without a stored type.
 * @property {string}                             [productTypeName]          Type column label.
 * @property {ListingRowCover}                    [cover]                    The row's one cover thumbnail, or its layout miniature.
 * @property {ListingRowItems}                    items
 * @property {string}                             shortcode
 * @property {{ rows?: ListingShortcodeRow[] }}   [shortcodes]
 * @property {string}                             updatedAt
 * @property {string}                             [date]                     Gallery publication wall time in the WordPress site timezone.
 * @property {string}                             [timezone]                 WordPress site timezone identifier or UTC offset.
 * @property {string}                             createdAt
 * @property {{ name: string, initials: string }} author
 * @property {string}                             editUrl
 * @property {string}                             viewUrl
 * @property {boolean}                            [canEdit]
 * @property {boolean}                            [canDelete]
 * @property {string}                             [restoreStatus]
 */

/**
 * @typedef {'proExpired'|'beta'|'album'|'proofing'|'inAlbum'|'draft'} ListingBadgeId
 */

/**
 * @typedef {Object} ListingRowFields
 * @property {string}                title
 * @property {string}                shortcode
 * @property {ListingShortcodeRow[]} shortcodeRows
 * @property {boolean}               hasExtraShortcodes
 * @property {ListingBadgeId[]}      badges
 * @property {string}                itemsPrimary
 * @property {string}                itemsSecondary
 * @property {string}                status
 */

/**
 * @param {number} n
 * @param {string} one  msgid singular with %d
 * @param {string} many msgid plural with %d
 * @return {string}
 */
function countLabel(n, one, many) {
	return sprintf(
		// translators: %d: count of gallery items (photos, videos, etc.).
		_n(one, many, n, 'modula-best-grid-gallery'),
		n
	);
}

/**
 * Gallery item kinds in count line order. The msgids stay literal so the
 * string extractor finds them.
 *
 * @type {Array<{ key: keyof ListingRowItems, label: (n: number) => string }>}
 */
const ITEM_KIND_LABELS = [
	{
		key: 'images',
		label: (n) =>
			sprintf(
				// translators: %d: photo count.
				_n('%d photo', '%d photos', n, 'modula-best-grid-gallery'),
				n
			),
	},
	{
		key: 'videos',
		label: (n) =>
			sprintf(
				// translators: %d: video count.
				_n('%d video', '%d videos', n, 'modula-best-grid-gallery'),
				n
			),
	},
	{
		key: 'blocks',
		label: (n) =>
			sprintf(
				// translators: %d: content block count.
				_n('%d block', '%d blocks', n, 'modula-best-grid-gallery'),
				n
			),
	},
	{
		key: 'shortcodes',
		label: (n) =>
			sprintf(
				// translators: %d: shortcode item count.
				_n(
					'%d shortcode',
					'%d shortcodes',
					n,
					'modula-best-grid-gallery'
				),
				n
			),
	},
];

/**
 * @param {ListingRowItems}   items
 * @param {'gallery'|'album'} type
 * @return {{ primary: string, secondary: string }}
 */
function formatItems(items, type) {
	const galleries = Number(items?.galleries) || 0;
	const parts = ITEM_KIND_LABELS.map(({ key, label }) => {
		const count = Number(items?.[key]) || 0;
		return count > 0 ? label(count) : '';
	}).filter(Boolean);

	if (galleries > 0 && (type === 'album' || parts.length === 0)) {
		return {
			primary: countLabel(galleries, '%d gallery', '%d galleries'),
			secondary: '',
		};
	}

	if (parts.length > 0) {
		return { primary: parts.join(' · '), secondary: '' };
	}

	const total = Number(items?.total) || 0;
	return {
		primary: countLabel(total, '%d item', '%d items'),
		secondary: '',
	};
}

/**
 * Normalize shortcode rows for the shortcode cell.
 *
 * @param {ListingRow} row
 * @return {{ shortcode: string, shortcodeRows: ListingShortcodeRow[], hasExtraShortcodes: boolean }}
 */
export function resolveListingShortcodes(row) {
	const fallback =
		typeof row?.shortcode === 'string' ? row.shortcode.trim() : '';
	const rawRows = Array.isArray(row?.shortcodes?.rows)
		? row.shortcodes.rows
		: [];

	/** @type {ListingShortcodeRow[]} */
	const shortcodeRows = [];
	for (const entry of rawRows) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const code = typeof entry.code === 'string' ? entry.code.trim() : '';
		if (!code) {
			continue;
		}
		shortcodeRows.push({
			id:
				typeof entry.id === 'string' && entry.id
					? entry.id
					: `row-${shortcodeRows.length}`,
			label: typeof entry.label === 'string' ? entry.label : '',
			code,
			...(typeof entry.description === 'string'
				? { description: entry.description }
				: {}),
		});
	}

	if (shortcodeRows.length === 0 && fallback) {
		shortcodeRows.push({
			id: 'primary',
			label: '',
			code: fallback,
		});
	}

	const shortcode = shortcodeRows[0]?.code || fallback;

	return {
		shortcode,
		shortcodeRows,
		hasExtraShortcodes: shortcodeRows.length > 1,
	};
}

/**
 * Map a listing row to column presentation fields.
 *
 * @param {ListingRow} row
 * @param {Object}     [options]
 * @param {string[]}   [options.proExpiredTypeKeys] From getProExpiredTypeKeys(); none shows no PRO expired badge.
 * @return {ListingRowFields}
 */
export function listingRowToFields(row, { proExpiredTypeKeys = [] } = {}) {
	/** @type {ListingBadgeId[]} */
	const badges = [];
	if (isProExpiredRow(row, proExpiredTypeKeys)) {
		badges.push('proExpired');
	}
	if (row.type === 'album') {
		badges.push('album');
	}
	if (row.isBeta) {
		badges.push('beta');
	}
	if (row.hasProofing) {
		badges.push('proofing');
	}
	if (row.inAlbum) {
		badges.push('inAlbum');
	}
	if (row.status === 'draft') {
		badges.push('draft');
	}

	const items = formatItems(row.items || {}, row.type || 'gallery');
	const shortcodes = resolveListingShortcodes(row);

	return {
		title: decodeListingTitle(row.title),
		shortcode: shortcodes.shortcode,
		shortcodeRows: shortcodes.shortcodeRows,
		hasExtraShortcodes: shortcodes.hasExtraShortcodes,
		badges,
		itemsPrimary: items.primary,
		itemsSecondary: items.secondary,
		status: row.status || '',
	};
}
