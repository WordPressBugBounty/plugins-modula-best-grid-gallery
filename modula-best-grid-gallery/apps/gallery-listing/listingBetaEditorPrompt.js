/**
 * Whether to show the Beta editor choice modal when opening a classic gallery or album.
 *
 * Albums only when Albums editor takeover is available site-wide.
 *
 * @param {import('./listingRowToFields').ListingRow} item
 * @param {{ albumTakeoverAvailable?: boolean }} [options]
 * @return {boolean}
 */
export function shouldShowBetaEditorPrompt(item, options = {}) {
	if (!item || ('gallery' !== item.type && 'album' !== item.type)) {
		return false;
	}
	if (item.isBeta) {
		return false;
	}
	if (item.classicEditorPreferred) {
		return false;
	}
	if ('trash' === item.status) {
		return false;
	}
	if (!item.editUrl) {
		return false;
	}
	if ('album' === item.type && options.albumTakeoverAvailable !== true) {
		return false;
	}
	return true;
}

/**
 * Shape an album-preview member into a listing row for Open gallery editor choice.
 *
 * @param {Object} member
 * @return {import('./listingRowToFields').ListingRow}
 */
export function listingRowFromPreviewMember(member) {
	return {
		id: Number(member?.id) || 0,
		type: member?.type === 'album' ? 'album' : 'gallery',
		title: typeof member?.title === 'string' ? member.title : '',
		editUrl: typeof member?.editUrl === 'string' ? member.editUrl : '',
		isBeta: Boolean(member?.isBeta),
		classicEditorPreferred: Boolean(member?.classicEditorPreferred),
		status: typeof member?.status === 'string' ? member.status : 'publish',
	};
}
