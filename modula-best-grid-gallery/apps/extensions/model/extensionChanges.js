import { __, _n, sprintf } from '@wordpress/i18n';
import { filterShows } from './extensionsPageModel';

/**
 * @typedef {import('./extensionsPageModel').ExtensionRow}    ExtensionRow
 * @typedef {import('./extensionsPageModel').PlanGroup}       PlanGroup
 * @typedef {import('./extensionsPageModel').ExtensionFilter} ExtensionFilter
 */

/**
 * @typedef {'activate' | 'deactivate'} ChangeStatus
 */

/**
 * One save: what an extension's switch or a group's Activate all /
 * Deactivate all asks Compatible Pro to do, in one request.
 *
 * @typedef {Object} ExtensionChange
 * @property {'extension' | 'group'} scope   What the admin used.
 * @property {string}                owner   Its slug: the extension's, or the group's plan.
 * @property {string}                subject Extension name, or plan name for a group.
 * @property {ChangeStatus}          status  Turn them on or off.
 * @property {string[]}              slugs   Extensions whose state changes, in catalog order.
 */

/**
 * Where focus goes after a change: a row's switch, or the filter's selected
 * option.
 *
 * @typedef {{ kind: 'switch', slug: string } | { kind: 'filter' }} FocusTarget
 */

/** Its deactivation clears every gallery and album password (Compatible Pro hook). */
export const PASSWORD_PROTECT = 'modula-password-protect';

/**
 * The change an extension's switch makes when set to `active`.
 *
 * @param {ExtensionRow} extension
 * @param {boolean}      active    Requested state.
 * @return {ExtensionChange|null} Null when the extension is locked or already in that state.
 */
export function switchChange(extension, active) {
	if (!extension.available || extension.active === active) {
		return null;
	}

	return {
		scope: 'extension',
		owner: extension.slug,
		subject: extension.name,
		status: active ? 'activate' : 'deactivate',
		slugs: [extension.slug],
	};
}

/**
 * A group's Activate all / Deactivate all. With every usable extension on it
 * deactivates them; otherwise it activates the ones that are off. Only the
 * extensions whose state changes are sent, so no hook runs for the others.
 *
 * @param {PlanGroup} group
 * @return {{ label: string, ariaLabel: string, change: ExtensionChange }|null} Null for a group the site does not cover.
 */
export function groupAction(group) {
	const usable = group.extensions.filter((row) => row.available);

	if (!group.covered || 0 === usable.length) {
		return null;
	}

	const allActive = usable.every((row) => row.active);
	const status = allActive ? 'deactivate' : 'activate';
	const ariaLabel = allActive
		? /* translators: %s: plan name, e.g. Trio. */
			__('Deactivate all %s extensions', 'modula-best-grid-gallery')
		: /* translators: %s: plan name, e.g. Trio. */
			__('Activate all %s extensions', 'modula-best-grid-gallery');

	return {
		label: allActive
			? __('Deactivate all', 'modula-best-grid-gallery')
			: __('Activate all', 'modula-best-grid-gallery'),
		ariaLabel: sprintf(ariaLabel, group.label),
		change: {
			scope: 'group',
			owner: group.plan,
			subject: group.label,
			status,
			slugs: usable
				.filter((row) => row.active === allActive)
				.map((row) => row.slug),
		},
	};
}

/**
 * Whether the change turns Password Protect off, which removes every gallery
 * and album password, so it needs the admin's confirmation first.
 *
 * @param {ExtensionChange} change
 * @return {boolean} Whether passwords are removed.
 */
export function removesPasswords(change) {
	return (
		'deactivate' === change.status &&
		change.slugs.includes(PASSWORD_PROTECT)
	);
}

/**
 * The confirmation before a change turns Password Protect off: the question
 * names what the admin asked for, the message how many galleries and albums
 * lose their password.
 *
 * @param {ExtensionChange} change
 * @param {number}          count  Password-protected galleries and albums.
 * @return {{ title: string, message: string, confirmLabel: string }} Dialog copy.
 */
export function passwordConfirmation(change, count) {
	const isGroup = 'group' === change.scope;
	const title = isGroup
		? /* translators: %s: plan name, e.g. Trio. */
			__('Deactivate all %s extensions?', 'modula-best-grid-gallery')
		: /* translators: %s: extension name, e.g. Password Protect. */
			__('Turn off %s?', 'modula-best-grid-gallery');

	return {
		title: sprintf(title, change.subject),
		message: sprintf(
			/* translators: %d: number of password-protected galleries and albums. */
			_n(
				'This removes the password from %d gallery or album.',
				'This removes the password from %d galleries and albums.',
				count,
				'modula-best-grid-gallery'
			),
			count
		),
		confirmLabel: isGroup
			? __('Deactivate all', 'modula-best-grid-gallery')
			: __('Turn off', 'modula-best-grid-gallery'),
	};
}

// Toast texts by scope and status: a whole sentence each, for translators.
const MESSAGES = {
	extension: {
		activate: {
			/* translators: %s: extension name, e.g. Video. */
			done: () => __('%s activated', 'modula-best-grid-gallery'),
			failed: () =>
				/* translators: %s: extension name, e.g. Video. */
				__(
					'%s could not be activated. Nothing changed.',
					'modula-best-grid-gallery'
				),
		},
		deactivate: {
			/* translators: %s: extension name, e.g. Video. */
			done: () => __('%s deactivated', 'modula-best-grid-gallery'),
			failed: () =>
				/* translators: %s: extension name, e.g. Video. */
				__(
					'%s could not be deactivated. Nothing changed.',
					'modula-best-grid-gallery'
				),
		},
	},
	group: {
		activate: {
			done: () =>
				/* translators: %s: plan name, e.g. Trio. */
				__('%s extensions activated', 'modula-best-grid-gallery'),
			failed: () =>
				/* translators: %s: plan name, e.g. Trio. */
				__(
					'%s extensions could not be activated. Nothing changed.',
					'modula-best-grid-gallery'
				),
		},
		deactivate: {
			done: () =>
				/* translators: %s: plan name, e.g. Trio. */
				__('%s extensions deactivated', 'modula-best-grid-gallery'),
			failed: () =>
				/* translators: %s: plan name, e.g. Trio. */
				__(
					'%s extensions could not be deactivated. Nothing changed.',
					'modula-best-grid-gallery'
				),
		},
	},
};

/**
 * The toast texts for the change's scope and status.
 *
 * @param {ExtensionChange} change
 * @return {{ done: () => string, failed: () => string }} Texts.
 */
function changeMessages(change) {
	const has = (table, key) =>
		Object.prototype.hasOwnProperty.call(table, key);
	const byStatus = has(MESSAGES, change.scope)
		? MESSAGES[change.scope]
		: null;

	if (!byStatus || !has(byStatus, change.status)) {
		throw new Error(
			`Unknown extension change: ${change.scope} ${change.status}`
		);
	}

	return byStatus[change.status];
}

/**
 * Success toast for a saved change ("Video activated").
 *
 * @param {ExtensionChange} change
 * @return {string} Message.
 */
export function changeSucceededMessage(change) {
	return sprintf(changeMessages(change).done(), change.subject);
}

/**
 * Error toast for a change the server refused or never received.
 *
 * @param {ExtensionChange} change
 * @return {string} Message.
 */
export function changeFailedMessage(change) {
	return sprintf(changeMessages(change).failed(), change.subject);
}

/**
 * The groups with the change applied; unchanged groups keep their identity.
 *
 * @param {PlanGroup[]}     groups
 * @param {ExtensionChange} change
 * @return {PlanGroup[]} Groups.
 */
export function applyChange(groups, change) {
	const active = 'activate' === change.status;
	const changes = (row) => change.slugs.includes(row.slug);

	return groups.map((group) =>
		group.extensions.some(changes)
			? {
					...group,
					extensions: group.extensions.map((row) =>
						changes(row) ? { ...row, active } : row
					),
				}
			: group
	);
}

/**
 * Whether the filter stops showing extensions after the change.
 *
 * @param {ExtensionChange} change
 * @param {ExtensionFilter} filter
 * @return {boolean} Whether the changed rows leave the table.
 */
function changeHidesRows(change, filter) {
	return !filterShows(filter, { active: 'activate' === change.status });
}

/**
 * Where focus goes once a change is saved. When the filter hides the changed
 * row, the nearest following switch the admin can use takes focus, else the
 * nearest preceding one, else the filter. A group action the filter hides
 * passes focus to the filter.
 *
 * @param {PlanGroup[]}     visible Groups the filter showed when the change was asked.
 * @param {ExtensionChange} change
 * @param {ExtensionFilter} filter
 * @return {FocusTarget|null} Null when focus can stay where it is.
 */
export function focusAfterChange(visible, change, filter) {
	if (!changeHidesRows(change, filter)) {
		return null;
	}

	if ('group' === change.scope) {
		return { kind: 'filter' };
	}

	const rows = visible.flatMap((group) => group.extensions);
	const index = rows.findIndex((row) => row.slug === change.slugs[0]);
	const canTakeFocus = (row) =>
		row.available && !change.slugs.includes(row.slug);
	const next =
		rows.slice(index + 1).find(canTakeFocus) ??
		rows.slice(0, index).reverse().find(canTakeFocus);

	return next ? { kind: 'switch', slug: next.slug } : { kind: 'filter' };
}
