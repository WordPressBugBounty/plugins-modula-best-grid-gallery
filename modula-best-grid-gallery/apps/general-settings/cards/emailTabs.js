import { __ } from '@wordpress/i18n';
import { valueAtPath } from '../model/settingsPageModel';
import { placeholdersIn } from './emailTemplate';
import { decodedText } from './serverText';

/**
 * The Email tabs the card knows, by the server's submenu value, with the
 * design's card title and the kind of action its button is.
 *
 * @return {Object<string, { title: string, action: string }>} Tabs by value.
 */
function knownTabs() {
	return {
		sender: {
			title: __('Sender', 'modula-best-grid-gallery'),
			action: 'test',
		},
		invitation: {
			title: __('Invitation email', 'modula-best-grid-gallery'),
			action: 'reset',
		},
		selection: {
			title: __(
				'Photographer notification email',
				'modula-best-grid-gallery'
			),
			action: 'reset',
		},
	};
}

/**
 * The rows a tab can show, by field name: the field kind the server must
 * send, the control, and whether the server's help stays. Sender has its own
 * fields, named by their server labels and, as in the design, without help.
 * Each template has `{tab}.subject`, whose help states a fact the design
 * leaves out (the recipient), and `{tab}.body`, whose help lists the
 * placeholders the editor offers as Insert chips. Their labels stay short:
 * the tab names the email, which the server's labels repeat for search.
 *
 * @param {string} tab Tab value.
 * @return {Object<string, Object>} Rows by field name.
 */
function knownRows(tab) {
	if ('sender' === tab) {
		return {
			from_name: { type: 'text', kind: 'text' },
			from_email: { type: 'text', kind: 'email' },
			reply_to: {
				type: 'text',
				kind: 'email',
				placeholder: __(
					'Same as From email',
					'modula-best-grid-gallery'
				),
			},
			logo_id: { type: 'image_select', kind: 'logo' },
		};
	}

	return {
		[`${tab}.subject`]: {
			type: 'text',
			label: __('Subject', 'modula-best-grid-gallery'),
			kind: 'text',
			keepsHelp: true,
		},
		[`${tab}.body`]: {
			type: 'code_editor',
			label: __('Message', 'modula-best-grid-gallery'),
			kind: 'editor',
			listsPlaceholders: true,
		},
	};
}

/**
 * Sender's read-only "Sending address" line. The design has none: its From
 * name and From email rows already say it.
 *
 * @param {Object} field
 * @return {boolean} Whether the card leaves it out.
 */
function isSenderPreview(field) {
	return 'paragraph' === field.type && 'from_preview' === field.name;
}

/**
 * Whether the card can show a field on its tab: a known row of the expected
 * kind, or a button whose route, when it has one, names a path.
 *
 * @param {Object} field
 * @param {Object} rows  The tab's known rows.
 * @return {boolean} Whether the field fits.
 */
function fitsTab(field, rows) {
	if ('button' === field.type) {
		return (
			undefined === field.api ||
			('string' === typeof field.api?.path && '' !== field.api.path)
		);
	}

	return (
		Object.hasOwn(rows, field.name ?? '') &&
		rows[field.name].type === field.type
	);
}

/**
 * Sender's button: "Send a test email" through its route. A button without
 * a route (Lite's placeholder) gives an action that cannot run.
 *
 * @param {Object} button The server's button field.
 * @return {Object} Action: `{ kind, label, busyLabel, api }`.
 */
function testAction(button) {
	return {
		kind: 'test',
		label: __('Send a test email', 'modula-best-grid-gallery'),
		busyLabel: __('Sending…', 'modula-best-grid-gallery'),
		api: button.api
			? {
					path: button.api.path,
					method: button.api.method ?? 'POST',
					data: button.api.data ?? {},
				}
			: null,
	};
}

/**
 * A template's button: "Reset to default" puts the default subject and
 * body back as edits, from each row's `resetValue`. Pro's reset route is not
 * called: it writes the option at once. Without a default for every row,
 * the action cannot run.
 *
 * @param {Object[]} rows The template's rows.
 * @return {Object} Action: `{ kind, label, values }`, values by field name or null.
 */
function resetAction(rows) {
	const values = rows.every((row) => null !== row.resetValue)
		? Object.fromEntries(rows.map((row) => [row.name, row.resetValue]))
		: null;

	return {
		kind: 'reset',
		label: __('Reset to default', 'modula-best-grid-gallery'),
		values,
	};
}

/**
 * A row from its field and the card's known row.
 *
 * @param {Object} field The server's field.
 * @param {Object} known The known row for its name (see knownRows()).
 * @return {Object} Row: `{ name, label, kind, src, stored, resetValue, help, placeholders, … }`.
 */
function tabRow(field, known) {
	const { keepsHelp = false, listsPlaceholders = false, ...row } = known;

	return {
		name: field.name,
		...row,
		// The server's label, unless the known row has its own (templates).
		label: row.label ?? decodedText(field.label),
		src: field.src ?? null,
		stored: field.default ?? '',
		// Lite adds Pro's default subject and body to Pro's fields.
		resetValue:
			'string' === typeof field.resetValue ? field.resetValue : null,
		help: keepsHelp ? (field.description ?? null) : null,
		placeholders: listsPlaceholders
			? placeholdersIn(field.description)
			: [],
	};
}

/**
 * One tab: its rows and its action.
 *
 * @param {Object}   option The submenu option.
 * @param {Object}   tab    Known tab.
 * @param {Object}   rows   The tab's known rows.
 * @param {Object[]} fields The tab's fields (checked by fitsTab()).
 * @return {Object} Tab.
 */
function emailTab(option, tab, rows, fields) {
	const button = fields.find((field) => 'button' === field.type);
	const tabRows = fields
		.filter((field) => 'button' !== field.type)
		.map((field) => tabRow(field, rows[field.name]));
	const actionOf = {
		test: () => testAction(button),
		reset: () => resetAction(tabRows),
	};

	return {
		value: option.value,
		label: option.label,
		title: tab.title,
		rows: tabRows,
		action: button ? actionOf[tab.action]() : null,
	};
}

/**
 * The Email section's tabs from the proofing email config.
 *
 * @param {{ submenu?: Object, fields?: Object[] }} config Image proofing card config.
 * @return {Object[]|null} Tabs; null when a tab or field is one the card does
 *                         not know, or a tab has more than one button (the
 *                         card then shows as unavailable, rather than
 *                         hiding a setting).
 */
export function emailTabs({ submenu, fields = [] }) {
	const tabs = knownTabs();
	const options = submenu?.options ?? [];
	if (!options.every((option) => Object.hasOwn(tabs, option.value))) {
		return null;
	}
	const shownFields = fields.filter((field) => !isSenderPreview(field));
	const byTab = options.map((option) => ({
		option,
		rows: knownRows(option.value),
		fields: shownFields.filter((field) => option.value === field.group),
	}));
	const placedCount = byTab.reduce(
		(count, entry) => count + entry.fields.length,
		0
	);
	const isKnown =
		placedCount === shownFields.length &&
		byTab.every(
			(entry) =>
				entry.fields.every((field) => fitsTab(field, entry.rows)) &&
				entry.fields.filter((field) => 'button' === field.type)
					.length <= 1
		);
	if (!isKnown) {
		return null;
	}

	return byTab.map((entry) =>
		emailTab(
			entry.option,
			tabs[entry.option.value],
			entry.rows,
			entry.fields
		)
	);
}

/**
 * Whether any row of any tab differs from its stored value. Pro's routes
 * read the stored option, so the test email and Reset wait for the Save.
 *
 * @param {Object[]} tabs   Tabs from emailTabs().
 * @param {Object}   values The option's current value.
 * @return {boolean} Whether edits are unsaved.
 */
export function hasUnsavedEdits(tabs, values) {
	return tabs.some((tab) => tab.rows.some((row) => isEdited(row, values)));
}

/**
 * Whether a template holds its defaults as unsaved edits: Reset was
 * pressed, and neither saved nor edited since.
 *
 * @param {Object} tab    A template tab from emailTabs().
 * @param {Object} values The option's current value.
 * @return {boolean} Whether the reset waits for the Save.
 */
export function holdsUnsavedReset(tab, values) {
	return (
		tab.rows.every((row) => valueOf(row, values) === row.resetValue) &&
		tab.rows.some((row) => isEdited(row, values))
	);
}

/**
 * @param {Object} row    A row from emailTabs().
 * @param {Object} values The option's current value.
 * @return {*} The row's current value: the edit, else the stored value.
 */
function valueOf(row, values) {
	return valueAtPath(values, row.name) ?? row.stored;
}

/**
 * @param {Object} row    A row from emailTabs().
 * @param {Object} values The option's current value.
 * @return {boolean} Whether the row differs from its stored value.
 */
function isEdited(row, values) {
	return valueOf(row, values) !== row.stored;
}
