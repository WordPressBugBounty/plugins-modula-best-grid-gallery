import { __ } from '@wordpress/i18n';
import { decodedText } from './serverText';

// The accounts the Connections card knows: the field type each must have,
// by the settings class's field id. Their names are the fields' labels.
const ACCOUNT_TYPES = {
	instagram: 'oauth',
	youtube: 'oauth',
	vimeo_credentials: 'credentials_group',
};

// App key fields of a credentials group, by field name: the control each
// needs (a text input, a masked input, or a read-only value with Copy).
const KEY_KINDS = {
	'modula_video_vimeo_creds.client_id': 'text',
	'modula_video_vimeo_creds.client_secret': 'password',
	vimeo_redirect_uri: 'copy',
};

/**
 * Whether the card can show every value of a field: an account it knows,
 * of the expected kind, whose app keys it all knows.
 *
 * @param {Object} field Config field.
 * @return {boolean} Whether the field fits.
 */
function isKnownAccount(field) {
	return (
		Object.hasOwn(ACCOUNT_TYPES, field.id) &&
		ACCOUNT_TYPES[field.id] === field.type &&
		(field.fields ?? []).every((key) => Object.hasOwn(KEY_KINDS, key.name))
	);
}

/**
 * A credentials group's app keys.
 *
 * @param {Object} field Account field.
 * @return {Object[]} Keys: `{ name, label, kind, readOnly, stored }`.
 */
function accountKeys(field) {
	return (field.fields ?? []).map((key) => ({
		name: key.name,
		label: decodedText(key.label),
		kind: KEY_KINDS[key.name],
		readOnly: 'copy' === KEY_KINDS[key.name] || true === key.readonly,
		stored: key.default ?? '',
	}));
}

/**
 * The OAuth part of a field: the field itself for `oauth`, its `oauth`
 * object for `credentials_group`.
 *
 * @param {Object} field
 * @return {Object} Status, connect, refresh, disconnect and docs.
 */
function oauthOf(field) {
	return 'credentials_group' === field.type ? (field.oauth ?? {}) : field;
}

/**
 * Whether a connect address leads somewhere: the server sends '#' when it
 * has none (Pro missing, already connected).
 *
 * @param {*} href
 * @return {boolean} Whether it is usable.
 */
function isUsableHref(href) {
	return 'string' === typeof href && '' !== href && '#' !== href;
}

/**
 * The actions an account offers in its state: Connect while not connected;
 * Refresh (when the server has a refresh call) and Disconnect once
 * connected. Labels follow the design.
 *
 * @param {Object}  oauth     The account's OAuth part.
 * @param {boolean} connected
 * @return {Object[]} Actions: `{ kind, label, href, disabled }` or `{ kind, label, api }`.
 */
function accountActions(oauth, connected) {
	if (!connected) {
		if (!oauth.connect) {
			return [];
		}
		return [
			{
				kind: 'connect',
				label: __('Connect', 'modula-best-grid-gallery'),
				href: oauth.connect.href,
				disabled:
					true === oauth.connect.disabled ||
					!isUsableHref(oauth.connect.href),
			},
		];
	}
	const calls = [
		['refresh', __('Refresh', 'modula-best-grid-gallery')],
		['disconnect', __('Disconnect', 'modula-best-grid-gallery')],
	];

	return calls
		.filter(([kind]) => oauth[kind]?.api?.path)
		.map(([kind, label]) => ({
			kind,
			label,
			api: {
				path: oauth[kind].api.path,
				method: oauth[kind].api.method ?? 'POST',
				data: oauth[kind].api.data ?? {},
			},
		}));
}

/**
 * One account row.
 *
 * @param {Object} field Account field.
 * @return {Object} Row.
 */
function accountRow(field) {
	const oauth = oauthOf(field);
	const connected = true === oauth.status?.connected;

	return {
		id: field.id,
		label: decodedText(field.label),
		connected,
		status: connected
			? oauth.status.textConnected
			: oauth.status?.textDisconnected,
		actions: accountActions(oauth, connected),
		docs: oauth.docs?.href ? oauth.docs : null,
		locked: true === field.locked,
		// The plan slug, as the projection keeps it for cards; '' means none.
		badge:
			'string' === typeof field.badge && '' !== field.badge
				? field.badge
				: null,
		keys: accountKeys(field),
	};
}

/**
 * The account rows of the Connections card, from the social media fields.
 *
 * @param {{ fields?: Object[] }} config Social media card config.
 * @return {Object[]|null} Rows; null when a field is not an account the card
 *                         knows (the card then shows as unavailable, rather
 *                         than hiding a setting).
 */
export function accountRows({ fields = [] }) {
	if (!fields.every(isKnownAccount)) {
		return null;
	}

	return fields.map(accountRow);
}
