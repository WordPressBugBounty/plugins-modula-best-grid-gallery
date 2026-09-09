/**
 * Uppercase section heading inside a selection-bar menu.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export default function SelectionBarMenuHeading({ children }) {
	return (
		<div className="modula-gallery-takeover__selection-bar-menu-heading">
			{children}
		</div>
	);
}
