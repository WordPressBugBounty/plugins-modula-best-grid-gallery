/**
 * Content sections: the tabs under the Content header (All, Galleries,
 * Albums, Proofing, Presets, Licenses), the section upsell a Pro-only section
 * shows without Pro, and the New buttons the header offers in each section.
 */
import { __ } from '@wordpress/i18n';

/**
 * @typedef {'all'|'galleries'|'albums'|'proofing'|'presets'|'licenses'} ContentSectionSlug
 */

/**
 * @typedef {Object} ContentSection
 * @property {ContentSectionSlug} slug   Saved with the view for a list section.
 * @property {string}             label  Tab text.
 * @property {number|null}        count  Shown after the label; null shows none.
 * @property {boolean}            upsell Lite: a Pro-only section showing its upsell.
 * @property {string}             href   Pro's own screen (Presets, Licenses); '' for a section of this page.
 */

/**
 * @typedef {Object} SectionCounts Non-trash rows per section, from GET /listing `sectionCounts`.
 * @property {number} all       Galleries and albums.
 * @property {number} galleries Galleries.
 * @property {number} albums    Albums (0 without the album CPT).
 * @property {number} proofing  Galleries with Image Proofing on.
 */

export const CONTENT_SECTION_ALL = 'all';

/** Sections whose rows GET /listing returns (its `section` param); the rest are other screens or upsells. */
export const LIST_SECTIONS = [
	CONTENT_SECTION_ALL,
	'galleries',
	'albums',
	'proofing',
];

/**
 * @param {ContentSectionSlug}      slug
 * @param {string}                  label
 * @param {Partial<ContentSection>} [rest]
 * @return {ContentSection} Section.
 */
function section(slug, label, rest = {}) {
	return { slug, label, count: null, upsell: false, href: '', ...rest };
}

/**
 * The sections the page shows, in the design's order.
 *
 * Without Pro, Albums, Proofing, Presets and Licenses are section upsells
 * (PRO pill, no count). With Pro, Albums needs the album CPT, and Presets and
 * Licenses link to Pro's screens, so they are left out when the screen is not
 * available.
 *
 * @param {{ isPro: boolean, hasAlbums: boolean, presetsUrl: string, presetsCount: number, licensesUrl: string, licensesCount: number }} config
 * @param {SectionCounts|null|undefined}                                                                                                 counts Null until the listing answers.
 * @return {ContentSection[]} Sections.
 */
export function getContentSections(config, counts) {
	const countOf = (slug) =>
		counts && Number.isInteger(counts[slug]) ? counts[slug] : null;
	const shared = [
		section(CONTENT_SECTION_ALL, __('All', 'modula-best-grid-gallery'), {
			count: countOf(CONTENT_SECTION_ALL),
		}),
		section('galleries', __('Galleries', 'modula-best-grid-gallery'), {
			count: countOf('galleries'),
		}),
	];
	const albums = __('Albums', 'modula-best-grid-gallery');
	const proofing = __('Proofing', 'modula-best-grid-gallery');
	const presets = __('Presets', 'modula-best-grid-gallery');
	const licenses = __('Licenses', 'modula-best-grid-gallery');

	if (!config.isPro) {
		return [
			...shared,
			section('albums', albums, { upsell: true }),
			section('proofing', proofing, { upsell: true }),
			section('presets', presets, { upsell: true }),
			section('licenses', licenses, { upsell: true }),
		];
	}

	return [
		...shared,
		config.hasAlbums
			? section('albums', albums, { count: countOf('albums') })
			: null,
		section('proofing', proofing, { count: countOf('proofing') }),
		config.presetsUrl
			? section('presets', presets, {
					count: config.presetsCount,
					href: config.presetsUrl,
				})
			: null,
		config.licensesUrl
			? section('licenses', licenses, {
					count: config.licensesCount,
					href: config.licensesUrl,
				})
			: null,
	].filter(Boolean);
}

/**
 * The list section to open: a saved section the page still lists, or All.
 * A linked section (another screen) and an upsell never open as a list.
 *
 * @param {unknown}          slug     Saved or requested section.
 * @param {ContentSection[]} sections From getContentSections().
 * @return {ContentSectionSlug} Section slug.
 */
export function resolveContentSection(slug, sections) {
	const match = sections.find((candidate) => candidate.slug === slug);
	return match && !match.upsell && '' === match.href
		? match.slug
		: CONTENT_SECTION_ALL;
}

/**
 * Section upsell copy, plan and example images (board "6 · Content – Lite").
 * Plans are the first that include the feature; there are no prices.
 *
 * @return {Record<string, { plan: string, title: string, text: string, benefits: string[], images: { file: string, caption?: string, picked?: boolean }[] }>} Upsells by section.
 */
function sectionUpsells() {
	return {
		albums: {
			plan: 'Trio',
			title: __(
				'Group your galleries into albums',
				'modula-best-grid-gallery'
			),
			text: __(
				'Put related galleries together and show them as one collection on your site.',
				'modula-best-grid-gallery'
			),
			benefits: [
				__('Organize photos into albums', 'modula-best-grid-gallery'),
				__('Display Instagram feeds', 'modula-best-grid-gallery'),
				__('Password-protect galleries', 'modula-best-grid-gallery'),
				__(
					'Unlimited image optimization & CDN',
					'modula-best-grid-gallery'
				),
			],
			images: [
				{
					file: 'portraits.jpg',
					caption: __('Portraits', 'modula-best-grid-gallery'),
				},
				{
					file: 'nature.jpg',
					caption: __('Nature Escapes', 'modula-best-grid-gallery'),
				},
				{
					file: 'urban.jpg',
					caption: __(
						'Urban & Architecture',
						'modula-best-grid-gallery'
					),
				},
			],
		},
		proofing: {
			plan: 'Business',
			title: __(
				'Let clients pick their favorite photos',
				'modula-best-grid-gallery'
			),
			text: __(
				'Share a gallery with a client. They mark the photos they like and you get the list.',
				'modula-best-grid-gallery'
			),
			benefits: [
				__('Image Proofing', 'modula-best-grid-gallery'),
				__('Watermark', 'modula-best-grid-gallery'),
				__('Allow image downloads', 'modula-best-grid-gallery'),
				__(
					'Let visitors comment on images',
					'modula-best-grid-gallery'
				),
			],
			images: [
				{ file: 'portrait-tall.jpg', picked: true },
				{ file: 'portraits.jpg' },
				{ file: 'proofing-pick.jpg', picked: true },
			],
		},
		presets: {
			plan: 'Business',
			title: __(
				'Start every gallery from saved settings',
				'modula-best-grid-gallery'
			),
			text: __(
				'Set up a gallery once, save its settings and reuse them for new galleries.',
				'modula-best-grid-gallery'
			),
			benefits: [
				__('Default gallery settings', 'modula-best-grid-gallery'),
				__('Watermark', 'modula-best-grid-gallery'),
				__('Image Proofing', 'modula-best-grid-gallery'),
				__('EXIF', 'modula-best-grid-gallery'),
			],
			images: [
				{
					file: 'preset-portfolio-masonry.jpg',
					caption: __(
						'Portfolio masonry',
						'modula-best-grid-gallery'
					),
				},
				{
					file: 'preset-client-proofing.jpg',
					caption: __('Client proofing', 'modula-best-grid-gallery'),
				},
				{
					file: 'preset-video-playlist.png',
					caption: __('Video playlist', 'modula-best-grid-gallery'),
				},
			],
		},
		licenses: {
			plan: 'Trio',
			title: __(
				'Sell licenses for your photos',
				'modula-best-grid-gallery'
			),
			text: __(
				'Show license terms on each photo and link to where people can buy it.',
				'modula-best-grid-gallery'
			),
			benefits: [
				__('Sell image licenses', 'modula-best-grid-gallery'),
				__(
					'Right-click & hotlink protection',
					'modula-best-grid-gallery'
				),
				__('Password-protect galleries', 'modula-best-grid-gallery'),
				__('Organize photos into albums', 'modula-best-grid-gallery'),
			],
			images: [
				{
					file: 'urban.jpg',
					caption: __('CC BY', 'modula-best-grid-gallery'),
				},
				{
					file: 'nature.jpg',
					caption: __('Studio license', 'modula-best-grid-gallery'),
				},
				{
					file: 'portrait-tall.jpg',
					caption: __('Editorial use', 'modula-best-grid-gallery'),
				},
			],
		},
	};
}

/**
 * The section upsell for a Pro-only section, as UpsellPanel props without the
 * upgrade URL; null for a section that has none.
 *
 * @param {string} slug      Section.
 * @param {string} imagesUrl Base URL of the example images (bootstrap `sectionImagesUrl`).
 * @return {{ plan: string, title: string, text: string, benefits: string[], images: import('admin-ui/upsell-panel/UpsellPanel').UpsellPanelImage[] }|null} Upsell.
 */
export function getSectionUpsell(slug, imagesUrl) {
	const upsells = sectionUpsells();
	if (!Object.hasOwn(upsells, slug)) {
		return null;
	}
	const { images, ...copy } = upsells[slug];
	return {
		...copy,
		images: images.map(({ file, ...image }) => ({
			...image,
			src: imagesUrl + file,
		})),
	};
}

/**
 * The New buttons the header shows in a section (boards 2 and 6): New album
 * and New gallery over All and Galleries, New album alone over Albums, none
 * over Proofing or an upsell. Without Pro, New album is the Albums upsell.
 *
 * @param {string}                                                                               slug   Section shown.
 * @param {{ isPro: boolean, postNewUrl: string, canCreateAlbum: boolean, newAlbumUrl: string }} config
 * @return {{ gallery: boolean, album: 'create'|'upsell'|null }} Buttons.
 */
export function getHeaderCreateActions(slug, config) {
	const listsGalleries = CONTENT_SECTION_ALL === slug || 'galleries' === slug;
	const listsAlbums = listsGalleries || 'albums' === slug;
	const canCreateAlbum = Boolean(config.canCreateAlbum && config.newAlbumUrl);

	let album = null;
	if (!config.isPro && listsGalleries) {
		album = 'upsell';
	} else if (config.isPro && listsAlbums && canCreateAlbum) {
		album = 'create';
	}

	return {
		gallery: listsGalleries && '' !== config.postNewUrl,
		album,
	};
}
