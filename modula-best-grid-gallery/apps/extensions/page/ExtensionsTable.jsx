import { __, sprintf } from '@wordpress/i18n';
import { Button, ExternalIcon, Toggle } from 'admin-ui';
import { groupAction, switchChange } from '../model/extensionChanges';

/**
 * @typedef {import('../model/extensionChanges').ExtensionChange} ExtensionChange
 */

/**
 * The page's change state the rows need.
 *
 * @typedef {Object} ChangeControls
 * @property {ExtensionChange|null} pendingChange Being checked or saved.
 * @property {boolean}              isBusy        A change is in progress; the others wait.
 * @property {Function}             onRequest     Receives the `ExtensionChange` a control asks for, or null.
 */

/**
 * The state a pending change is setting on the extension, or null when the
 * extension is not part of it.
 *
 * @param {ExtensionChange|null} pendingChange
 * @param {string}               slug
 * @return {boolean|null} Requested state.
 */
function pendingState(pendingChange, slug) {
	if (!pendingChange?.slugs.includes(slug)) {
		return null;
	}

	return 'activate' === pendingChange.status;
}

/**
 * Link to the extension's section in Modula Settings, shown while it is
 * active. Same tab: it is part of Modula's admin.
 *
 * @param {Object}                                              props
 * @param {import('../model/extensionsPageModel').ExtensionRow} props.extension
 */
function SettingsLink({ extension }) {
	return (
		<a
			className="modula-extensions-table__settings"
			href={extension.settings}
			aria-label={sprintf(
				/* translators: %s: extension name, e.g. Video. */
				__('%s settings', 'modula-best-grid-gallery'),
				extension.name
			)}
		>
			{__('Settings', 'modula-best-grid-gallery')}
		</a>
	);
}

/**
 * One extension: name (and its Settings link while active), description and
 * its on/off switch. The switch is disabled while the extension is
 * unavailable; while its change saves it shows the requested state.
 *
 * @param {Object}                                              props
 * @param {import('../model/extensionsPageModel').ExtensionRow} props.extension
 * @param {ChangeControls}                                      props.controls
 */
function ExtensionRow({ extension, controls }) {
	const pending = pendingState(controls.pendingChange, extension.slug);
	const isPending = null !== pending;
	const classes = [
		'modula-extensions-table__row',
		extension.active ? 'is-active' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<tr className={classes}>
			<th scope="row" className="modula-extensions-table__name">
				<span className="modula-extensions-table__name-text">
					{extension.name}
				</span>
				{extension.active && extension.settings ? (
					<SettingsLink extension={extension} />
				) : null}
			</th>
			<td className="modula-extensions-table__description">
				{extension.description}
			</td>
			<td className="modula-extensions-table__status">
				<Toggle
					checked={isPending ? pending : extension.active}
					disabled={!extension.available}
					aria-label={extension.name}
					aria-busy={isPending || undefined}
					aria-disabled={controls.isBusy || undefined}
					data-extension-switch={extension.slug}
					onChange={(active) =>
						controls.onRequest(switchChange(extension, active))
					}
				/>
			</td>
		</tr>
	);
}

/**
 * Pricing link of a plan that offers an upgrade. No prices: the pricing
 * page has them.
 *
 * @param {Object}                                           props
 * @param {import('../model/extensionsPageModel').PlanGroup} props.group
 */
function UpgradeLink({ group }) {
	return (
		<Button
			variant="primary"
			href={group.upgrade_url}
			target="_blank"
			rel="noopener noreferrer"
		>
			{sprintf(
				/* translators: %s: plan name, e.g. Trio. */
				__('Upgrade to %s', 'modula-best-grid-gallery'),
				group.label
			)}
			<ExternalIcon />
			<span className="modula-admin-sr-only">
				{__('(opens in a new tab)', 'modula-best-grid-gallery')}
			</span>
		</Button>
	);
}

/**
 * Activate all / Deactivate all for a plan the site covers.
 *
 * @param {Object}                                      props
 * @param {NonNullable<ReturnType<typeof groupAction>>} props.action
 * @param {ChangeControls}                              props.controls
 */
function GroupActionButton({ action, controls }) {
	const isPending =
		'group' === controls.pendingChange?.scope &&
		action.change.owner === controls.pendingChange.owner;

	return (
		<Button
			variant="link"
			aria-label={action.ariaLabel}
			aria-busy={isPending || undefined}
			aria-disabled={controls.isBusy || undefined}
			onClick={() => controls.onRequest(action.change)}
		>
			{action.label}
		</Button>
	);
}

/**
 * A plan's rows: its heading (name, number of extensions shown, and either
 * Activate all / Deactivate all or, when the route offers one, the upgrade
 * link), then its extensions.
 *
 * @param {Object}                                           props
 * @param {import('../model/extensionsPageModel').PlanGroup} props.group
 * @param {ChangeControls}                                   props.controls
 */
function PlanGroupRows({ group, controls }) {
	const title = sprintf(
		/* translators: %s: plan name, e.g. Trio. */
		__('%s plan', 'modula-best-grid-gallery'),
		group.label
	);
	const action = groupAction(group);

	return (
		<tbody aria-label={title}>
			<tr className="modula-extensions-table__group">
				<th scope="rowgroup" colSpan={2}>
					<span className="modula-extensions-table__group-title">
						{title}
					</span>{' '}
					<span className="modula-extensions-table__group-count">
						({group.extensions.length})
					</span>
				</th>
				<td className="modula-extensions-table__group-action">
					{group.upgrade_url ? <UpgradeLink group={group} /> : null}
					{action ? (
						<GroupActionButton
							action={action}
							controls={controls}
						/>
					) : null}
				</td>
			</tr>
			{group.extensions.map((extension) => (
				<ExtensionRow
					key={extension.slug}
					extension={extension}
					controls={controls}
				/>
			))}
		</tbody>
	);
}

/**
 * The extensions table, grouped by plan in catalog order.
 *
 * @param {Object}                                             props
 * @param {import('../model/extensionsPageModel').PlanGroup[]} props.groups       Groups the filter shows.
 * @param {string}                                             props.emptyMessage Shown when no group is left.
 * @param {ChangeControls}                                     props.controls
 */
export function ExtensionsTable({ groups, emptyMessage, controls }) {
	return (
		<table className="modula-extensions-table">
			<caption className="modula-admin-sr-only">
				{__('Extensions', 'modula-best-grid-gallery')}
			</caption>
			<thead className="modula-extensions-table__head">
				<tr>
					<th scope="col" className="modula-extensions-table__name">
						{__('Extension', 'modula-best-grid-gallery')}
					</th>
					<th
						scope="col"
						className="modula-extensions-table__description"
					>
						{__('Description', 'modula-best-grid-gallery')}
					</th>
					<th scope="col" className="modula-extensions-table__status">
						{__('Status', 'modula-best-grid-gallery')}
					</th>
				</tr>
			</thead>
			{0 === groups.length ? (
				<tbody>
					<tr>
						<td
							colSpan={3}
							className="modula-extensions-table__empty"
						>
							{emptyMessage}
						</td>
					</tr>
				</tbody>
			) : (
				groups.map((group) => (
					<PlanGroupRows
						key={group.plan}
						group={group}
						controls={controls}
					/>
				))
			)}
		</table>
	);
}
