/**
 * Full-width editor chrome: back to galleries, centered title, save status, shortcodes.
 */
import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, chevronLeft, pencil } from '@wordpress/icons';
import TakeoverTopBarShortcodes from './TakeoverTopBarShortcodes';
import TakeoverTopBarSaveStatus from './TakeoverTopBarSaveStatus';
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
 */
export default function GalleryTakeoverTopBar({
	galleryId,
	postTitle,
	onPostTitleChange,
	onPostTitleCommit,
	titleDisabled = false,
	adminUrl,
	undoRedoControls = null,
}) {
	const titleInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
	const backLabel = __('Galleries', 'modula-best-grid-gallery');

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
						<BoundGalleryBadge />
					</div>
				</div>

				<div className="modula-gallery-takeover__topbar-center">
					<div className="modula-gallery-takeover__topbar-title-field">
						<div className="modula-gallery-takeover__topbar-title-row">
							<input
								ref={titleInputRef}
								id="modula-takeover-topbar-title"
								type="text"
								className="modula-gallery-takeover__topbar-title-input"
								value={postTitle}
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
									onPostTitleCommit?.(e.currentTarget.value)
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

				<div className="modula-gallery-takeover__topbar-right">
					<TakeoverTopBarSaveStatus />
					<TakeoverTopBarShortcodes galleryId={galleryId} />
				</div>
			</div>
		</header>
	);
}
