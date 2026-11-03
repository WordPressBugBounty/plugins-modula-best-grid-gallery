import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { Icon, arrowRight, chevronRight, columns } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { Popover } from 'admin-ui';
import { canShowListingRowPreview } from './listingRowPreviewPath';
import { listingRowFromPreviewMember } from './listingBetaEditorPrompt';
import { decodeListingTitle } from './listingRowToFields';
import { readListingMiniature } from './listingMiniatureDrawing';
import { ListingMiniature } from './ListingMiniature';
import { useListingRowPreviewQuery } from './query/useListingRowPreviewQuery';

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 200;

/** @type {null | (() => void)} */
let closeActivePreview = null;

/**
 * Close any open listing row preview (e.g. when entering hover actions).
 */
export function closeListingRowPreview() {
	if (closeActivePreview) {
		closeActivePreview();
	}
}

/**
 * @param {() => void} closeFn
 */
function claimPreview(closeFn) {
	if (closeActivePreview && closeActivePreview !== closeFn) {
		closeActivePreview();
	}
	closeActivePreview = closeFn;
}

/**
 * @param {() => void} closeFn
 */
function releasePreview(closeFn) {
	if (closeActivePreview === closeFn) {
		closeActivePreview = null;
	}
}

/**
 * Hover / tap preview panel for a listing row.
 *
 * @param {{
 *   item: Object,
 *   children: import('react').ReactNode,
 *   className?: string,
 *   requestGalleryEdit?: (item: Object) => void,
 * }} props
 */
export function ListingRowPreviewTrigger({
	item,
	children,
	className = '',
	requestGalleryEdit,
}) {
	const openTimerRef = useRef(/** @type {number|null} */ (null));
	const closeTimerRef = useRef(/** @type {number|null} */ (null));
	const [open, setOpen] = useState(false);

	const canPreview = canShowListingRowPreview(item);
	const previewQuery = useListingRowPreviewQuery({
		item,
		enabled: open && canPreview,
	});

	const clearTimers = useCallback(() => {
		if (openTimerRef.current) {
			window.clearTimeout(openTimerRef.current);
			openTimerRef.current = null;
		}
		if (closeTimerRef.current) {
			window.clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	}, []);

	const close = useCallback(() => {
		clearTimers();
		setOpen(false);
		releasePreview(close);
	}, [clearTimers]);

	const openNow = useCallback(() => {
		clearTimers();
		claimPreview(close);
		setOpen(true);
	}, [clearTimers, close]);

	useEffect(() => {
		return () => {
			clearTimers();
			releasePreview(close);
		};
	}, [clearTimers, close]);

	if (!canPreview) {
		return children;
	}

	const scheduleOpen = () => {
		clearTimers();
		openTimerRef.current = window.setTimeout(openNow, OPEN_DELAY_MS);
	};

	const scheduleClose = () => {
		clearTimers();
		closeTimerRef.current = window.setTimeout(close, CLOSE_DELAY_MS);
	};

	const cancelClose = () => {
		if (closeTimerRef.current) {
			window.clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	};

	// Hover, focus and touch open it, not a click: the trigger keeps its
	// own handlers and takes only the popup's ARIA from the Popover.
	const renderTrigger = (triggerProps) => (
		<span
			className={[
				'modula-content-page__row-preview-trigger',
				className,
				open ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
			aria-expanded={triggerProps['aria-expanded']}
			aria-controls={triggerProps['aria-controls']}
			onMouseEnter={scheduleOpen}
			onMouseLeave={scheduleClose}
			onFocus={scheduleOpen}
			onBlur={scheduleClose}
			onClick={(event) => {
				// Touch / click toggle without navigating parent links.
				if (event.detail === 0) {
					return;
				}
				const isCoarse =
					typeof window !== 'undefined' &&
					window.matchMedia?.('(pointer: coarse)').matches;
				if (!isCoarse && !('ontouchstart' in window)) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				if (open) {
					close();
				} else {
					openNow();
				}
			}}
		>
			{children}
		</span>
	);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => (next ? openNow() : close())}
			trigger={renderTrigger}
			label={
				item.type === 'album'
					? __('Galleries in this album', 'modula-best-grid-gallery')
					: __('Items in this gallery', 'modula-best-grid-gallery')
			}
			focusOnOpen={false}
			className="modula-content-page-row-preview__popover"
		>
			{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- pointer or focus on the panel keeps it open */}
			<div
				className="modula-content-page-row-preview"
				onMouseEnter={cancelClose}
				onMouseLeave={scheduleClose}
				onFocus={cancelClose}
			>
				{previewQuery.isLoading ? (
					<p className="modula-content-page-row-preview__loading">
						{__('Loading…', 'modula-best-grid-gallery')}
					</p>
				) : null}
				{previewQuery.isError ? (
					<p className="modula-content-page-row-preview__error">
						{__(
							'Could not load preview.',
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
				{previewQuery.data?.type === 'album' ? (
					<AlbumPreviewBody
						data={previewQuery.data}
						item={item}
						requestGalleryEdit={requestGalleryEdit}
					/>
				) : null}
				{previewQuery.data?.type === 'gallery' ? (
					<GalleryPreviewBody
						data={previewQuery.data}
						item={item}
						requestGalleryEdit={requestGalleryEdit}
					/>
				) : null}
			</div>
		</Popover>
	);
}

/**
 * @param {{
 *   data: Object,
 *   item: Object,
 *   requestGalleryEdit?: (item: Object) => void,
 * }} props
 */
function AlbumPreviewBody({ data, item, requestGalleryEdit }) {
	const members = Array.isArray(data.members) ? data.members : [];
	const total = Number(data.total) || members.length;
	const openAlbum = () => {
		if (typeof requestGalleryEdit === 'function') {
			requestGalleryEdit(item);
			return;
		}
		if (item?.editUrl) {
			window.location.href = item.editUrl;
		}
	};

	return (
		<>
			<div className="modula-content-page-row-preview__header">
				<span
					className="modula-content-page-row-preview__header-icon"
					aria-hidden
				>
					<Icon icon={columns} size={16} />
				</span>
				<span className="modula-content-page-row-preview__header-title">
					{__('Galleries in this album', 'modula-best-grid-gallery')}
				</span>
				<span className="modula-content-page-row-preview__header-count">
					{total}
				</span>
			</div>
			{members.length === 0 ? (
				<p className="modula-content-page-row-preview__empty">
					{__('No galleries yet.', 'modula-best-grid-gallery')}
				</p>
			) : (
				<ul className="modula-content-page-row-preview__member-list">
					{members.map((member) => (
						<li
							key={member.id}
							className="modula-content-page-row-preview__member"
						>
							{member.thumbnailUrl ? (
								<img
									className="modula-content-page-row-preview__member-thumb"
									src={member.thumbnailUrl}
									alt=""
								/>
							) : (
								<span
									className="modula-content-page-row-preview__member-thumb is-empty"
									aria-hidden
								/>
							)}
							<span className="modula-content-page-row-preview__member-text">
								<span className="modula-content-page-row-preview__member-title">
									{decodeListingTitle(member.title)}
								</span>
								{member.itemsLabel ? (
									<span className="modula-content-page-row-preview__member-meta">
										{member.itemsLabel}
									</span>
								) : null}
							</span>
							{member.editUrl ? (
								<button
									type="button"
									className="modula-content-page-row-preview__member-link"
									aria-label={sprintf(
										/* translators: %s: gallery title */
										__(
											'Edit %s',
											'modula-best-grid-gallery'
										),
										decodeListingTitle(member.title)
									)}
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();
										const memberRow =
											listingRowFromPreviewMember(member);
										if (
											typeof requestGalleryEdit ===
											'function'
										) {
											requestGalleryEdit(memberRow);
											return;
										}
										if (memberRow.editUrl) {
											window.location.href =
												memberRow.editUrl;
										}
									}}
								>
									<Icon icon={chevronRight} size={18} />
								</button>
							) : null}
						</li>
					))}
				</ul>
			)}
			{item?.editUrl ? (
				<button
					type="button"
					className="modula-content-page-row-preview__footer"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						openAlbum();
					}}
				>
					{__('Open album', 'modula-best-grid-gallery')}
					<Icon icon={arrowRight} size={16} />
				</button>
			) : null}
		</>
	);
}

/**
 * @param {{
 *   data: Object,
 *   item: Object,
 *   requestGalleryEdit?: (item: Object) => void,
 * }} props
 */
function GalleryPreviewBody({ data, item, requestGalleryEdit }) {
	const items = Array.isArray(data.items) ? data.items : [];
	const total = Number(data.total) || items.length;
	// As on the cover: without thumbnails, the layout miniature.
	const miniature =
		items.length === 0 ? readListingMiniature(data.miniature) : null;
	const openGallery = () => {
		if (typeof requestGalleryEdit === 'function') {
			requestGalleryEdit(item);
			return;
		}
		if (item?.editUrl) {
			window.location.href = item.editUrl;
		}
	};

	return (
		<>
			<div className="modula-content-page-row-preview__header">
				<span className="modula-content-page-row-preview__header-title">
					{__('Items in this gallery', 'modula-best-grid-gallery')}
				</span>
				<span className="modula-content-page-row-preview__header-count">
					{total}
				</span>
			</div>
			{miniature ? (
				<div className="modula-content-page-row-preview__miniature">
					<ListingMiniature drawing={miniature} />
				</div>
			) : null}
			{items.length === 0 && !miniature ? (
				<p className="modula-content-page-row-preview__empty">
					{__('No items yet.', 'modula-best-grid-gallery')}
				</p>
			) : null}
			{items.length > 0 ? (
				<div className="modula-content-page-row-preview__thumbs">
					{items.map((entry, index) =>
						entry.thumbnailUrl ? (
							<img
								key={`${entry.thumbnailUrl}-${index}`}
								className={[
									'modula-content-page-row-preview__thumb',
									entry.kind === 'video' ? 'is-video' : '',
								]
									.filter(Boolean)
									.join(' ')}
								src={entry.thumbnailUrl}
								alt=""
							/>
						) : (
							<span
								key={`empty-${index}`}
								className="modula-content-page-row-preview__thumb is-empty"
								aria-hidden
							/>
						)
					)}
				</div>
			) : null}
			{item?.editUrl ? (
				<button
					type="button"
					className="modula-content-page-row-preview__footer"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						openGallery();
					}}
				>
					{__('Open gallery', 'modula-best-grid-gallery')}
					<Icon icon={arrowRight} size={16} />
				</button>
			) : null}
		</>
	);
}
