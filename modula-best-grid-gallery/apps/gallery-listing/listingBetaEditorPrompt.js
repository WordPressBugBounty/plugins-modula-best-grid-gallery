/**
 * Whether to show the Beta editor choice modal when opening a classic gallery or album.
 *
 * @param {import('./listingRowToFields').ListingRow} item
 * @return {boolean}
 */
export function shouldShowBetaEditorPrompt(item) {
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
	return Boolean(item.editUrl);
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
