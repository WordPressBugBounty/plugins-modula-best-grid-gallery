import { useId } from '@wordpress/element';
import { tabKeyTarget } from './tabKeyTarget';

/**
 * @typedef {{ value: string, label: string, badge?: import('react').ReactNode }} TabOption
 * `badge` follows the label inside the tab button, e.g. a PlanBadge without
 * `onClick`.
 */

/**
 * @param {string} baseId
 * @return {string} The panel element id.
 */
const panelIdFor = (baseId) => `${baseId}-panel`;

/**
 * @param {string} baseId
 * @param {string} tabValue
 * @return {string} The tab button id.
 */
const tabIdFor = (baseId, tabValue) => `${baseId}-tab-${tabValue}`;

/**
 * The tab list of a tab set, drawn as the design's pill track. WAI-ARIA
 * tabs: arrows, Home and End move the selection, and only the selected tab
 * is in the tab order. Use it with TabPanel and the same `id` when the list
 * sits apart from its panel (a dialog header); otherwise use Tabs.
 *
 * @param {Object}      props
 * @param {string}      props.id       Shared with the TabPanel.
 * @param {string}      props.label    Accessible name of the tab list.
 * @param {TabOption[]} props.tabs
 * @param {string}      props.value    Selected tab.
 * @param {Function}    props.onChange Receives the tab value.
 */
export function TabList({ id, label, tabs, value, onChange }) {
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

	return (
		<div
			className="modula-admin-tabs__list"
			role="tablist"
			aria-label={label}
		>
			{tabs.map((tab, index) => (
				<button
					key={tab.value}
					id={tabIdFor(id, tab.value)}
					type="button"
					role="tab"
					className="modula-admin-tabs__tab"
					aria-selected={index === selectedIndex}
					aria-controls={panelIdFor(id)}
					tabIndex={index === focusableIndex ? 0 : -1}
					onClick={() => onChange(tab.value)}
					onKeyDown={moveSelection}
				>
					{tab.label}
					{tab.badge ?? null}
				</button>
			))}
		</div>
	);
}

/**
 * The content of the selected tab. It is not a tab stop because panels
 * start with controls.
 *
 * @param {Object}                    props
 * @param {string}                    props.id          Shared with the TabList.
 * @param {TabOption[]}               props.tabs
 * @param {string}                    props.value       Selected tab.
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function TabPanel({ id, tabs, value, className = '', children }) {
	const selected = tabs.find((tab) => tab.value === value);

	return (
		<div
			id={panelIdFor(id)}
			className={['modula-admin-tabs__panel', className]
				.filter(Boolean)
				.join(' ')}
			role="tabpanel"
			aria-labelledby={
				selected ? tabIdFor(id, selected.value) : undefined
			}
		>
			{children}
		</div>
	);
}

/**
 * Tabs inside a section (Email, Roles): a TabList over its TabPanel. The
 * panel shows `children`, the content of the selected tab. `aside` sits at
 * the end of the tab list's line (the Roles note) and belongs to every tab.
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
	const list = (
		<TabList
			id={baseId}
			label={label}
			tabs={tabs}
			value={value}
			onChange={onChange}
		/>
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
			<TabPanel id={baseId} tabs={tabs} value={value}>
				{children}
			</TabPanel>
		</div>
	);
}
