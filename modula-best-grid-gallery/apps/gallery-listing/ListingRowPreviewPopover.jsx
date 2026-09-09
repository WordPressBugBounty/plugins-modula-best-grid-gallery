import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';
import { Popover } from '@wordpress/components';
import { Icon, arrowRight, chevronRight, columns } from '@wordpress/icons';
import { __, sprintf } from '@wordpress/i18n';
import { canShowListingRowPreview } from './listingRowPreviewPath';
import { listingRowFromPreviewMember } from './listingBetaEditorPrompt';
import { decodeListingTitle } from './listingRowToFields';
import { useListingRowPreviewQuery } from './query/useListingRowPreviewQuery';

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 200;

/** @type {null | (() => void)} */
let closeActivePreview = null;

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
	const triggerId = useId();
	const rootRef = useRef(/** @type {HTMLSpanElement|null} */ (null));
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

	return (
		<span
			ref={rootRef}
			className={[
				'modula-gallery-listing__row-preview-trigger',
				className,
				open ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
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
			{open ? (
				<Popover
					anchor={rootRef.current}
					placement="bottom-start"
					offset={8}
					focusOnMount={false}
					onFocusOutside={close}
					className="modula-listing-row-preview__popover"
				>
					<div
						className="modula-listing-row-preview"
						id={`modula-listing-row-preview-${triggerId}`}
						role="dialog"
						aria-label={
							item.type === 'album'
								? __(
										'Galleries in this album',
										'modula-best-grid-gallery'
									)
								: __(
										'Items in this gallery',
										'modula-best-grid-gallery'
									)
						}
						onMouseEnter={cancelClose}
						onMouseLeave={scheduleClose}
					>
						{previewQuery.isLoading ? (
							<p className="modula-listing-row-preview__loading">
								{__('Loading…', 'modula-best-grid-gallery')}
							</p>
						) : null}
						{previewQuery.isError ? (
							<p className="modula-listing-row-preview__error">
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
			) : null}
		</span>
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
			<div className="modula-listing-row-preview__header">
				<span
					className="modula-listing-row-preview__header-icon"
					aria-hidden
				>
					<Icon icon={columns} size={16} />
				</span>
				<span className="modula-listing-row-preview__header-title">
					{__('Galleries in this album', 'modula-best-grid-gallery')}
				</span>
				<span className="modula-listing-row-preview__header-count">
					{total}
				</span>
			</div>
			{members.length === 0 ? (
				<p className="modula-listing-row-preview__empty">
					{__('No galleries yet.', 'modula-best-grid-gallery')}
				</p>
			) : (
				<ul className="modula-listing-row-preview__member-list">
					{members.map((member) => (
						<li
							key={member.id}
							className="modula-listing-row-preview__member"
						>
							{member.thumbnailUrl ? (
								<img
									className="modula-listing-row-preview__member-thumb"
									src={member.thumbnailUrl}
									alt=""
								/>
							) : (
								<span
									className="modula-listing-row-preview__member-thumb is-empty"
									aria-hidden
								/>
							)}
							<span className="modula-listing-row-preview__member-text">
								<span className="modula-listing-row-preview__member-title">
									{decodeListingTitle(member.title)}
								</span>
								{member.itemsLabel ? (
									<span className="modula-listing-row-preview__member-meta">
										{member.itemsLabel}
									</span>
								) : null}
							</span>
							{member.editUrl ? (
								<button
									type="button"
									className="modula-listing-row-preview__member-link"
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
					className="modula-listing-row-preview__footer"
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
			<div className="modula-listing-row-preview__header">
				<span className="modula-listing-row-preview__header-title">
					{__('Items in this gallery', 'modula-best-grid-gallery')}
				</span>
				<span className="modula-listing-row-preview__header-count">
					{total}
				</span>
			</div>
			{items.length === 0 ? (
				<p className="modula-listing-row-preview__empty">
					{__('No items yet.', 'modula-best-grid-gallery')}
				</p>
			) : (
				<div className="modula-listing-row-preview__thumbs">
					{items.map((entry, index) =>
						entry.thumbnailUrl ? (
							<img
								key={`${entry.thumbnailUrl}-${index}`}
								className={[
									'modula-listing-row-preview__thumb',
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
								className="modula-listing-row-preview__thumb is-empty"
								aria-hidden
							/>
						)
					)}
				</div>
			)}
			{item?.editUrl ? (
				<button
					type="button"
					className="modula-listing-row-preview__footer"
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
