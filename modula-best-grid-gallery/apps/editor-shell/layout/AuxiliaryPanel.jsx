import AdminUiScope from '../appearance/AdminUiScope';

/**
 * The tools column beside the artboard (the hover effect builder). The
 * editor puts its panel in as children. The column sits outside the
 * sidebar's admin-ui scope, so it brings its own for its chrome.
 *
 * @param {Object}                    props
 * @param {string}                    props.label    Names the column.
 * @param {import('react').ReactNode} props.children
 */
export function AuxiliaryPanel({ label, children }) {
	return (
		<AdminUiScope>
			<aside className="modula-takeover__aux-panel" aria-label={label}>
				{children}
			</aside>
		</AdminUiScope>
	);
}
