import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, chevronDown, plus } from '@wordpress/icons';
import {
	getAddNewRowActionable,
	getAddNewRowDisabledBadge,
	getTakeoverAddNewMenuGroups,
} from '../../utils/takeoverAddNewMenuModel';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import { useTakeoverPreviewAddNewMenu } from '../../hooks/useTakeoverPreviewAddNewMenu';

/**
 * @param {{
 *   onOpenPreviewImport?: (reactFlow: 'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist') => void,
 *   onTakeoverOpenUpload?: () => void,
 *   galleryId?: number,
 *   galleryType?: string,
 *   uploadPosition?: string,
 *   onLibraryAdded?: () => void,
 *   onLibraryError?: (msg: string) => void,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
 *   mainLabel?: string,
 * }} props
 */
export default function PreviewAddNewSplit({
	onOpenPreviewImport,
	onTakeoverOpenUpload,
	galleryId = 0,
	galleryType = '',
	uploadPosition = 'end',
	onLibraryAdded,
	onLibraryError,
	runPersistTask,
	mainLabel,
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const wrapRef = useRef(null);

	const closeMenu = () => setMenuOpen(false);

	useEffect(() => {
		if (!menuOpen) {
			return undefined;
		}
		const onDoc = (e) => {
			const el = wrapRef.current;
			if (el && e.target instanceof Node && !el.contains(e.target)) {
				setMenuOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onDoc, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [menuOpen]);

	const editor = getModulaSettingsEditorConfig();
	const { rows, handleRowAction, handlePrimaryAddNew } =
		useTakeoverPreviewAddNewMenu({
			editor,
			galleryId,
			galleryType,
			uploadPosition,
			onOpenPreviewImport,
			onTakeoverOpenUpload,
			onLibraryAdded,
			onLibraryError,
			runPersistTask,
			closeMenu,
		});

	const menuGroups = useMemo(() => {
		if (!editor.takeover) {
			return [{ id: 'default', label: '', rows }];
		}
		const groups = getTakeoverAddNewMenuGroups();
		return groups
			.map((group) => ({
				...group,
				rows: rows.filter((row) => row.group === group.id),
			}))
			.filter((group) => group.rows.length > 0);
	}, [editor.takeover, rows]);

	return (
		<div
			ref={wrapRef}
			className="modula-gallery-takeover__preview-add-split"
		>
			<div className="modula-gallery-takeover__preview-add-split-inner">
				<button
					type="button"
					className="modula-gallery-takeover__preview-add-split-main"
					onClick={handlePrimaryAddNew}
				>
					<Icon icon={plus} size={16} />
					<span>
						{mainLabel || __('Add New', 'modula-best-grid-gallery')}
					</span>
				</button>
				<button
					type="button"
					className="modula-gallery-takeover__preview-add-split-caret"
					aria-expanded={menuOpen}
					aria-haspopup="menu"
					onClick={() => setMenuOpen((o) => !o)}
				>
					<Icon icon={chevronDown} size={16} />
					<span className="screen-reader-text">
						{__('Open add media menu', 'modula-best-grid-gallery')}
					</span>
				</button>
			</div>
			{menuOpen ? (
				<ul
					className="modula-gallery-takeover__preview-add-menu"
					role="menu"
				>
					{menuGroups.map((group) => (
						<li
							key={group.id}
							className="modula-gallery-takeover__preview-add-menu-group"
							role="none"
						>
							{group.label ? (
								<div
									className="modula-gallery-takeover__preview-add-menu-group-label"
									role="presentation"
								>
									{group.label}
								</div>
							) : null}
							<ul
								className="modula-gallery-takeover__preview-add-menu-group-list"
								role="group"
								aria-label={group.label || undefined}
							>
								{group.rows.map((row) => {
									const actionable = getAddNewRowActionable(
										row,
										editor
									);
									const badge = getAddNewRowDisabledBadge(
										row,
										editor
									);
									const ariaHint =
										!actionable && badge
											? sprintf(
													/* translators: 1: action label, 2: requirement note */
													__(
														'%1$s — %2$s',
														'modula-best-grid-gallery'
													),
													row.label,
													badge.hint
												)
											: undefined;
									return (
										<li
											key={row.id}
											className="modula-gallery-takeover__preview-add-menu-item"
											role="none"
										>
											<button
												type="button"
												className={
													actionable
														? 'modula-gallery-takeover__preview-add-menu-btn'
														: 'modula-gallery-takeover__preview-add-menu-btn is-disabled'
												}
												role="menuitem"
												disabled={!actionable}
												aria-label={ariaHint}
												title={
													badge && !actionable
														? badge.hint
														: undefined
												}
												onClick={() => {
													if (!actionable) {
														return;
													}
													handleRowAction(row);
												}}
											>
												<span
													className="modula-gallery-takeover__preview-add-menu-icon"
													aria-hidden="true"
												>
													<Icon
														icon={row.icon}
														size={15}
													/>
												</span>
												<span className="modula-gallery-takeover__preview-add-menu-label-wrap">
													<span className="modula-gallery-takeover__preview-add-menu-label">
														{row.label}
													</span>
													{badge ? (
														<span
															className={`modula-gallery-takeover__preview-add-menu-badge is-${badge.variant}`}
															aria-hidden="true"
														>
															{badge.text}
														</span>
													) : null}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
