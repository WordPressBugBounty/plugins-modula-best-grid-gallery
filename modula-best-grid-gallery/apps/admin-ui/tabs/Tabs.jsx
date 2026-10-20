import { useId } from '@wordpress/element';
import { tabKeyTarget } from './tabKeyTarget';

/**
 * @typedef {{ value: string, label: string }} TabOption
 */

/**
 * Tabs inside a section (Email, Roles), drawn as the design's pill track.
 * WAI-ARIA tabs: arrows, Home and End move the selection, and only the
 * selected tab is in the tab order. The panel shows `children`, the content
 * of the selected tab; it is not a tab stop because section panels start
 * with controls. `aside` sits at the end of the tab list's line (the Roles
 * note) and belongs to every tab.
 *
 * @param {Object}                    props
 * @param {string}                    props.label    Accessible name of the tab list.
 * @param {TabOption[]}               props.tabs
 * @param {string}                    props.value    Selected tab.
 * @param {Function}                  props.onChange Receives the tab value.
 * @param {import('react').ReactNode} [props.aside]
 * @param {import('react').ReactNode} props.children
 */
export function Tabs({ label, tabs, value, onChange, aside = null, children }) {
	const baseId = `modula-admin-tabs-${useId()}`;
	const panelId = `${baseId}-panel`;
	const tabId = (tabValue) => `${baseId}-tab-${tabValue}`;
	const selectedIndex = tabs.findIndex((tab) => tab.value === value);
	// With no valid selection the first tab keeps the list reachable.
	const focusableIndex = Math.max(selectedIndex, 0);

	const moveSelection = (event) => {
		const target = tabKeyTarget(event.key, selectedIndex, tabs.length);
		if (null === target) {
			return;
		}
		event.preventDefault();
		onChange(tabs[target].value);
		event.currentTarget.parentElement
			.querySelectorAll('[role="tab"]')
			[target].focus();
	};

	const list = (
		<div
			className="modula-admin-tabs__list"
			role="tablist"
			aria-label={label}
		>
			{tabs.map((tab, index) => (
				<button
					key={tab.value}
					id={tabId(tab.value)}
					type="button"
					role="tab"
					className="modula-admin-tabs__tab"
					aria-selected={index === selectedIndex}
					aria-controls={panelId}
					tabIndex={index === focusableIndex ? 0 : -1}
					onClick={() => onChange(tab.value)}
					onKeyDown={moveSelection}
				>
					{tab.label}
				</button>
			))}
		</div>
	);

	return (
		<div className="modula-admin-tabs">
			{aside ? (
				<div className="modula-admin-tabs__bar">
					{list}
					<div className="modula-admin-tabs__aside">{aside}</div>
				</div>
			) : (
				list
			)}
			<div
				id={panelId}
				className="modula-admin-tabs__panel"
				role="tabpanel"
				aria-labelledby={
					selectedIndex < 0
						? undefined
						: tabId(tabs[selectedIndex].value)
				}
			>
				{children}
			</div>
		</div>
	);
}
