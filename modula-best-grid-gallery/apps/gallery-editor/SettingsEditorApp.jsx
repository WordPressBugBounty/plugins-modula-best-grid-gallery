/**
 * Gallery settings v2 — app entry: loading/error states and WordPress component shell.
 */
import { __ } from '@wordpress/i18n';
import { Spinner, Notice } from '@wordpress/components';
import { useMemo, useLayoutEffect } from '@wordpress/element';
import { DESKTOP_EDITOR_MEDIA_QUERY } from './constants/desktopEditorViewport';
import { useGallerySettingsV2Query } from './query/useGallerySettingsV2Query';
import { useModulaSettingsEditorConfig } from './hooks/useModulaSettingsEditorConfig';
import { useMatchMedia } from './hooks/useMatchMedia';
import { resolveGalleryAdminPostId } from './utils/resolveGalleryAdminPostId';
import { syncGalleryAdminEditUrl } from './utils/syncGalleryAdminEditUrl';
import GallerySettingsEditorLoaded from './components/shell/GallerySettingsEditorLoaded';
import DesktopOnlyNotice from './components/shell/DesktopOnlyNotice';
import SettingsEditorErrorBoundary from './components/shell/SettingsEditorErrorBoundary';
import {
	SettingsEditorAppearanceProvider,
	useSettingsEditorAppearance,
} from './context/SettingsEditorAppearanceContext';

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
	const isTakeover = Boolean(config.takeover);
	const isDesktopEditor = useMatchMedia(DESKTOP_EDITOR_MEDIA_QUERY);
	const canLoadEditor = !isTakeover || isDesktopEditor;
	const showRestDebug = Boolean(config.showRestDebug);

	useLayoutEffect(() => {
		if (galleryId > 0) {
			syncGalleryAdminEditUrl(galleryId);
		}
	}, [galleryId]);

	const { data, error, isPending, isError, isSuccess } =
		useGallerySettingsV2Query(canLoadEditor ? galleryId : 0);

	if (isTakeover && !isDesktopEditor) {
		return (
			<div
				className="modula-settings-editor__app"
				data-appearance={appearance}
			>
				<DesktopOnlyNotice />
			</div>
		);
	}

	if (!galleryId) {
		return (
			<Notice status="warning" isDismissible={false}>
				{__(
					'Save the gallery first to load settings (v2).',
					'modula-best-grid-gallery'
				)}
			</Notice>
		);
	}

	const errorMessage =
		isError && (error?.message || error?.data?.message || String(error));

	return (
		<div
			className="modula-settings-editor__app"
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
						<Spinner />
						<span>
							{__(
								'Loading settings…',
								'modula-best-grid-gallery'
							)}
						</span>
					</div>
				)}
				{isError && (
					<Notice status="error" isDismissible={false}>
						{errorMessage}
					</Notice>
				)}
				{isSuccess && data && (
					<>
						<GallerySettingsEditorLoaded
							galleryId={galleryId}
							groupedPayload={data}
						/>
						{!isTakeover && showRestDebug && (
							<details className="modula-settings-editor__raw">
								<summary>
									{__(
										'Raw REST payload (debug)',
										'modula-best-grid-gallery'
									)}
								</summary>
								<pre className="modula-settings-editor__raw-pre">
									{JSON.stringify(data, null, 2)}
								</pre>
							</details>
						)}
					</>
				)}
			</SettingsEditorErrorBoundary>
		</div>
	);
}
