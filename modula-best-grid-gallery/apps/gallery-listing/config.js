/**
 * Bootstrap from wp_localize_script( 'modulaGalleryListing' ).
 *
 * @return {{
 *   nonce: string,
 *   listUrl: string,
 *   logoUrl: string,
 *   newGalleryUrl: string,
 *   postNewUrl: string,
 *   editorChoiceQueryArg: string,
 *   createGalleryNonce: string,
 *   createAlbumNonce: string,
 *   editorChoiceHeroUrl: string,
 *   hasAlbums: boolean,
 *   canCreateAlbum: boolean,
 *   newAlbumUrl: string,
 *   isPro: boolean,
 *   canUseBulkEditor: boolean,
 *   canUseApplyPreset: boolean,
 *   albumTakeoverAvailable: boolean,
 *   extensionEntitlements: Record<string, { available?: boolean, enabled?: boolean }>,
 *   upgradeUrl: string,
 *   standaloneUpsellUrl: string,
 *   extensionsAdminUrl: string,
 * }}
 */
export function getGalleryListingConfig() {
	const raw =
		typeof window !== 'undefined' && window.modulaGalleryListing
			? window.modulaGalleryListing
			: {};
	const postNewUrl =
		typeof raw.postNewUrl === 'string'
			? raw.postNewUrl
			: typeof raw.newGalleryUrl === 'string'
				? raw.newGalleryUrl
				: '';
	return {
		nonce: typeof raw.nonce === 'string' ? raw.nonce : '',
		listUrl: typeof raw.listUrl === 'string' ? raw.listUrl : '',
		logoUrl: typeof raw.logoUrl === 'string' ? raw.logoUrl : '',
		newGalleryUrl:
			typeof raw.newGalleryUrl === 'string' ? raw.newGalleryUrl : postNewUrl,
		postNewUrl,
		editorChoiceQueryArg:
			typeof raw.editorChoiceQueryArg === 'string'
				? raw.editorChoiceQueryArg
				: 'modula_editor',
		createGalleryNonce:
			typeof raw.createGalleryNonce === 'string'
				? raw.createGalleryNonce
				: '',
		createAlbumNonce:
			typeof raw.createAlbumNonce === 'string' ? raw.createAlbumNonce : '',
		editorChoiceHeroUrl:
			typeof raw.editorChoiceHeroUrl === 'string'
				? raw.editorChoiceHeroUrl
				: '',
		hasAlbums: Boolean(raw.hasAlbums),
		canCreateAlbum: Boolean(raw.canCreateAlbum),
		newAlbumUrl: typeof raw.newAlbumUrl === 'string' ? raw.newAlbumUrl : '',
		isPro: Boolean(raw.isPro),
		canUseBulkEditor: Boolean(raw.canUseBulkEditor),
		canUseApplyPreset: Boolean(raw.canUseApplyPreset),
		albumTakeoverAvailable: Boolean(raw.albumTakeoverAvailable),
		extensionEntitlements:
			raw.extensionEntitlements &&
			typeof raw.extensionEntitlements === 'object'
				? raw.extensionEntitlements
				: {},
		upgradeUrl:
			typeof raw.upgradeUrl === 'string' ? raw.upgradeUrl : '',
		standaloneUpsellUrl:
			typeof raw.standaloneUpsellUrl === 'string'
				? raw.standaloneUpsellUrl
				: '',
		extensionsAdminUrl:
			typeof raw.extensionsAdminUrl === 'string'
				? raw.extensionsAdminUrl
				: '',
	};
}
