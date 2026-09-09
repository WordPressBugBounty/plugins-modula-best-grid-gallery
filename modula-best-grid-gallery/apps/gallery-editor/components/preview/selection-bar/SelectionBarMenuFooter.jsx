/**
 * Menu footer: optional note + optional action.
 *
 * @param {{
 *   note?: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function SelectionBarMenuFooter({ note, children }) {
	return (
		<div className="modula-gallery-takeover__selection-bar-menu-foot">
			{note ? (
				<span className="modula-gallery-takeover__selection-bar-menu-foot-note">
					{note}
				</span>
			) : (
				<span />
			)}
			{children}
		</div>
	);
}
