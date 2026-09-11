/**
 * Listing row post document — title, status, and slug via CPT REST.
 *
 * Shared write path for Quick edit (listing) and editor status/permalink surfaces.
 */

import apiFetch from '@wordpress/api-fetch';
import { listingRowRestPath } from './listingRowRestPath';

/** @type {readonly ['publish', 'draft', 'private']} */
export const LISTING_ROW_POST_DOCUMENT_STATUSES = Object.freeze([
	'publish',
	'draft',
	'private',
]);

/**
 * Query filter used after a successful listing row post document write.
 * Keeps listing title / status / slug in sync via refetch.
 */
export const LISTING_ROW_POST_DOCUMENT_INVALIDATE = Object.freeze({
	queryKey: ['modula-listing'],
});

/**
 * @param {unknown} status
 * @return {status is 'publish'|'draft'|'private'}
 */
export function isAllowedListingRowPostDocumentStatus(status) {
	return (
		typeof status === 'string' &&
		LISTING_ROW_POST_DOCUMENT_STATUSES.includes(
			/** @type {'publish'|'draft'|'private'} */ (status)
		)
	);
}

/**
 * @typedef {Object} ListingRowPostDocumentSeed
 * @property {string} title
 * @property {string} status
 * @property {string} slug
 * @property {string} permalinkPrefix
 * @property {string} permalinkSuffix
 * @property {string} viewUrl
 * @property {boolean} canEdit
 */

/**
 * Seed Quick edit / editor controls from a listing row payload.
 *
 * @param {{
 *   title?: string,
 *   status?: string,
 *   slug?: string,
 *   permalinkPrefix?: string,
 *   permalinkSuffix?: string,
 *   viewUrl?: string,
 *   canEdit?: boolean,
 * }|null|undefined} row
 * @return {ListingRowPostDocumentSeed}
 */
export function listingRowToPostDocumentSeed(row) {
	return {
		title: typeof row?.title === 'string' ? row.title : '',
		status: typeof row?.status === 'string' ? row.status : '',
		slug: typeof row?.slug === 'string' ? row.slug : '',
		permalinkPrefix:
			typeof row?.permalinkPrefix === 'string' ? row.permalinkPrefix : '',
		permalinkSuffix:
			typeof row?.permalinkSuffix === 'string' ? row.permalinkSuffix : '',
		viewUrl: typeof row?.viewUrl === 'string' ? row.viewUrl : '',
		canEdit: Boolean(row?.canEdit),
	};
}

/**
 * @param {{ title: string, status?: string, slug: string }} document
 * @return {{ title: string, status?: string, slug: string }}
 */
export function buildListingRowPostDocumentPayload(document) {
	const title = typeof document?.title === 'string' ? document.title : '';
	const status = typeof document?.status === 'string' ? document.status : '';
	const slug = typeof document?.slug === 'string' ? document.slug : '';

	if (
		Object.prototype.hasOwnProperty.call(document, 'status') &&
		!isAllowedListingRowPostDocumentStatus(status)
	) {
		throw new Error(
			`Listing row post document status must be one of: ${LISTING_ROW_POST_DOCUMENT_STATUSES.join(
				', '
			)}.`
		);
	}

	return {
		title,
		slug,
		...(Object.prototype.hasOwnProperty.call(document, 'status')
			? { status }
			: {}),
	};
}

/**
 * Persist a listing row’s post document via WordPress CPT REST.
 *
 * @param {{ type?: string, id?: number }} item
 * @param {{ title: string, status?: string, slug: string }} document
 * @return {Promise<unknown>}
 */
export async function putListingRowPostDocument(item, document) {
	const data = buildListingRowPostDocumentPayload(document);
	return apiFetch({
		path: listingRowRestPath(item),
		method: 'PUT',
		data,
	});
}
