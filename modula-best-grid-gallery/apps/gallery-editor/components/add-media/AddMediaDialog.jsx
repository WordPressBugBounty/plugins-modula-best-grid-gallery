/**
 * Modula's Add media dialog (spec item 18): Upload files, Media library and
 * Video link, replacing the WordPress media frame. Uploads go to the Media
 * Library at once; uploaded files and library picks then join the gallery as
 * unsaved changes: the item-rows route builds their rows and the editor save
 * stores them (ADR 0059). Links use the Video extension's own import flow.
 * New items go to the configured insert position ("New images go to the…").
 */
import './_add-media-dialog.scss';
import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Dialog, Notice, PlanBadge, TabList, TabPanel } from 'admin-ui';
import { AdminUiScope, useTakeoverToast } from 'editor-shell';
import {
	ADD_MEDIA_TABS,
	useAddMediaDialog,
} from '../../context/addMediaDialogStore';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import { uploadBrowserImageFilesToMediaLibrary } from '../../api/galleryUploadApi';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import {
	addAttachmentsToPreviewCatalog,
	workingTileLayout,
} from '../../utils/galleryItemRowsCommit';
import { resolveVideoLinkAvailability } from './addMediaAvailability';
import AddMediaUploadTab from './AddMediaUploadTab';
import AddMediaLibraryTab from './AddMediaLibraryTab';
import AddMediaVideoLinkTab from './AddMediaVideoLinkTab';

/**
 * @param {unknown} error
 * @param {string}  fallback
 * @return {string} A message for the dialog's error notice.
 */
function errorMessage(error, fallback) {
	const message = error?.message || error?.data?.message;
	return typeof message === 'string' && message.trim() !== ''
		? message
		: fallback;
}

export default function AddMediaDialog() {
	const { isOpen, openTab, openAddMedia, closeAddMedia } =
		useAddMediaDialog();
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const toast = useTakeoverToast();
	const tabsId = `modula-add-media-${useId()}`;
	const [busy, setBusy] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(
		/** @type {{ current: number, total: number }|null} */ (null)
	);
	const [error, setError] = useState('');
	const videoLink = resolveVideoLinkAvailability(config);
	// While closed the dialog renders no body, so any tab will do.
	const tab = openTab ?? 'library';

	const tabLabels = {
		upload: __('Upload files', 'modula-best-grid-gallery'),
		library: __('Media library', 'modula-best-grid-gallery'),
		link: __('Video link', 'modula-best-grid-gallery'),
	};
	const videoLinkBadge = videoLink.available ? null : (
		<PlanBadge
			plan={__('PRO', 'modula-best-grid-gallery')}
			tone="outline"
			lock
		/>
	);
	const tabs = ADD_MEDIA_TABS.map((value) => ({
		value,
		label: tabLabels[value],
		badge: value === 'link' ? videoLinkBadge : null,
	}));

	// While an add runs the dialog stays open, so its progress and any
	// error stay in view.
	const close = () => {
		if (busy) {
			return;
		}
		setError('');
		closeAddMedia();
	};

	/**
	 * Runs one add; the dialog closes when it succeeds. A failure stays in
	 * the dialog's notice and the editor's error toast, and the gallery is
	 * unchanged.
	 *
	 * @param {() => Promise<unknown>} task
	 * @param {string}                 fallbackError
	 */
	const runAdd = async (task, fallbackError) => {
		setBusy(true);
		setError('');
		try {
			await task();
			closeAddMedia();
		} catch (err) {
			const message = errorMessage(err, fallbackError);
			setError(message);
			toast?.show({ message, tone: 'error' });
		} finally {
			setBusy(false);
			setUploadProgress(null);
		}
	};

	/**
	 * Put attachments in the gallery as an unsaved change (nothing is
	 * stored until Save).
	 *
	 * @param {number[]}      ids
	 * @param {'start'|'end'} uploadPosition
	 */
	const addToCatalog = (ids, uploadPosition) => {
		const store = getGalleryPreviewReduxStore();
		if (!store) {
			throw new Error(
				__(
					'The gallery preview is not ready.',
					'modula-best-grid-gallery'
				)
			);
		}
		return addAttachmentsToPreviewCatalog({
			store,
			galleryId,
			attachmentIds: ids,
			position: uploadPosition,
			layout: workingTileLayout(form.state.values),
			commitItemsStep: undoRedo.commitItemsStep,
		});
	};

	const uploadFiles = (uploadPosition, files) =>
		runAdd(
			async () => {
				const { ids } = await uploadBrowserImageFilesToMediaLibrary(
					files,
					{
						onProgress: (current, total) =>
							setUploadProgress({ current, total }),
					}
				);
				if (!ids.length) {
					throw new Error(
						__(
							'No images could be uploaded.',
							'modula-best-grid-gallery'
						)
					);
				}
				try {
					await addToCatalog(ids, uploadPosition);
				} catch (err) {
					// The files are stored already; only joining the gallery failed.
					throw new Error(
						__(
							'The files are in the Media Library, but could not be added to the gallery.',
							'modula-best-grid-gallery'
						),
						{ cause: err }
					);
				}
			},
			__(
				'Could not add images to the gallery.',
				'modula-best-grid-gallery'
			)
		);

	const addFromLibrary = (uploadPosition, ids) =>
		runAdd(
			() => addToCatalog(ids, uploadPosition),
			__(
				'Could not add images to the gallery.',
				'modula-best-grid-gallery'
			)
		);

	return (
		<AdminUiScope>
			<form.Subscribe
				selector={(s) =>
					s.values?.general?.uploadPosition === 'start'
						? 'start'
						: 'end'
				}
			>
				{(uploadPosition) => (
					<Dialog
						open={isOpen}
						onClose={close}
						title={__(
							'Add images and videos',
							'modula-best-grid-gallery'
						)}
						className="modula-add-media"
						closeDisabled={busy}
						headerContent={
							<TabList
								id={tabsId}
								label={__(
									'Add from',
									'modula-best-grid-gallery'
								)}
								tabs={tabs}
								value={tab}
								onChange={openAddMedia}
							/>
						}
					>
						<TabPanel
							id={tabsId}
							tabs={tabs}
							value={tab}
							className="modula-add-media__panel"
						>
							{error ? (
								<Notice
									tone="error"
									role="alert"
									className="modula-add-media__error"
								>
									{error}
								</Notice>
							) : null}
							{/* Hidden, not unmounted: a selection or an upload survives a tab switch. */}
							<div
								className="modula-add-media__tab"
								hidden={tab !== 'upload'}
							>
								<AddMediaUploadTab
									busy={busy}
									progress={uploadProgress}
									onFiles={(files) =>
										void uploadFiles(uploadPosition, files)
									}
								/>
							</div>
							<div
								className="modula-add-media__tab"
								hidden={tab !== 'library'}
							>
								<AddMediaLibraryTab
									busy={busy}
									onAdd={(ids) =>
										void addFromLibrary(uploadPosition, ids)
									}
								/>
							</div>
							<div
								className="modula-add-media__tab"
								hidden={tab !== 'link'}
							>
								<AddMediaVideoLinkTab
									availability={videoLink}
									onLeave={close}
								/>
							</div>
						</TabPanel>
					</Dialog>
				)}
			</form.Subscribe>
		</AdminUiScope>
	);
}
