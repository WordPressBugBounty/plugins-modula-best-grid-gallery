/**
 * “Add new” media menu rows for metabox (legacy DOM targets) vs takeover (React flows).
 */
import { __ } from '@wordpress/i18n';
import {
	archive,
	blockDefault,
	box,
	cloudUpload,
	gallery,
	loop,
	media,
	share,
	video,
} from '@wordpress/icons';
import { gateLockHint, resolveProGateLock } from '../logic/proGateLock';
import { firstPresentDomSelector as firstPresent } from './firstPresentDomSelector';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { isAddNewProFeatureEntitled } from './addNewEntitlements';
import {
	addMenuAnotherGalleryIcon,
	addMenuContentBlockIcon,
	addMenuFolderIcon,
	addMenuInstagramIcon,
	addMenuMediaLibraryIcon,
	addMenuUploadFilesIcon,
	addMenuVideoIcon,
	addMenuVideoPlaylistIcon,
	addMenuZipArchiveIcon,
} from './addNewMenuIcons';

const EXT_VIDEO = 'modula-video';
const EXT_CONTENT_GALLERIES = 'modula-content-galleries';
const EXT_INSTAGRAM = 'modula-instagram';

export function getAddNewMenuDefinition() {
	return [
		{
			id: 'upload',
			label: __('Upload', 'modula-best-grid-gallery'),
			icon: cloudUpload,
			selectors: ['#modula-uploader-browser'],
		},
		{
			id: 'library',
			label: __('From Library', 'modula-best-grid-gallery'),
			icon: media,
			selectors: ['#modula-wp-gallery'],
		},
		{
			id: 'content-block',
			label: __('Content block', 'modula-best-grid-gallery'),
			icon: blockDefault,
			reactFlow: 'content-block',
		},
		{
			id: 'video',
			label: __('Video', 'modula-best-grid-gallery'),
			icon: video,
			extensionSlug: EXT_VIDEO,
			selectors: ['#modula-video-insert-template'],
			fallbackSelectors: ['#modula-video-upsell'],
		},
		{
			id: 'playlist',
			label: __('Video Playlist', 'modula-best-grid-gallery'),
			icon: loop,
			extensionSlug: EXT_VIDEO,
			selectors: ['#modula-playlist-insert-template'],
			fallbackSelectors: ['#modula-video-playlist-upsell'],
		},
		{
			id: 'content-galleries',
			label: __('Content Galleries', 'modula-best-grid-gallery'),
			icon: gallery,
			extensionSlug: EXT_CONTENT_GALLERIES,
			selectors: ['#modula-content-galleries'],
			fallbackSelectors: ['#modula-content-galleries-upsell'],
		},
		{
			id: 'instagram',
			label: __('Connect Instagram', 'modula-best-grid-gallery'),
			icon: share,
			extensionSlug: EXT_INSTAGRAM,
			selectors: [
				'#modula-instagram-connector',
				'.modula-not-connected a',
			],
			fallbackSelectors: ['#modula-instagram-upsell'],
		},
		{
			id: 'folder',
			label: __('From Folder', 'modula-best-grid-gallery'),
			icon: box,
			requiresProOnly: true,
			reactFlow: 'folder',
			selectors: ['#modula-uploader-folder-browser'],
		},
		{
			id: 'zip',
			label: __('From ZIP', 'modula-best-grid-gallery'),
			icon: archive,
			requiresProOnly: true,
			reactFlow: 'zip',
			selectors: ['#modula-upload-zip-browser'],
		},
	];
}

/**
 * Takeover menu when `general.type` is `video`.
 * Same rows as the default takeover menu; `library` is routed to the video
 * media library in `useTakeoverPreviewAddNewMenu`, and `video` opens the URL modal.
 *
 * @return {Array<object>}
 */
export function getTakeoverVideoGalleryAddNewMenuDefinition() {
	return getTakeoverAddNewMenuDefinition();
}

/**
 * Takeover add-media menu groups (styleguide flyout).
 *
 * @return {{ id: string, label: string }[]}
 */
export function getTakeoverAddNewMenuGroups() {
	return [
		{
			id: 'computer',
			label: __('From your computer', 'modula-best-grid-gallery'),
		},
		{
			id: 'site',
			label: __('Already on this site', 'modula-best-grid-gallery'),
		},
		{
			id: 'link',
			label: __('From a link', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * Takeover add-media menu: no legacy `#modula-*` selectors (avoids clashing with scripts that bind
 * to those nodes when the classic metabox is present elsewhere). Grouped for the redesign flyout.
 *
 * @return {Array<object>} Takeover add-media menu row descriptors (no legacy selectors).
 */
export function getTakeoverAddNewMenuDefinition() {
	return [
		{
			id: 'upload',
			group: 'computer',
			label: __('Upload files', 'modula-best-grid-gallery'),
			icon: addMenuUploadFilesIcon,
		},
		{
			id: 'zip',
			group: 'computer',
			label: __('A ZIP archive', 'modula-best-grid-gallery'),
			icon: addMenuZipArchiveIcon,
			requiresProOnly: true,
			reactFlow: 'zip',
		},
		{
			id: 'library',
			group: 'site',
			label: __('Media library', 'modula-best-grid-gallery'),
			icon: addMenuMediaLibraryIcon,
		},
		{
			id: 'folder',
			group: 'site',
			label: __('A folder on the server', 'modula-best-grid-gallery'),
			icon: addMenuFolderIcon,
			requiresProOnly: true,
			reactFlow: 'folder',
		},
		{
			id: 'content-block',
			group: 'site',
			label: __('A content block', 'modula-best-grid-gallery'),
			icon: addMenuContentBlockIcon,
			reactFlow: 'content-block',
		},
		{
			id: 'content-galleries',
			group: 'site',
			label: __('Another gallery', 'modula-best-grid-gallery'),
			icon: addMenuAnotherGalleryIcon,
			extensionSlug: EXT_CONTENT_GALLERIES,
			reactFlow: 'content-galleries',
		},
		{
			id: 'video',
			group: 'link',
			label: __('A video', 'modula-best-grid-gallery'),
			icon: addMenuVideoIcon,
			extensionSlug: EXT_VIDEO,
			reactFlow: 'video',
		},
		{
			id: 'playlist',
			group: 'link',
			label: __('A video playlist', 'modula-best-grid-gallery'),
			icon: addMenuVideoPlaylistIcon,
			extensionSlug: EXT_VIDEO,
			reactFlow: 'video-playlist',
		},
		{
			id: 'instagram',
			group: 'link',
			label: __('Instagram', 'modula-best-grid-gallery'),
			icon: addMenuInstagramIcon,
			extensionSlug: EXT_INSTAGRAM,
			reactFlow: 'instagram',
		},
	];
}

/**
 * @param {ReturnType<typeof getAddNewMenuDefinition>[number] | ReturnType<typeof getTakeoverAddNewMenuDefinition>[number]} row
 * @param {Record<string, unknown>}                                                                                         editor
 * @return {boolean} Whether the row can be activated in the current editor context.
 */
export function getAddNewRowActionable(row, editor) {
	if (editor.takeover && row.reactFlow === 'content-block') {
		return Number(editor.galleryId) > 0;
	}
	if (editor.takeover && row.reactFlow) {
		if (
			(row.reactFlow === 'folder' || row.reactFlow === 'zip') &&
			!isAddNewProFeatureEntitled(row, editor)
		) {
			return false;
		}
		if (
			row.reactFlow !== 'folder' &&
			row.reactFlow !== 'zip' &&
			!editor.isPro
		) {
			return false;
		}
		if (row.reactFlow === 'content-galleries') {
			if (Number(editor.galleryId) <= 0) {
				return false;
			}
			const { allowed } = resolveProGateLock(
				{
					kind: 'requiresExtension',
					extensionSlug: EXT_CONTENT_GALLERIES,
				},
				editor
			);
			return allowed;
		}
		if (row.reactFlow === 'instagram') {
			if (Number(editor.galleryId) <= 0) {
				return false;
			}
			const { allowed } = resolveProGateLock(
				{
					kind: 'requiresExtension',
					extensionSlug: EXT_INSTAGRAM,
				},
				editor
			);
			return allowed;
		}
		if (row.reactFlow === 'video' || row.reactFlow === 'video-playlist') {
			if (Number(editor.galleryId) <= 0) {
				return false;
			}
			const { allowed } = resolveProGateLock(
				{
					kind: 'requiresExtension',
					extensionSlug: EXT_VIDEO,
				},
				editor
			);
			return allowed;
		}
		if (row.reactFlow === 'folder') {
			return Boolean(editor.folderBrowseRoot);
		}
		if (row.reactFlow === 'zip') {
			return Boolean(
				typeof window !== 'undefined' &&
					window.wp?.Uploader &&
					window.jQuery
			);
		}
	}
	if (editor.takeover && row.id === 'upload') {
		return Number(editor.galleryId) > 0;
	}
	if (editor.takeover && row.id === 'library') {
		return (
			Number(editor.galleryId) > 0 &&
			typeof window !== 'undefined' &&
			Boolean(window.wp?.media)
		);
	}
	if (editor.takeover) {
		return false;
	}
	const allSelectors = [
		...(row.selectors || []),
		...(row.fallbackSelectors || []),
	];
	if (row.requiresProOnly) {
		if (!isAddNewProFeatureEntitled(row, editor)) {
			return false;
		}
		return firstPresent(row.selectors) !== null;
	}
	if (row.extensionSlug) {
		const { allowed } = resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: row.extensionSlug },
			editor
		);
		if (allowed) {
			return firstPresent(row.selectors) !== null;
		}
		return firstPresent(allSelectors) !== null;
	}
	return firstPresent(row.selectors) !== null;
}

/**
 * @param {'needs_pro'|'needs_plan_upgrade'|'needs_enable'|undefined} reason
 */
function addNewMenuBadgeDisplay(reason) {
	switch (reason) {
		case 'needs_pro':
			return {
				text: __('Pro', 'modula-best-grid-gallery'),
				variant: 'pro',
			};
		case 'needs_plan_upgrade':
			return {
				text: __('Upgrade plan', 'modula-best-grid-gallery'),
				variant: 'plan',
			};
		case 'needs_enable':
			return {
				text: __('Enable extension', 'modula-best-grid-gallery'),
				variant: 'extension',
			};
		default:
			return { text: '…', variant: 'muted' };
	}
}

/**
 * @param {ReturnType<typeof getAddNewMenuDefinition>[number] | ReturnType<typeof getTakeoverAddNewMenuDefinition>[number]} row
 * @param {Record<string, unknown>}                                                                                         editor
 * @return {{ text: string, variant: 'pro'|'plan'|'extension'|'muted', hint: string } | null} Disabled-state badge, or null if none.
 */
export function getAddNewRowDisabledBadge(row, editor) {
	if (getAddNewRowActionable(row, editor)) {
		return null;
	}
	if (editor.takeover && row.reactFlow === 'content-block') {
		if (!Number(editor.galleryId)) {
			return {
				text: __('Unavailable', 'modula-best-grid-gallery'),
				variant: 'muted',
				hint: __(
					'Save the gallery before adding a content block.',
					'modula-best-grid-gallery'
				),
			};
		}
		return null;
	}
	const pro = Boolean(editor.isPro);
	if (editor.takeover && row.reactFlow === 'folder' && pro) {
		if (!editor.folderBrowseRoot) {
			return {
				text: __('Unavailable', 'modula-best-grid-gallery'),
				variant: 'muted',
				hint: __(
					'The server uploads directory could not be resolved.',
					'modula-best-grid-gallery'
				),
			};
		}
	}
	if (
		editor.takeover &&
		row.reactFlow === 'zip' &&
		pro &&
		!(typeof window !== 'undefined' && window.wp?.Uploader && window.jQuery)
	) {
		return {
			text: __('Unavailable', 'modula-best-grid-gallery'),
			variant: 'muted',
			hint: __(
				'WordPress media uploader is not available on this screen.',
				'modula-best-grid-gallery'
			),
		};
	}
	if (editor.takeover && row.id === 'upload') {
		if (!Number(editor.galleryId)) {
			return {
				text: __('Unavailable', 'modula-best-grid-gallery'),
				variant: 'muted',
				hint: __(
					'Save the gallery before uploading images.',
					'modula-best-grid-gallery'
				),
			};
		}
	}
	if (editor.takeover && row.id === 'library') {
		if (!Number(editor.galleryId)) {
			return {
				text: __('Unavailable', 'modula-best-grid-gallery'),
				variant: 'muted',
				hint: __(
					'Save the gallery before adding images from the library.',
					'modula-best-grid-gallery'
				),
			};
		}
		if (!(typeof window !== 'undefined' && window.wp?.media)) {
			return {
				text: __('Unavailable', 'modula-best-grid-gallery'),
				variant: 'muted',
				hint: __(
					'WordPress media library is not available on this screen.',
					'modula-best-grid-gallery'
				),
			};
		}
	}
	if (
		editor.takeover &&
		(row.reactFlow === 'content-galleries' ||
			row.reactFlow === 'instagram' ||
			row.reactFlow === 'video' ||
			row.reactFlow === 'video-playlist') &&
		row.extensionSlug
	) {
		if (!Number(editor.galleryId)) {
			return {
				text: __('Unavailable', 'modula-best-grid-gallery'),
				variant: 'muted',
				hint: __(
					'Save the gallery before importing from content.',
					'modula-best-grid-gallery'
				),
			};
		}
		if (!pro) {
			const d = addNewMenuBadgeDisplay('needs_pro');
			return {
				text: d.text,
				variant: d.variant,
				hint: gateLockHint('needs_pro'),
			};
		}
		const { allowed, reason } = resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: row.extensionSlug },
			editor
		);
		if (allowed || !reason) {
			return null;
		}
		const d = addNewMenuBadgeDisplay(reason);
		return {
			text: d.text,
			variant: d.variant,
			hint: gateLockHint(reason),
		};
	}
	if (editor.takeover) {
		if (row.requiresProOnly && !isAddNewProFeatureEntitled(row, editor)) {
			const d = addNewMenuBadgeDisplay('needs_pro');
			return {
				text: d.text,
				variant: d.variant,
				hint: gateLockHint('needs_pro'),
			};
		}
		return null;
	}
	if (row.requiresProOnly && !isAddNewProFeatureEntitled(row, editor)) {
		const d = addNewMenuBadgeDisplay('needs_pro');
		return {
			text: d.text,
			variant: d.variant,
			hint: gateLockHint('needs_pro'),
		};
	}
	if (row.requiresProOnly && pro && !firstPresent(row.selectors)) {
		return null;
	}
	if (row.extensionSlug) {
		const { allowed, reason } = resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: row.extensionSlug },
			editor
		);
		if (allowed) {
			return null;
		}
		const allSelectors = [
			...(row.selectors || []),
			...(row.fallbackSelectors || []),
		];
		if (firstPresent(allSelectors)) {
			return null;
		}
		if (!reason) {
			return null;
		}
		const d = addNewMenuBadgeDisplay(reason);
		return {
			text: d.text,
			variant: d.variant,
			hint: gateLockHint(reason),
		};
	}
	return null;
}

/**
 * @param {ReturnType<typeof getAddNewMenuDefinition>[number]} row
 */
export function triggerAddNewRow(row) {
	const editor = getModulaSettingsEditorConfig();
	const allSelectors = [
		...(row.selectors || []),
		...(row.fallbackSelectors || []),
	];
	let target = null;
	if (row.requiresProOnly) {
		if (!isAddNewProFeatureEntitled(row, editor)) {
			return;
		}
		target = firstPresent(row.selectors);
	} else if (row.extensionSlug) {
		const { allowed } = resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: row.extensionSlug },
			editor
		);
		if (allowed) {
			target = firstPresent(row.selectors);
		}
		if (!target) {
			target = firstPresent(allSelectors);
		}
	} else {
		target = firstPresent(row.selectors);
	}
	target?.click();
}
