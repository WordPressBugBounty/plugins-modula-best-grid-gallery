import '../../styles/takeover/preview/_import-dialog-shell.scss';
import GalleryModal from '../gallery-modal/GalleryModal';
import GalleryModalFooter from '../gallery-modal/GalleryModalFooter';

const BASE_CLASS = 'modula-import-dialog';

/**
 * Shared import dialog shell for takeover extension workflows.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   onRequestClose: () => void,
 *   isOpen?: boolean,
 *   busy?: boolean,
 *   variant?: 'compact' | 'fullscreen',
 *   className?: string,
 *   innerClassName?: string,
 *   toolbar?: import('react').ReactNode,
 *   footer?: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function TakeoverImportDialogShell({
	title,
	subtitle = '',
	onRequestClose,
	isOpen = true,
	busy = false,
	variant = 'compact',
	className = '',
	innerClassName = '',
	toolbar = null,
	footer = null,
	children,
}) {
	const variantClass =
		variant === 'fullscreen'
			? `${BASE_CLASS}--fullscreen`
			: `${BASE_CLASS}--compact`;
	const shellClassName = [BASE_CLASS, variantClass, className]
		.filter(Boolean)
		.join(' ');
	const innerClasses = [`${BASE_CLASS}__inner`, innerClassName]
		.filter(Boolean)
		.join(' ');

	const handleClose = busy ? () => {} : onRequestClose;
	const modalSize = variant === 'fullscreen' ? 'xlarge' : 'medium';

	return (
		<GalleryModal
			isOpen={isOpen}
			onClose={handleClose}
			size={modalSize}
			title={title}
			subtitle={subtitle || undefined}
			className={shellClassName}
			bodyClassName={innerClasses}
			bodyOverflow="auto"
			closeOnBackdropClick={!busy}
			closeOnEscape={!busy}
			showClose={!busy}
			footer={footer ? <GalleryModalFooter right={footer} /> : null}
		>
			{toolbar ? (
				<div className={`${BASE_CLASS}__toolbar`}>{toolbar}</div>
			) : null}
			{children}
		</GalleryModal>
	);
}

export { BASE_CLASS as TAKEOVER_IMPORT_DIALOG_BASE_CLASS };
