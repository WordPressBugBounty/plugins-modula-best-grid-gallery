import { __ } from '@wordpress/i18n';
import { storedBoolean } from '../model/settingsPageModel';

/**
 * The stored key of a role's Access toggle (`{role}.enabled`), which is also
 * its matrix column id.
 */
const ACCESS_KEY = 'enabled';

/**
 * Matrix tabs by role field group, in design order. Each column id is the
 * key the settings class stores the permission under, inside the role's
 * entry of the roles option.
 *
 * @return {{ value: string, label: string, columns: { id: string, label: string }[] }[]} Tabs.
 */
function tabDefinitions() {
	const access = {
		id: ACCESS_KEY,
		label: __('Access', 'modula-best-grid-gallery'),
	};
	const editOwn = __('Edit own', 'modula-best-grid-gallery');
	const editOthers = __('Edit others', 'modula-best-grid-gallery');
	const publish = __('Publish', 'modula-best-grid-gallery');
	const deleteOwn = __('Delete own', 'modula-best-grid-gallery');
	const deleteOthers = __('Delete others', 'modula-best-grid-gallery');
	const privateLabel = __('Private', 'modula-best-grid-gallery');

	return [
		{
			value: 'gallery',
			label: __('Galleries', 'modula-best-grid-gallery'),
			columns: [
				access,
				{ id: 'edit_galleries', label: editOwn },
				{ id: 'edit_other_galleries', label: editOthers },
				{ id: 'publish_galleries', label: publish },
				{ id: 'delete_galleries', label: deleteOwn },
				{ id: 'delete_others_galleries', label: deleteOthers },
				{ id: 'read_private_galleries', label: privateLabel },
				{
					id: 'upload_files',
					label: __('Upload', 'modula-best-grid-gallery'),
				},
			],
		},
		// Upload is one WordPress capability, offered on Galleries only.
		{
			value: 'album',
			label: __('Albums', 'modula-best-grid-gallery'),
			columns: [
				access,
				{ id: 'edit_albums', label: editOwn },
				{ id: 'edit_others_albums', label: editOthers },
				{ id: 'publish_albums', label: publish },
				{ id: 'delete_albums', label: deleteOwn },
				{ id: 'delete_others_albums', label: deleteOthers },
				{ id: 'read_private_albums', label: privateLabel },
			],
		},
	];
}

/**
 * Splits a field name into the role's key in the roles option and the key
 * stored inside that entry (`editor_album.publish_albums` →
 * `['editor_album', 'publish_albums']`). fitsMatrix() rejects names that do
 * not split.
 *
 * @param {string} name Field name.
 * @return {string[]|null} Role key and stored key; null without both.
 */
function splitName(name) {
	const dot = 'string' === typeof name ? name.indexOf('.') : -1;
	if (dot <= 0 || dot === name.length - 1) {
		return null;
	}

	return [name.slice(0, dot), name.slice(dot + 1)];
}

/**
 * The stored keys of a role field's permissions.
 *
 * @param {Object} field Role field (checked by fitsMatrix()).
 * @return {string[]} Keys inside the role's entry.
 */
function permissionKeysOf(field) {
	return (field.fields || []).map((child) => splitName(child.name)[1]);
}

/**
 * Whether the matrix can show every value of a field: a role field of a
 * known tab, named `{role}.enabled`, whose permissions are all
 * `{role}.{key}` with a column for the key.
 *
 * @param {Object}   field Config field.
 * @param {Object[]} tabs  Tab definitions.
 * @return {boolean} Whether the field fits.
 */
function fitsMatrix(field, tabs) {
	const tab = tabs.find((candidate) => candidate.value === field.group);
	const access = splitName(field.name);
	if (
		'role' !== field.type ||
		undefined === tab ||
		null === access ||
		ACCESS_KEY !== access[1]
	) {
		return false;
	}
	const columnIds = tab.columns.map((column) => column.id);

	return (field.fields || []).every((child) => {
		const permission = splitName(child.name);

		return (
			null !== permission &&
			access[0] === permission[0] &&
			columnIds.includes(permission[1])
		);
	});
}

/**
 * One matrix row from a role field: a checkbox per permission the role has a
 * field for, and null (not applicable) for the rest.
 *
 * @param {Object}   field   Role field.
 * @param {Object[]} columns The tab's columns.
 * @param {Object}   values  The roles option's current value.
 * @return {Object} Matrix row.
 */
function matrixRow(field, columns, values) {
	const [id] = splitName(field.name);
	const roleValue = values[id];
	const permissionKeys = permissionKeysOf(field);
	const hasAccess = storedBoolean(roleValue?.[ACCESS_KEY]);
	const permissionCell = (key) => {
		if (!permissionKeys.includes(key)) {
			return null;
		}
		const checked = storedBoolean(roleValue?.[key]);

		return hasAccess ? checked : { checked, disabled: true };
	};
	const cells = Object.fromEntries(
		columns.map((column) => [
			column.id,
			ACCESS_KEY === column.id ? hasAccess : permissionCell(column.id),
		])
	);

	return { id, label: field.label, cells };
}

/**
 * The edit one matrix cell makes, as a field path inside the roles option
 * and its value. A permission stores under `{role}.{permission}`. Access, as
 * the old role card did, also sets every permission of the role to its own
 * value, so it stores the role's whole entry; a save then stores what the
 * old card stored.
 *
 * @param {{ fields?: Object[] }} config   Roles card config (checked by roleMatrixTabs()).
 * @param {Object}                values   The roles option's current value.
 * @param {string}                roleKey  Matrix row id: the role's key in the option (`editor`, `editor_album`).
 * @param {string}                columnId Matrix column id: the stored key.
 * @param {boolean}               next     New cell value.
 * @return {{ name: string, value: * }} Field path and value to record.
 */
export function roleMatrixEdit(
	{ fields = [] },
	values,
	roleKey,
	columnId,
	next
) {
	if (ACCESS_KEY !== columnId) {
		return { name: `${roleKey}.${columnId}`, value: next };
	}
	const field = fields.find(
		(candidate) => `${roleKey}.${ACCESS_KEY}` === candidate.name
	);
	const permissions = Object.fromEntries(
		permissionKeysOf(field).map((key) => [key, next])
	);

	return {
		name: roleKey,
		value: { ...values[roleKey], [ACCESS_KEY]: next, ...permissions },
	};
}

/**
 * The Roles matrix tabs from the roles card config and the option's current
 * values. A tab shows only when the server sends roles for it (Albums needs
 * Pro Albums).
 *
 * @param {{ fields?: Object[] }} config Roles card config.
 * @param {Object}                values The roles option's current value.
 * @return {Object[]|null} Tabs, each with its columns and rows; null when a
 *                         field does not fit the matrix (the card then shows
 *                         as unavailable, rather than hiding a setting).
 */
export function roleMatrixTabs({ fields = [] }, values) {
	const tabs = tabDefinitions();
	if (!fields.every((field) => fitsMatrix(field, tabs))) {
		return null;
	}

	return tabs
		.map((tab) => ({
			...tab,
			rows: fields
				.filter((field) => tab.value === field.group)
				.map((field) => matrixRow(field, tab.columns, values)),
		}))
		.filter((tab) => tab.rows.length > 0);
}
