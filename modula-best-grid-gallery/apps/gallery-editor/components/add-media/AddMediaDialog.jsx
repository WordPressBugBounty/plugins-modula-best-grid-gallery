/**
 * Modula's Add media dialog (spec item 18): Upload files, Media library and
 * Video link, replacing the WordPress media frame. Items are added through
 * today's paths: REST upload then `add-images`, `add-images` for library
 * picks, and the Video extension's own import flow for links. New items go
 * to the configured insert position ("New images go to the…").
 */
import './_add-media-dialog.scss';
import { useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Dialog, Notice, PlanBadge, TabList, TabPanel } from 'admin-ui';
import { AdminUiScope, useTakeoverSaveStatus } from 'editor-shell';
import {
	ADD_MEDIA_TABS,
	useAddMediaDialog,
} from '../../context/addMediaDialogStore';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import {
	addAttachmentsToGallery,
	uploadBrowserImageFilesToGallery,
} from '../../api/galleryUploadApi';
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
	const { form } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);
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
	 * Runs one add; the dialog closes when it succeeds and shows the error
	 * when it fails.
	 *
	 * @param {() => Promise<unknown>} task
	 * @param {string}                 fallbackError
	 */
	const runAdd = async (task, fallbackError) => {
		setBusy(true);
		setError('');
		try {
			await task();
			invalidateBootstrap();
			closeAddMedia();
		} catch (err) {
			setError(errorMessage(err, fallbackError));
		} finally {
			setBusy(false);
			setUploadProgress(null);
		}
	};

	const uploadFiles = (uploadPosition, files) =>
		runAdd(
			async () => {
				const { ids } = await uploadBrowserImageFilesToGallery(
					galleryId,
					files,
					{
						uploadPosition,
						onProgress: (current, total) =>
							setUploadProgress({ current, total }),
					},
					runPersistTask
				);
				if (!ids.length) {
					throw new Error(
						__(
							'No images could be uploaded.',
							'modula-best-grid-gallery'
						)
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
			() =>
				addAttachmentsToGallery(
					galleryId,
					ids,
					uploadPosition,
					runPersistTask
				),
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
