/**
 * Full-width editor chrome: gallery identity and save status on the left; shortcodes and document status on the right.
 */
import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, chevronLeft, pencil } from '@wordpress/icons';
import TakeoverTopBarShortcodes from './TakeoverTopBarShortcodes';
import TakeoverTopBarSaveStatus from './TakeoverTopBarSaveStatus';
import TakeoverTopBarDocumentStatus from './TakeoverTopBarDocumentStatus';
import BoundGalleryBadge from './BoundGalleryBadge';

/**
 * @param {Object}                                   props
 * @param {number}                                   props.galleryId
 * @param {string}                                   props.postTitle
 * @param {(title: string) => void}                  props.onPostTitleChange
 * @param {(value?: string) => void}                 props.onPostTitleCommit
 * @param {boolean}                                  props.titleDisabled
 * @param {string}                                   props.adminUrl
 * @param {import('react').ReactNode}                [props.undoRedoControls]
 * @param {string}                                   [props.documentStatus]
 * @param {string}                                   [props.documentStatusLabel]
 * @param {Array<{ value?: string, label?: string }>} [props.documentStatusChoices]
 * @param {(status: string, label: string) => void}  [props.onDocumentStatusChange]
 * @param {boolean}                                  [props.documentStatusBusy]
 * @param {boolean}                                  [props.canEditDocumentStatus]
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
	const titleInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
	const backLabel = __('Galleries', 'modula-best-grid-gallery');
	const showDocumentStatus =
		typeof onDocumentStatusChange === 'function' && canEditDocumentStatus;

	return (
		<header className="modula-gallery-takeover__topbar" role="banner">
			<div className="modula-gallery-takeover__topbar-inner">
				<div className="modula-gallery-takeover__topbar-left">
					<div className="modula-gallery-takeover__topbar-left-cluster">
						<a
							className="modula-gallery-takeover__topbar-exit"
							href={adminUrl}
							aria-label={__(
								'Back to Galleries',
								'modula-best-grid-gallery'
							)}
						>
							<span
								className="modula-gallery-takeover__topbar-exit-icon"
								aria-hidden="true"
							>
								<Icon icon={chevronLeft} size={20} />
							</span>
							<span className="modula-gallery-takeover__topbar-exit-label">
								{backLabel}
							</span>
						</a>
						{undoRedoControls}
					</div>

					<div className="modula-gallery-takeover__topbar-title">
						<div className="modula-gallery-takeover__topbar-title-field">
							<div className="modula-gallery-takeover__topbar-title-row">
								<span
									className="modula-gallery-takeover__topbar-title-size"
									aria-hidden="true"
								>
									{postTitle ||
										__(
											'Untitled gallery',
											'modula-best-grid-gallery'
										)}
								</span>
								<input
									ref={titleInputRef}
									id="modula-takeover-topbar-title"
									type="text"
									className="modula-gallery-takeover__topbar-title-input"
									value={postTitle}
									title={postTitle}
									placeholder={__(
										'Untitled gallery',
										'modula-best-grid-gallery'
									)}
									disabled={titleDisabled || !galleryId}
									aria-label={__(
										'Gallery title',
										'modula-best-grid-gallery'
									)}
									onChange={(e) =>
										onPostTitleChange(e.target.value)
									}
									onBlur={(e) =>
										onPostTitleCommit?.(
											e.currentTarget.value
										)
									}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											const el = e.currentTarget;
											onPostTitleCommit?.(el.value);
											el.blur();
										}
									}}
								/>
								{galleryId && !titleDisabled ? (
									<button
										type="button"
										className="modula-gallery-takeover__topbar-title-pencil"
										tabIndex={-1}
										aria-label={__(
											'Edit gallery title',
											'modula-best-grid-gallery'
										)}
										onClick={() => {
											const el = titleInputRef.current;
											if (el && !el.disabled) {
												el.focus();
												el.select();
											}
										}}
									>
										<Icon icon={pencil} size={14} />
									</button>
								) : null}
							</div>
						</div>
					</div>

					<TakeoverTopBarSaveStatus />
					<BoundGalleryBadge />
				</div>

				<div className="modula-gallery-takeover__topbar-right">
					<TakeoverTopBarShortcodes galleryId={galleryId} />
					{showDocumentStatus ? (
						<TakeoverTopBarDocumentStatus
							status={documentStatus}
							statusLabel={documentStatusLabel}
							statusChoices={documentStatusChoices}
							onStatusChange={onDocumentStatusChange}
							busy={documentStatusBusy}
						/>
					) : null}
				</div>
			</div>
		</header>
	);
}
