/**
 * Gallery editor top bar: gallery copy, settings history, embed rows and save
 * state for the shared takeover top bar.
 */
import { __ } from '@wordpress/i18n';
import { TakeoverTopBar, useTakeoverSaveStatus } from 'editor-shell';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import { buildGalleryEmbedRows } from '../../utils/galleryEmbedRows';

const LABELS = {
	back: __('Back', 'modula-best-grid-gallery'),
	backAriaLabel: __('Back to Galleries', 'modula-best-grid-gallery'),
	titlePlaceholder: __('Untitled gallery', 'modula-best-grid-gallery'),
	titleAriaLabel: __('Gallery title', 'modula-best-grid-gallery'),
	editTitleLabel: __('Rename gallery', 'modula-best-grid-gallery'),
};

const HISTORY_LABELS = {
	heading: __('Settings history', 'modula-best-grid-gallery'),
	clearConfirmMessage: __(
		'Past and future steps are removed. Your current settings stay as they are.',
		'modula-best-grid-gallery'
	),
};

/**
 * @param {number} galleryId
 * @return {Object|null} Embed input, or null without a gallery.
 */
function getGalleryEmbed(galleryId) {
	const rows = buildGalleryEmbedRows(
		galleryId,
		getModulaSettingsEditorConfig()?.galleryShortcodes?.rows
	);
	if (rows.length === 0) {
		return null;
	}

	return {
		heading: __('Embed this gallery', 'modula-best-grid-gallery'),
		rows,
	};
}

/**
 * @param {Object}                                    props
 * @param {number}                                    props.galleryId
 * @param {string}                                    props.postTitle
 * @param {(title: string) => void}                   props.onPostTitleChange
 * @param {(value?: string) => void}                  [props.onPostTitleCommit]
 * @param {boolean}                                   [props.titleDisabled]
 * @param {string}                                    props.adminUrl
 * @param {string}                                    [props.newGalleryUrl]          New gallery in the new editor; empty hides the "+".
 * @param {Object}                                    [props.history]                Settings undo stack (`undoRedo` of the form bundle); without it only the save state shows.
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
	newGalleryUrl = '',
	history = null,
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
			history={history}
			historyLabels={history ? HISTORY_LABELS : null}
			embed={getGalleryEmbed(galleryId)}
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
			addNew={
				newGalleryUrl
					? {
							href: newGalleryUrl,
							label: __(
								'New gallery',
								'modula-best-grid-gallery'
							),
						}
					: null
			}
		/>
	);
}
