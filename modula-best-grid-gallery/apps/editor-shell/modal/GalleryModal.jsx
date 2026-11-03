/**
 * Shared gallery builder modal: the admin-ui `Dialog` (native modal
 * `<dialog>`: focus trap, inert page, Escape, focus return) in one of four
 * sizes, with a scrolling body and an optional footer.
 */
import { Dialog } from 'admin-ui';
import AdminUiScope from '../appearance/AdminUiScope';
import '../styles/_gallery-modal.scss';
import GalleryModalBody from './GalleryModalBody';
import GalleryModalFooter from './GalleryModalFooter';

/** @type {Record<string, string>} */
const SIZE_CLASS = {
	small: 'modula-gallery-modal--small',
	medium: 'modula-gallery-modal--medium',
	large: 'modula-gallery-modal--large',
	xlarge: 'modula-gallery-modal--xlarge',
};

/**
 * @param {Object}                            props
 * @param {boolean}                           props.isOpen
 * @param {() => void}                        props.onClose               Close, Escape.
 * @param {string}                            props.title
 * @param {'small'|'medium'|'large'|'xlarge'} [props.size='large']
 * @param {import('react').ReactNode}         [props.subtitle]
 * @param {import('react').ReactNode}         [props.headerContent]       After the title, e.g. a status chip.
 * @param {import('react').ReactNode}         [props.headerActions]       At the right, before Close.
 * @param {import('react').ReactNode}         [props.footerLeft]
 * @param {import('react').ReactNode}         [props.footerRight]
 * @param {import('react').ReactNode}         props.children
 * @param {string}                            [props.className]
 * @param {string}                            [props.bodyClassName]
 * @param {'auto'|'hidden'}                   [props.bodyOverflow='auto']
 * @param {boolean}                           [props.closeDisabled]       Work in progress: Close is disabled and Escape is ignored.
 */
export default function GalleryModal({
	isOpen,
	onClose,
	title,
	size = 'large',
	subtitle = null,
	headerContent = null,
	headerActions = null,
	footerLeft = null,
	footerRight = null,
	children,
	className = '',
	bodyClassName = '',
	bodyOverflow = 'auto',
	closeDisabled = false,
}) {
	const requestClose = () => {
		if (!closeDisabled) {
			onClose();
		}
	};

	const dialogClassName = [
		'modula-gallery-modal',
		SIZE_CLASS[size] || SIZE_CLASS.large,
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<AdminUiScope>
			<Dialog
				open={isOpen}
				onClose={requestClose}
				title={title}
				subtitle={subtitle}
				headerContent={headerContent}
				headerActions={headerActions}
				closeDisabled={closeDisabled}
				className={dialogClassName}
			>
				<GalleryModalBody
					overflow={bodyOverflow}
					className={bodyClassName}
				>
					{children}
				</GalleryModalBody>
				<GalleryModalFooter left={footerLeft} right={footerRight} />
			</Dialog>
		</AdminUiScope>
	);
}
