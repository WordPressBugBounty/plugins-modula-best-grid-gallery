/**
 * Gallery editor top bar: gallery copy, shortcodes and save state for the shared takeover top bar.
 *
 * Also exposed to Pro (proofing takeover) through the settings-editor host; keep the props stable.
 */
import { __ } from '@wordpress/i18n';
import { TakeoverTopBar, useTakeoverSaveStatus } from 'editor-shell';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import BoundGalleryBadge from './BoundGalleryBadge';

const LABELS = {
	back: __('Galleries', 'modula-best-grid-gallery'),
	backAriaLabel: __('Back to Galleries', 'modula-best-grid-gallery'),
	titlePlaceholder: __('Untitled gallery', 'modula-best-grid-gallery'),
	titleAriaLabel: __('Gallery title', 'modula-best-grid-gallery'),
	editTitleLabel: __('Edit gallery title', 'modula-best-grid-gallery'),
};

/**
 * Primary `[modula id]` chip plus the extra rows PHP provides (Pro).
 *
 * @param {number} galleryId
 * @return {Object|null} `TopBarShortcodes` props, or null without a gallery.
 */
function getGalleryShortcodes(galleryId) {
	const id = Number(galleryId);
	if (!id) {
		return null;
	}

	const raw = getModulaSettingsEditorConfig()?.galleryShortcodes;
	const rows = Array.isArray(raw?.rows) ? raw.rows : [];
	const primary = rows[0];
	const primaryCodeFromPhp = primary?.code ? String(primary.code) : '';

	return {
		primaryCode: primaryCodeFromPhp || `[modula id="${id}"]`,
		primaryLabel:
			primary?.label || __('Embed gallery', 'modula-best-grid-gallery'),
		copyLabel: __('Copy gallery shortcode', 'modula-best-grid-gallery'),
		extraRows: rows.slice(1),
		extrasHeading: __('Use this gallery', 'modula-best-grid-gallery'),
		extrasTabsLabel: __(
			'Gallery links and shortcodes',
			'modula-best-grid-gallery'
		),
	};
}

/**
 * @param {Object}                                    props
 * @param {number}                                    props.galleryId
 * @param {string}                                    props.postTitle
 * @param {(title: string) => void}                   props.onPostTitleChange
 * @param {(value?: string) => void}                  props.onPostTitleCommit
 * @param {boolean}                                   props.titleDisabled
 * @param {string}                                    props.adminUrl
 * @param {import('react').ReactNode}                 [props.undoRedoControls]
 * @param {string}                                    [props.documentStatus]
 * @param {string}                                    [props.documentStatusLabel]
 * @param {Array<{ value?: string, label?: string }>} [props.documentStatusChoices]
 * @param {(status: string, label: string) => void}   [props.onDocumentStatusChange]
 * @param {boolean}                                   [props.documentStatusBusy]
 * @param {boolean}                                   [props.canEditDocumentStatus]
 */
export default function GalleryTakeoverTopBar({
	galleryId,
	postTitle,
	onPostTitleChange,
	onPostTitleCommit,
	titleDisabled = false,
	adminUrl,
	undoRedoControls = null,
	documentStatus = '',
	documentStatusLabel = '',
	documentStatusChoices = [],
	onDocumentStatusChange,
	documentStatusBusy = false,
	canEditDocumentStatus = false,
}) {
	const { status, saveErrorMessage } = useTakeoverSaveStatus();
	const showDocumentStatus =
		typeof onDocumentStatusChange === 'function' && canEditDocumentStatus;

	return (
		<TakeoverTopBar
			labels={LABELS}
			backUrl={adminUrl}
			canEditTitle={Boolean(galleryId)}
			title={postTitle}
			onTitleChange={onPostTitleChange}
			onTitleCommit={onPostTitleCommit}
			titleDisabled={titleDisabled}
			saveStatus={{ status, errorMessage: saveErrorMessage }}
			afterSaveStatus={<BoundGalleryBadge />}
			undoRedoControls={undoRedoControls}
			shortcodes={getGalleryShortcodes(galleryId)}
			documentStatus={
				showDocumentStatus
					? {
							status: documentStatus,
							label: documentStatusLabel,
							choices: documentStatusChoices,
							onChange: onDocumentStatusChange,
							busy: documentStatusBusy,
						}
					: null
			}
		/>
	);
}
