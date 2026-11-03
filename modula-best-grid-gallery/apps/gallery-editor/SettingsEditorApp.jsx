/**
 * Gallery settings v2 — app entry: loading/error states and the editor shell.
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useLayoutEffect } from '@wordpress/element';
import { BrandLoader, Notice } from 'admin-ui';
import {
	AdminUiScope,
	DesktopOnlyNotice,
	SettingsEditorAppearanceProvider,
	SettingsEditorErrorBoundary,
	useSettingsEditorAppearance,
} from 'editor-shell';
import { DESKTOP_EDITOR_MEDIA_QUERY } from 'editor-shell/logic';
import { useGallerySettingsV2Query } from './query/useGallerySettingsV2Query';
import { useModulaSettingsEditorConfig } from './hooks/useModulaSettingsEditorConfig';
import { useMatchMedia } from './hooks/useMatchMedia';
import { resolveGalleryAdminPostId } from './utils/resolveGalleryAdminPostId';
import { syncGalleryAdminEditUrl } from './utils/syncGalleryAdminEditUrl';
import { getGalleryListUrl } from './utils/galleryAdminUrls';
import GallerySettingsEditorLoaded from './components/shell/GallerySettingsEditorLoaded';

export default function SettingsEditorApp() {
	return (
		<SettingsEditorAppearanceProvider>
			<SettingsEditorAppInner />
		</SettingsEditorAppearanceProvider>
	);
}

function SettingsEditorAppInner() {
	const { appearance } = useSettingsEditorAppearance();
	const config = useModulaSettingsEditorConfig();
	const galleryId = useMemo(
		() => resolveGalleryAdminPostId(config),
		[config]
	);
	const isDesktopEditor = useMatchMedia(DESKTOP_EDITOR_MEDIA_QUERY);

	useLayoutEffect(() => {
		if (galleryId > 0) {
			syncGalleryAdminEditUrl(galleryId);
		}
	}, [galleryId]);

	const { data, error, isPending, isError, isSuccess } =
		useGallerySettingsV2Query(isDesktopEditor ? galleryId : 0);

	if (!isDesktopEditor) {
		return (
			<div
				className="modula-settings-editor__app modula-takeover__app"
				data-appearance={appearance}
			>
				<DesktopOnlyNotice
					backUrl={getGalleryListUrl(config)}
					message={__(
						'The gallery editor is a desktop experience. Open this page on a computer to continue.',
						'modula-best-grid-gallery'
					)}
				/>
			</div>
		);
	}

	if (!galleryId) {
		return (
			<AdminUiScope>
				<Notice>
					{__(
						'Save the gallery first to load settings (v2).',
						'modula-best-grid-gallery'
					)}
				</Notice>
			</AdminUiScope>
		);
	}

	const errorMessage =
		isError && (error?.message || error?.data?.message || String(error));

	return (
		<div
			className="modula-settings-editor__app modula-takeover__app"
			data-appearance={appearance}
		>
			<SettingsEditorErrorBoundary>
				{isPending && (
					<div
						className="modula-settings-editor__status"
						role="status"
						aria-live="polite"
						aria-busy="true"
					>
						<AdminUiScope>
							<BrandLoader
								label={__(
									'Loading settings…',
									'modula-best-grid-gallery'
								)}
							/>
						</AdminUiScope>
					</div>
				)}
				{isError && (
					<AdminUiScope>
						<Notice tone="error" role="alert">
							{errorMessage}
						</Notice>
					</AdminUiScope>
				)}
				{isSuccess && data && (
					<GallerySettingsEditorLoaded
						galleryId={galleryId}
						groupedPayload={data}
					/>
				)}
			</SettingsEditorErrorBoundary>
		</div>
	);
}
