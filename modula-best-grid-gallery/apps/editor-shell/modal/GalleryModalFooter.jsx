/**
 * Shared bottom action bar for gallery builder modals.
 */

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} [props.left]
 * @param {import('react').ReactNode} [props.right]
 */
export default function GalleryModalFooter({ left, right }) {
	if (!left && !right) {
		return null;
	}

	return (
		<footer className="modula-gallery-modal__footer">
			<div className="modula-gallery-modal__footer-start">{left}</div>
			{right ? (
				<div className="modula-gallery-modal__footer-actions">
					{right}
				</div>
			) : null}
		</footer>
	);
}
