/**
 * Listing row → labels/badges for gallery listing columns.
 */

import { __, _n, sprintf } from '@wordpress/i18n';

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
 * @typedef {Object} ListingRow
 * @property {number} id
 * @property {'gallery'|'album'} type
 * @property {string} title
 * @property {string} status
 * @property {string} [slug]
 * @property {string} [permalinkPrefix]
 * @property {string} [permalinkSuffix]
 * @property {boolean} isBeta
 * @property {boolean} [hasClassicSettingsBackup]
 * @property {boolean} [classicEditorPreferred]
 * @property {boolean} hasPassword
 * @property {boolean} hasProofing
 * @property {boolean} inAlbum
 * @property {string} thumbnailUrl
 * @property {string[]} [thumbnailUrls]
 * @property {string} layoutLabel
 * @property {ListingRowItems} items
 * @property {string} shortcode
 * @property {{ rows?: ListingShortcodeRow[] }} [shortcodes]
 * @property {string} updatedAt
 * @property {string} createdAt
 * @property {{ name: string, initials: string }} author
 * @property {string} editUrl
 * @property {string} viewUrl
 * @property {boolean} [canEdit]
 * @property {boolean} [canDelete]
 * @property {string} [restoreStatus]
 */

/**
 * @typedef {'beta'|'album'|'proofing'|'inAlbum'} ListingBadgeId
 */

/**
 * @typedef {Object} ListingRowFields
 * @property {string} title
 * @property {string} shortcode
 * @property {ListingShortcodeRow[]} shortcodeRows
 * @property {boolean} hasExtraShortcodes
 * @property {ListingBadgeId[]} badges
 * @property {string} itemsPrimary
 * @property {string} itemsSecondary
 * @property {string} status
 */

/**
 * @param {number} n
 * @param {string} one   msgid singular with %d
 * @param {string} many  msgid plural with %d
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
 * @param {ListingRowItems} items
 * @param {'gallery'|'album'} type
 * @return {{ primary: string, secondary: string }}
 */
function formatItems(items, type) {
	const images = Number(items?.images) || 0;
	const videos = Number(items?.videos) || 0;
	const galleries = Number(items?.galleries) || 0;
	const total = Number(items?.total) || images + videos + galleries;

	if (galleries > 0 && (type === 'album' || images + videos === 0)) {
		return {
			primary: countLabel(galleries, '%d gallery', '%d galleries'),
			secondary: '',
		};
	}

	if (images > 0 && videos === 0) {
		return {
			primary: countLabel(images, '%d photo', '%d photos'),
			secondary: '',
		};
	}

	if (videos > 0 && images === 0) {
		return {
			primary: countLabel(videos, '%d video', '%d videos'),
			secondary: '',
		};
	}

	if (images > 0 && videos > 0) {
		return {
			primary: `${countLabel(images, '%d photo', '%d photos')} ${countLabel(
				videos,
				'%d video',
				'%d videos'
			)}`,
			secondary: '',
		};
	}

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
 * @return {ListingRowFields}
 */
export function listingRowToFields(row) {
	/** @type {ListingBadgeId[]} */
	const badges = [];
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
