/**
 * Shared bottom action bar for gallery builder modals.
 */

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} [props.left]
 * @param {import('react').ReactNode} [props.right]
 * @param {string}                    [props.className]
 */
export default function GalleryModalFooter({ left, right, className = '' }) {
	if (!left && !right) {
		return null;
	}

	const footerClassName = ['modula-gallery-modal__footer', className]
		.filter(Boolean)
		.join(' ');

	return (
		<footer className={footerClassName}>
			<div className="modula-gallery-modal__footer-start">
				{left}
				<div
					className="modula-gallery-modal__footer-aux"
					aria-hidden="true"
				/>
			</div>
			{right ? (
				<div className="modula-gallery-modal__footer-actions">{right}</div>
			) : null}
		</footer>
	);
}
