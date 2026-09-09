/**
 * Bound gallery badge — top-bar chrome + hidden-from-gallery list / Restore.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, lock, external } from '@wordpress/icons';
import {
	getModulaSettingsEditorConfig,
	patchModulaSettingsEditorConfig,
} from '../../config/modulaSettingsEditorConfig';
import {
	getBoundGallerySummaryFromEditor,
	isBoundGallerySummary,
} from '../../utils/boundGalleryChromePolicy';
import { restoreBoundGalleryExclusion } from '../../api/boundGalleryApi';
import { useInvalidateGalleryBootstrap } from '../../hooks/useInvalidateGalleryBootstrap';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';

export default function BoundGalleryBadge() {
	const editor = getModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editor);
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);
	const [summary, setSummary] = useState(() =>
		getBoundGallerySummaryFromEditor(editor)
	);
	const [open, setOpen] = useState(false);
	const [restoreBusyId, setRestoreBusyId] = useState(0);
	const wrapRef = useRef(/** @type {HTMLDivElement|null} */ (null));

	useEffect(() => {
		setSummary(
			getBoundGallerySummaryFromEditor(getModulaSettingsEditorConfig())
		);
	}, [editor.boundGallery]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onDoc = (e) => {
			const el = wrapRef.current;
			if (el && e.target instanceof Node && !el.contains(e.target)) {
				setOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', onDoc, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const entitled = Boolean(summary?.entitled);
	const missing = Boolean(summary?.missing);
	const displayName = String(summary?.displayName || '');
	const targetType = String(summary?.targetType || '');
	const openUrl =
		typeof summary?.openInMediaLibraryUrl === 'string'
			? summary.openInMediaLibraryUrl
			: '';
	const hiddenItems = useMemo(
		() => (Array.isArray(summary?.hiddenItems) ? summary.hiddenItems : []),
		[summary]
	);

	const typeLabel =
		targetType === 'remote_prefix'
			? __('Remote prefix', 'modula-best-grid-gallery')
			: __('Media folder', 'modula-best-grid-gallery');

	const badgeLabel = missing
		? __('Bound target missing', 'modula-best-grid-gallery')
		: sprintf(
				/* translators: %s: bind target name */
				__('Bound to %s', 'modula-best-grid-gallery'),
				displayName || __('bind target', 'modula-best-grid-gallery')
			);

	const upgradeUrl =
		typeof editor.upgradeUrl === 'string' && editor.upgradeUrl !== ''
			? editor.upgradeUrl
			: 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=editor&utm_campaign=bound-gallery';

	const onRestore = useCallback(
		async (attachmentId) => {
			if (!entitled || !attachmentId || restoreBusyId) {
				return;
			}
			setRestoreBusyId(attachmentId);
			try {
				const nextHidden = await restoreBoundGalleryExclusion(
					galleryId,
					attachmentId
				);
				const next = {
					...summary,
					hiddenItems: nextHidden,
				};
				setSummary(
					/** @type {import('../../utils/boundGalleryChromePolicy').BoundGallerySummary} */ (
						next
					)
				);
				patchModulaSettingsEditorConfig({ boundGallery: next });
				invalidateBootstrap();
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(err);
			} finally {
				setRestoreBusyId(0);
			}
		},
		[entitled, galleryId, invalidateBootstrap, restoreBusyId, summary]
	);

	if (!isBoundGallerySummary(summary)) {
		return null;
	}

	return (
		<div
			ref={wrapRef}
			className={`modula-gallery-takeover__bound-badge${
				entitled ? '' : ' is-locked'
			}${missing ? ' is-missing' : ''}`}
		>
			<button
				type="button"
				className="modula-gallery-takeover__bound-badge-trigger"
				aria-expanded={open}
				aria-haspopup="dialog"
				onClick={() => setOpen((v) => !v)}
			>
				{!entitled ? (
					<span
						className="modula-gallery-takeover__bound-badge-lock"
						aria-hidden="true"
					>
						<Icon icon={lock} size={14} />
					</span>
				) : null}
				<span className="modula-gallery-takeover__bound-badge-label">
					{badgeLabel}
				</span>
			</button>
			{open ? (
				<div
					className="modula-gallery-takeover__bound-badge-popover"
					role="dialog"
					aria-label={__('Bound gallery', 'modula-best-grid-gallery')}
				>
					{!entitled ? (
						<div className="modula-gallery-takeover__bound-badge-upsell">
							<p>
								{__(
									'Bound gallery chrome requires Modula Pro. Derive-merge and exclusions still apply.',
									'modula-best-grid-gallery'
								)}
							</p>
							<a
								className="modula-gallery-takeover__bound-badge-upsell-link"
								href={upgradeUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								{__('Upgrade to Pro', 'modula-best-grid-gallery')}
							</a>
						</div>
					) : (
						<>
							<div className="modula-gallery-takeover__bound-badge-meta">
								<p className="modula-gallery-takeover__bound-badge-name">
									{missing
										? __(
												'Bound target missing',
												'modula-best-grid-gallery'
											)
										: sprintf(
												/* translators: %s: bind target name */
												__(
													'Bound to %s',
													'modula-best-grid-gallery'
												),
												displayName
											)}
								</p>
								<p className="modula-gallery-takeover__bound-badge-type">
									{typeLabel}
								</p>
								{!missing && openUrl ? (
									<a
										className="modula-gallery-takeover__bound-badge-open"
										href={openUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										<span>
											{__(
												'Open in Media Library',
												'modula-best-grid-gallery'
											)}
										</span>
										<Icon icon={external} size={14} />
									</a>
								) : null}
							</div>
							<div className="modula-gallery-takeover__bound-badge-hidden">
								<h3 className="modula-gallery-takeover__bound-badge-hidden-title">
									{__(
										'Hidden from this gallery',
										'modula-best-grid-gallery'
									)}
								</h3>
								{hiddenItems.length === 0 ? (
									<p className="modula-gallery-takeover__bound-badge-hidden-empty">
										{__(
											'No hidden images.',
											'modula-best-grid-gallery'
										)}
									</p>
								) : (
									<ul className="modula-gallery-takeover__bound-badge-hidden-list">
										{hiddenItems.map((item) => {
											const id = Number(item?.id) || 0;
											const title =
												typeof item?.title === 'string'
													? item.title
													: sprintf(
															/* translators: %d: attachment id */
															__(
																'Attachment #%d',
																'modula-best-grid-gallery'
															),
															id
														);
											const thumb =
												typeof item?.thumbnailUrl ===
												'string'
													? item.thumbnailUrl
													: '';
											return (
												<li
													key={id}
													className="modula-gallery-takeover__bound-badge-hidden-row"
												>
													{thumb ? (
														<img
															src={thumb}
															alt=""
															className="modula-gallery-takeover__bound-badge-hidden-thumb"
														/>
													) : (
														<span
															className="modula-gallery-takeover__bound-badge-hidden-thumb is-empty"
															aria-hidden="true"
														/>
													)}
													<span className="modula-gallery-takeover__bound-badge-hidden-name">
														{title}
													</span>
													<button
														type="button"
														className="modula-gallery-takeover__bound-badge-restore"
														disabled={
															restoreBusyId === id
														}
														onClick={() => {
															void onRestore(id);
														}}
													>
														{__(
															'Restore',
															'modula-best-grid-gallery'
														)}
													</button>
												</li>
											);
										})}
									</ul>
								)}
							</div>
						</>
					)}
				</div>
			) : null}
		</div>
	);
}
