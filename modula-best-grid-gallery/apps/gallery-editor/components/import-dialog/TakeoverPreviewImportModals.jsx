/**
 * Mounts takeover Add New import flows: folder, ZIP, and registry-driven extension modals.
 * Folder/ZIP implementations are registered by Pro (`window.modula.proCore`).
 */
import { Spinner } from '@wordpress/components';
import { useExtensionImportHost } from '../../platform/ExtensionImportHostContext';
import { getAddNewEntitlements } from '../../utils/addNewEntitlements';
import { useProCoreRegistration } from '../../hooks/useProCoreRegistration';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';
import TakeoverExtensionImportModals from './TakeoverExtensionImportModals';

function ImportModalFallback() {
	return (
		<div
			className="modula-import-dialog__spinner-wrap modula-import-dialog__lazy-fallback"
			role="status"
			aria-live="polite"
		>
			<Spinner />
		</div>
	);
}

/**
 * @param {{
 *   galleryId: number,
 *   editor: {
 *     isPro?: boolean,
 *     folderBrowseRoot?: string,
 *     extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }>,
 *   },
 *   openFlow: 'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist' | null,
 *   onClose: () => void,
 *   zipSession: ReturnType<import('../../hooks/useTakeoverZipImportSession').useTakeoverZipImportSession>,
 * }} props
 */
export default function TakeoverPreviewImportModals({
	galleryId,
	editor,
	openFlow,
	onClose,
	zipSession,
}) {
	const { uploadPosition, invalidateBootstrap } = useExtensionImportHost();
	const proCore = useProCoreRegistration();
	const FolderImportModal = proCore?.FolderImportModal;
	const addNewEntitlements = getAddNewEntitlements(editor);
	const folderZipAllowed =
		(openFlow === 'folder' && addNewEntitlements.folderImport) ||
		(openFlow === 'zip' && addNewEntitlements.zipImport);

	if (!galleryId || !openFlow) {
		return null;
	}

	if ((openFlow === 'folder' || openFlow === 'zip') && !folderZipAllowed) {
		return null;
	}

	if (openFlow === 'folder') {
		if (!FolderImportModal) {
			return null;
		}
		return (
			<LazySettingsEditorBoundary fallback={<ImportModalFallback />}>
				<FolderImportModal
					isOpen
					onClose={onClose}
					galleryId={galleryId}
					rootPath={editor.folderBrowseRoot || ''}
					uploadPosition={uploadPosition}
					onImported={invalidateBootstrap}
				/>
			</LazySettingsEditorBoundary>
		);
	}

	if (openFlow === 'zip') {
		return (
			<LazySettingsEditorBoundary fallback={<ImportModalFallback />}>
				<TakeoverZipImportFlow
					galleryId={galleryId}
					uploadPosition={uploadPosition}
					onClose={onClose}
					zipSession={zipSession}
					ZipImporter={proCore?.ZipImporter}
					ZipImportModal={proCore?.ZipImportModal}
				/>
			</LazySettingsEditorBoundary>
		);
	}

	return (
		<TakeoverExtensionImportModals
			galleryId={galleryId}
			editor={editor}
			openFlow={openFlow}
			onClose={onClose}
		/>
	);
}

/**
 * @param {{
 *   galleryId: number,
 *   uploadPosition: 'start' | 'end',
 *   onClose: () => void,
 *   zipSession: ReturnType<import('../../hooks/useTakeoverZipImportSession').useTakeoverZipImportSession>,
 *   ZipImporter?: import('react').ComponentType<Record<string, unknown>>,
 *   ZipImportModal?: import('react').ComponentType<Record<string, unknown>>,
 * }} props
 */
function TakeoverZipImportFlow({
	galleryId,
	uploadPosition,
	onClose,
	zipSession,
	ZipImporter,
	ZipImportModal,
}) {
	const {
		zipImporterRef,
		zipStatus,
		setZipStatus,
		zipError,
		setZipError,
		zipDeleteAfter,
		setZipDeleteAfter,
		handleZipSuccess,
	} = zipSession;

	if (!ZipImporter || !ZipImportModal) {
		return null;
	}

	return (
		<>
			<ZipImporter
				ref={zipImporterRef}
				galleryId={galleryId}
				uploadPosition={uploadPosition}
				deleteAfterUpload={zipDeleteAfter}
				onBusy={() => {}}
				onStatus={setZipStatus}
				onSuccess={handleZipSuccess}
				onError={(msg) => {
					setZipError(msg);
				}}
			/>
			<ZipImportModal
				isOpen
				onClose={onClose}
				zipDeleteAfter={zipDeleteAfter}
				onZipDeleteAfterChange={setZipDeleteAfter}
				zipError={zipError}
				zipStatus={zipStatus}
				onChooseZip={() => {
					setZipError('');
					setZipStatus('');
					zipImporterRef.current?.openFileDialog();
				}}
			/>
		</>
	);
}
