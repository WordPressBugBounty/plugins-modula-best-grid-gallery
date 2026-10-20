import { dateI18n, getSettings } from '@wordpress/date';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Connection kinds, as the connections list and the activity show them. `administrator`
 * marks a site-wide activity row, labelled with the administrator who acted.
 */
export const KIND_LABELS = {
	oauth: () => __('Signed in', 'modula-best-grid-gallery'),
	password: () => __('Password', 'modula-best-grid-gallery'),
	administrator: () => __('Administrator', 'modula-best-grid-gallery'),
};

/** @param {string} kind Connection kind; an unknown one shows as itself. */
export function kindLabel(kind) {
	return KIND_LABELS[kind]?.() ?? kind;
}

/** @param {number} timestamp Unix time, in the site's date and time format. */
export function formatTime(timestamp) {
	return dateI18n(getSettings().formats.datetime, new Date(timestamp * 1000));
}

const ACCESS_LABELS = {
	'read-write': () => __('Read & write', 'modula-best-grid-gallery'),
	'read-only': () => __('Read only', 'modula-best-grid-gallery'),
};

/**
 * A connection's details, in reading order: who approved it, its access, when it was
 * created and last used. Join them for display.
 *
 * @param {{approver: ?string, access: ?string, created: number, last_used: ?number}} connection Row of the list route.
 * @return {string[]} Details.
 */
export function connectionDetails(connection) {
	const details = [];
	if (connection.approver) {
		details.push(
			sprintf(
				/* translators: %s: name of the administrator who approved the connection */
				__('Approved by %s', 'modula-best-grid-gallery'),
				connection.approver
			)
		);
	}
	if (connection.access) {
		details.push(ACCESS_LABELS[connection.access]?.() ?? connection.access);
	}
	details.push(
		sprintf(
			/* translators: %s: date and time */
			__('Created %s', 'modula-best-grid-gallery'),
			formatTime(connection.created)
		),
		connection.last_used
			? sprintf(
					/* translators: %s: date and time */
					__('Last used %s', 'modula-best-grid-gallery'),
					formatTime(connection.last_used)
				)
			: __('Never used', 'modula-best-grid-gallery')
	);

	return details;
}

const EVENT_LABELS = {
	connect: () => __('Connected', 'modula-best-grid-gallery'),
	disconnect: () => __('Disconnected', 'modula-best-grid-gallery'),
	regenerate: () => __('Password regenerated', 'modula-best-grid-gallery'),
	'turned-on': () => __('Connections turned on', 'modula-best-grid-gallery'),
	'turned-off': () =>
		__('Connections turned off', 'modula-best-grid-gallery'),
};

/**
 * Why Password connections are unavailable. Application Passwords only back the password
 * fallback; signing in through OAuth works without them.
 *
 * @param {string} reason `application_passwords.reason` from the status route.
 * @return {string} Explanation.
 */
export function passwordsUnavailable(reason) {
	if (reason === 'https_required') {
		return __(
			'Password connections are unavailable: Application Passwords need HTTPS, or a site marked as local (WP_ENVIRONMENT_TYPE).',
			'modula-best-grid-gallery'
		);
	}
	return __(
		'Password connections are unavailable: Application Passwords are turned off by a filter or another plugin.',
		'modula-best-grid-gallery'
	);
}

/** How to use each fallback config format, keyed by the format the server reports. */
const CONFIG_INTROS = {
	shell: () =>
		/* translators: %s: MCP client name, such as Claude Code */
		__(
			'Run this command in a terminal to add Modula to %s:',
			'modula-best-grid-gallery'
		),
	json: () =>
		/* translators: %s: MCP client name, such as Cursor */
		__(
			'Add this to the %s config file, merging it with any servers already there:',
			'modula-best-grid-gallery'
		),
	toml: () =>
		/* translators: %s: MCP client name, such as Codex */
		__('Add this to the %s config file:', 'modula-best-grid-gallery'),
	text: () =>
		/* translators: %s: MCP client name */
		__('Configure %s with these values:', 'modula-best-grid-gallery'),
};

/**
 * The line before a Password connection's config.
 *
 * @param {{format: string, app: string}} config Config from the create or regenerate response.
 * @return {string} Intro; an unknown format reads as plain values.
 */
export function configIntro(config) {
	const intro = CONFIG_INTROS[config.format] ?? CONFIG_INTROS.text;
	return sprintf(intro(), config.app);
}

const PLATFORM_LABELS = {
	macos: () => __('macOS', 'modula-best-grid-gallery'),
	windows: () => __('Windows', 'modula-best-grid-gallery'),
};

/** @param {string} platform Config location platform; an unknown one shows as itself. */
export function platformLabel(platform) {
	return PLATFORM_LABELS[platform]?.() ?? platform;
}

/**
 * What an activity row records, other than a tool call (whose tool name shows as code).
 *
 * @param {string} event Activity event; an unknown one shows as itself.
 * @return {string} Label.
 */
export function eventLabel(event) {
	return EVENT_LABELS[event]?.() ?? event;
}
