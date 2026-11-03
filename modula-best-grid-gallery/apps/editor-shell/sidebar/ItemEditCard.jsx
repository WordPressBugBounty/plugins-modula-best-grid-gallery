/**
 * One bordered group of an item edit panel (canvas "Edit image"): the file,
 * the text, the link, the filters… The gallery's hover builder column uses
 * the same cards for its layer, linking, motion and JSON groups, Sort & order
 * for New images and Sort by, and the Albums editor for its member panel.
 * Styled by `editor-shell/styles/_item-edit-panel.scss`.
 */

/**
 * @param {Object}                    props
 * @param {string}                    [props.title]     Heading over the rows ("Stacking").
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function ItemEditCard({ title = '', className = '', children }) {
	return (
		<section
			className={['modula-gallery-item-edit-panel__card', className]
				.filter(Boolean)
				.join(' ')}
		>
			{title !== '' ? (
				<h3 className="modula-gallery-item-edit-panel__card-title">
					{title}
				</h3>
			) : null}
			{children}
		</section>
	);
}
