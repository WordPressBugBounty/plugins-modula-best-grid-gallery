/**
 * The ↳ before a row that stands for its host's dependents on its own
 * (`isSingleRowDependents`; canvas "↳ Arrows over the image"). The panel
 * marks such a row with the context; the row's label line draws the icon.
 * Shared by the gallery editor and the Albums editor.
 */
import { createContext, useContext } from '@wordpress/element';
import { SubgroupIcon } from 'admin-ui';

/** Whether the rows inside are a host's single dependent row. */
export const DependentRowContext = createContext(false);

/**
 * @return {import('react').ReactNode} The ↳ icon inside a dependent row, else nothing.
 */
export default function DependentRowIcon() {
	const isDependentRow = useContext(DependentRowContext);
	if (!isDependentRow) {
		return null;
	}

	return (
		<span className="modula-settings-panel__dependent-icon">
			<SubgroupIcon />
		</span>
	);
}
