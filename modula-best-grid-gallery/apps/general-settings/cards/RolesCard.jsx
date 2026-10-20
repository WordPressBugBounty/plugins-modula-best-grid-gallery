import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Matrix, Tabs } from 'admin-ui';
import { CardFrame } from '../page/CardFrame';
import { UnavailableCard } from '../page/UnavailableCard';
import { useCardValues } from '../page/useCardValues';
import { roleMatrixEdit, roleMatrixTabs } from './roleMatrix';

/**
 * "Show N more roles", by number of hidden roles.
 *
 * @param {number} hiddenCount
 * @return {string} Label.
 */
function showMoreRolesLabel(hiddenCount) {
	return sprintf(
		/* translators: %d: number of hidden roles. */
		_n(
			'Show %d more role',
			'Show %d more roles',
			hiddenCount,
			'modula-best-grid-gallery'
		),
		hiddenCount
	);
}

/**
 * Roles (the Roles section): a role × permission matrix per tab, Galleries
 * and, with Pro Albums, Albums. Access is each role's stored `enabled` flag;
 * turning it off disables the rest of the row. In Lite the matrix sits in a
 * LockedCard; Pro shows it without a card frame, as in the design.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function RolesCard({ card }) {
	const { values, setValue } = useCardValues(card);
	// Null until a tab is chosen: the first tab shows.
	const [selectedTab, setSelectedTab] = useState(null);
	const tabs = roleMatrixTabs(card.config, values);

	if (null === tabs || 0 === tabs.length) {
		return <UnavailableCard card={card} />;
	}

	const tab = tabs.find(({ value }) => value === selectedTab) ?? tabs[0];
	const note = __(
		'Administrators can always do everything.',
		'modula-best-grid-gallery'
	);

	const onChange = (roleKey, columnId, next) => {
		const { name, value } = roleMatrixEdit(
			card.config,
			values,
			roleKey,
			columnId,
			next
		);
		setValue(name, value);
	};

	const matrix = (
		<Matrix
			label={__('Role permissions', 'modula-best-grid-gallery')}
			cornerLabel={__('Role', 'modula-best-grid-gallery')}
			columns={tab.columns}
			rows={tab.rows}
			onChange={onChange}
			showMoreLabel={showMoreRolesLabel}
			showFewerLabel={__('Show fewer roles', 'modula-best-grid-gallery')}
		/>
	);

	// Locked controls are disabled, tabs included, so only the first shows.
	if (card.locked) {
		return (
			<CardFrame card={card} note={note}>
				<div className="modula-settings-roles is-in-card">{matrix}</div>
			</CardFrame>
		);
	}

	if (1 === tabs.length) {
		return (
			<div className="modula-settings-roles">
				<p className="modula-settings-roles__note">{note}</p>
				{matrix}
			</div>
		);
	}

	return (
		<div className="modula-settings-roles">
			<Tabs
				label={__('Permissions for', 'modula-best-grid-gallery')}
				tabs={tabs}
				value={tab.value}
				onChange={setSelectedTab}
				aside={note}
			>
				{matrix}
			</Tabs>
		</div>
	);
}
