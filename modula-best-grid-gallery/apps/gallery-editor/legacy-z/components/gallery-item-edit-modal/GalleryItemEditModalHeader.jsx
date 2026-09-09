/**
 * Top bar for the unified gallery item edit modal.
 */
import { useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import {
	chevronLeft,
	chevronRight,
	image,
	layout,
	video,
} from '@wordpress/icons';
import GalleryModalHeader from '../gallery-modal/GalleryModalHeader';

/**
 * @param {Object}                  props
 * @param {'image'|'content-block'} props.itemKind
 * @param {boolean}                 [props.isVideoItem] Video gallery row or tile with video URL.
 * @param {string}                  props.metaPrimary Filename or "Content block".
 * @param {string|number}           [props.metaId]    Attachment or embedded id.
 * @param {boolean}                 props.hasPrev
 * @param {boolean}                 props.hasNext
 * @param {(anchorEl: HTMLElement) => void} props.onRequestPrevious
 * @param {(anchorEl: HTMLElement) => void} props.onRequestNext
 * @param {() => void}              props.onClose
 */
export default function GalleryItemEditModalHeader({
	itemKind,
	isVideoItem = false,
	metaPrimary,
	metaId,
	hasPrev,
	hasNext,
	onRequestPrevious,
	onRequestNext,
	onClose,
}) {
	const prevRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
	const nextRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
	const title =
		itemKind === 'content-block'
			? __('Edit content block', 'modula-best-grid-gallery')
			: isVideoItem
				? __('Edit video', 'modula-best-grid-gallery')
				: __('Edit image', 'modula-best-grid-gallery');
	const headerIcon =
		itemKind === 'content-block' ? layout : isVideoItem ? video : image;

	const metaParts = [];
	if (metaPrimary) {
		metaParts.push(metaPrimary);
	}
	if (metaId !== undefined && metaId !== null && String(metaId) !== '') {
		metaParts.push(
			sprintf(
				/* translators: %s: item id */
				__('ID: %s', 'modula-best-grid-gallery'),
				String(metaId)
			)
		);
	}

	const headerActions = (
		<>
			<Button
				ref={prevRef}
				variant="secondary"
				className="modula-gallery-modal__header-nav"
				icon={chevronLeft}
				disabled={!hasPrev}
				onClick={() => {
					if (prevRef.current) {
						onRequestPrevious(prevRef.current);
					}
				}}
				aria-label={__('Previous item', 'modula-best-grid-gallery')}
			>
				{__('Previous', 'modula-best-grid-gallery')}
			</Button>
			<Button
				ref={nextRef}
				variant="secondary"
				className="modula-gallery-modal__header-nav"
				icon={chevronRight}
				disabled={!hasNext}
				onClick={() => {
					if (nextRef.current) {
						onRequestNext(nextRef.current);
					}
				}}
				aria-label={__('Next item', 'modula-best-grid-gallery')}
			>
				{__('Next', 'modula-best-grid-gallery')}
			</Button>
		</>
	);

	return (
		<GalleryModalHeader
			title={title}
			subtitle={metaParts.length ? metaParts.join(' • ') : ''}
			icon={headerIcon}
			titleId="modula-image-metadata-modal-title"
			headerActions={headerActions}
			onClose={onClose}
		/>
	);
}
