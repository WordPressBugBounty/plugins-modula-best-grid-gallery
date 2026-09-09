/**
 * Scrollable/flexible body region for gallery builder modals.
 */

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 * @param {'auto'|'hidden'}           [props.overflow='auto']
 * @param {string}                    [props.className]
 */
export default function GalleryModalBody({
	children,
	overflow = 'auto',
	className = '',
}) {
	const overflowClass =
		overflow === 'hidden'
			? 'modula-gallery-modal__body--overflow-hidden'
			: 'modula-gallery-modal__body--overflow-auto';
	const bodyClassName = [
		'modula-gallery-modal__body',
		overflowClass,
		className,
	]
		.filter(Boolean)
		.join(' ');

	return <div className={bodyClassName}>{children}</div>;
}
