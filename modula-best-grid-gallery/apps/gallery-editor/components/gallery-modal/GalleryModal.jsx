/**
 * Shared gallery builder modal shell: overlay, sized panel, header/body/footer slots.
 * Portals to `document.body` — carries appearance class so light/dark tokens apply.
 */
import { createPortal } from 'react-dom';
import { useRef } from '@wordpress/element';
import '../../styles/takeover/preview/_gallery-modal.scss';
import { useModalEscapeKey } from '../../hooks/useModalEscapeKey';
import { useSettingsEditorAppearance } from '../../context/SettingsEditorAppearanceContext';
import GalleryModalHeader from './GalleryModalHeader';
import GalleryModalBody from './GalleryModalBody';
import GalleryModalFooter from './GalleryModalFooter';

/** @type {Record<string, string>} */
const SIZE_CLASS = {
	small: 'modula-gallery-modal__panel--small',
	medium: 'modula-gallery-modal__panel--medium',
	large: 'modula-gallery-modal__panel--large',
	xlarge: 'modula-gallery-modal__panel--xlarge',
};

/**
 * @param {Object}                    props
 * @param {boolean}                   props.isOpen
 * @param {() => void}                props.onClose
 * @param {'small'|'medium'|'large'|'xlarge'} [props.size='large']
 * @param {string}                    [props.title]
 * @param {string}                    [props.subtitle]
 * @param {import('@wordpress/icons').Icon} [props.icon]
 * @param {import('react').ReactNode}       [props.iconElement]
 * @param {string}                    [props.titleId]
 * @param {import('react').ReactNode} [props.header]
 * @param {import('react').ReactNode} [props.headerActions]
 * @param {import('react').ReactNode} [props.footer]
 * @param {import('react').ReactNode} [props.footerLeft]
 * @param {import('react').ReactNode} [props.footerRight]
 * @param {import('react').ReactNode} props.children
 * @param {string}                    [props.className]
 * @param {string}                    [props.panelClassName]
 * @param {string}                    [props.bodyClassName]
 * @param {'auto'|'hidden'}           [props.bodyOverflow='auto']
 * @param {boolean}                   [props.closeOnBackdropClick=true]
 * @param {boolean}                   [props.closeOnEscape=true]
 * @param {boolean}                   [props.showClose=true]
 * @param {import('react').RefObject<HTMLDivElement|null>} [props.panelRef]
 */
export default function GalleryModal({
	isOpen,
	onClose,
	size = 'large',
	title,
	subtitle,
	icon,
	iconElement,
	titleId,
	header,
	headerActions,
	footer,
	footerLeft,
	footerRight,
	children,
	className = '',
	panelClassName = '',
	bodyClassName = '',
	bodyOverflow = 'auto',
	closeOnBackdropClick = true,
	closeOnEscape = true,
	showClose = true,
	panelRef: panelRefProp,
}) {
	const internalPanelRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const panelRef = panelRefProp || internalPanelRef;
	const labelledBy = titleId || 'modula-gallery-modal-title';
	const { appearance } = useSettingsEditorAppearance();

	useModalEscapeKey(isOpen && closeOnEscape, onClose, {
		listenTarget: 'window',
		stopImmediate: true,
	});

	if (!isOpen || typeof document === 'undefined') {
		return null;
	}

	const shellClassName = [
		'modula-gallery-modal',
		`modula-gallery-modal--${appearance}`,
		className,
	]
		.filter(Boolean)
		.join(' ');
	const resolvedPanelClassName = [
		'modula-gallery-modal__panel',
		SIZE_CLASS[size] || SIZE_CLASS.large,
		panelClassName,
	]
		.filter(Boolean)
		.join(' ');

	const resolvedHeader =
		header ||
		(title || headerActions || (showClose && onClose) ? (
			<GalleryModalHeader
				title={title}
				subtitle={subtitle}
				icon={icon}
				iconElement={iconElement}
				titleId={labelledBy}
				headerActions={headerActions}
				onClose={onClose}
				showClose={showClose}
			/>
		) : null);

	const resolvedFooter =
		footer ||
		(footerLeft || footerRight ? (
			<GalleryModalFooter left={footerLeft} right={footerRight} />
		) : null);

	const node = (
		<div
			className={shellClassName}
			data-appearance={appearance}
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledBy}
		>
			<div
				className="modula-gallery-modal__backdrop"
				onClick={closeOnBackdropClick ? onClose : undefined}
				aria-hidden="true"
			/>
			<div
				ref={panelRef}
				className={resolvedPanelClassName}
				tabIndex={-1}
			>
				{resolvedHeader}
				<GalleryModalBody
					overflow={bodyOverflow}
					className={bodyClassName}
				>
					{children}
				</GalleryModalBody>
				{resolvedFooter}
			</div>
		</div>
	);

	return createPortal(node, document.body);
}

export { GalleryModalHeader, GalleryModalBody, GalleryModalFooter };
