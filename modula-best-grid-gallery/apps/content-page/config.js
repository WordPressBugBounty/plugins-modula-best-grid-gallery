/**
 * Bootstrap from wp_localize_script( 'modulaGalleryListing' ). The global keeps
 * its old name because Pro's presets read its nonce.
 *
 * @return {{
 *   nonce: string,
 *   listUrl: string,
 *   logoUrl: string,
 *   newGalleryUrl: string,
 *   postNewUrl: string,
 *   editorChoiceQueryArg: string,
 *   presetQueryArg: string,
 *   galleryPresets: unknown[],
 *   defaultGalleryPresetId: unknown,
 *   settingsUrl: string,
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
 *   licenseState: string,
 *   proOnlyGalleryTypes: string[],
 *   standaloneUpsellUrl: string,
 *   extensionsAdminUrl: string,
 *   presetsUrl: string,
 *   presetsCount: number,
 *   licensesUrl: string,
 *   licensesCount: number,
 *   sectionImagesUrl: string,
 *   notificationsIconUrl: string|null,
 * }}
 */
export function getContentPageConfig() {
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
			typeof raw.newGalleryUrl === 'string'
				? raw.newGalleryUrl
				: postNewUrl,
		postNewUrl,
		editorChoiceQueryArg:
			typeof raw.editorChoiceQueryArg === 'string'
				? raw.editorChoiceQueryArg
				: 'modula_editor',
		presetQueryArg:
			typeof raw.presetQueryArg === 'string'
				? raw.presetQueryArg
				: 'modula_preset',
		galleryPresets: Array.isArray(raw.galleryPresets)
			? raw.galleryPresets
			: [],
		defaultGalleryPresetId: raw.defaultGalleryPresetId ?? 0,
		settingsUrl: typeof raw.settingsUrl === 'string' ? raw.settingsUrl : '',
		createGalleryNonce:
			typeof raw.createGalleryNonce === 'string'
				? raw.createGalleryNonce
				: '',
		createAlbumNonce:
			typeof raw.createAlbumNonce === 'string'
				? raw.createAlbumNonce
				: '',
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
		upgradeUrl: typeof raw.upgradeUrl === 'string' ? raw.upgradeUrl : '',
		licenseState:
			typeof raw.licenseState === 'string' ? raw.licenseState : 'none',
		// Filled by Compatible Pro through modula_gallery_listing_config.
		proOnlyGalleryTypes: Array.isArray(raw.proOnlyGalleryTypes)
			? raw.proOnlyGalleryTypes.filter(
					(slug) => typeof slug === 'string' && slug !== ''
				)
			: [],
		standaloneUpsellUrl:
			typeof raw.standaloneUpsellUrl === 'string'
				? raw.standaloneUpsellUrl
				: '',
		extensionsAdminUrl:
			typeof raw.extensionsAdminUrl === 'string'
				? raw.extensionsAdminUrl
				: '',
		presetsUrl: typeof raw.presetsUrl === 'string' ? raw.presetsUrl : '',
		presetsCount: Number.isInteger(raw.presetsCount) ? raw.presetsCount : 0,
		licensesUrl: typeof raw.licensesUrl === 'string' ? raw.licensesUrl : '',
		licensesCount: Number.isInteger(raw.licensesCount)
			? raw.licensesCount
			: 0,
		sectionImagesUrl:
			typeof raw.sectionImagesUrl === 'string'
				? raw.sectionImagesUrl
				: '',
		// Printed apart (Modula_Admin_Assets::add_notifications_icon), only
		// while the WPChill notification center is loaded: no avatar, no bell.
		notificationsIconUrl:
			typeof window !== 'undefined'
				? (window.modulaContentPageNotifications?.iconUrl ?? null)
				: null,
	};
}
