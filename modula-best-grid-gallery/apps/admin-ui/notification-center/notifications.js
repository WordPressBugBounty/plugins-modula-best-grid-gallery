import { decodeEntities } from '@wordpress/html-entities';

// WPChill action variants the bell can draw; any other is a secondary button.
const ACTION_VARIANTS = ['primary', 'link'];

/**
 * Server copy as plain text: WPChill sends labels, links and names
 * HTML-escaped, and the bell renders them as text.
 *
 * @param {*} html Server text, HTML-escaped.
 * @return {string} The text, decoded.
 */
function decodedText(html) {
	return decodeEntities(String(html ?? ''));
}

/**
 * The text of a producer's HTML, without its tags. DOMParser builds an
 * inert document: nothing in it loads or runs.
 *
 * @param {*} html
 * @return {string} Plain text.
 */
function plainText(html) {
	return (
		new window.DOMParser().parseFromString(String(html ?? ''), 'text/html')
			.body.textContent ?? ''
	);
}

/**
 * Whether a value is a notification the bell can list: an object with an id.
 *
 * @param {*} entry
 * @return {boolean} Whether it is one.
 */
function isNotification(entry) {
	return (
		'object' === typeof entry &&
		null !== entry &&
		'string' === typeof entry.id &&
		'' !== entry.id
	);
}

/**
 * One action button of a notification, as plain values. `url` and `label`
 * arrive HTML-escaped; `callback` names a global function the producer
 * enqueues (for example the Custom URL fix). That function reads its own
 * fields from the action (the review's `id`, the migrator's `data`), so
 * `producerAction` keeps the action as the producer sent it.
 *
 * @param {Object} action WPChill action.
 * @return {Object} `{ label, url, target, callback, dismiss, permanent, variant, producerAction }`.
 */
function notificationAction(action) {
	return {
		label: decodedText(action.label),
		url: decodedText(action.url),
		target: 'string' === typeof action.target ? action.target : '',
		callback: 'string' === typeof action.callback ? action.callback : '',
		dismiss: true === action.dismiss,
		permanent: true === action.permanent,
		variant: ACTION_VARIANTS.includes(action.variant)
			? action.variant
			: 'secondary',
		producerAction: action,
	};
}

/**
 * Runs a notification action. As in the WPChill notification bubble, the
 * producer's global callback, if it enqueued one, gets the action as the
 * producer sent it and the notification id; then the action dismisses the
 * notification if it says so.
 *
 * @param {Object}   action         Action from notificationItems().
 * @param {string}   notificationId Notification the action belongs to.
 * @param {Function} onDismiss      Receives (id, permanent).
 */
export function runNotificationAction(action, notificationId, onDismiss) {
	const callback = window[action.callback];
	if ('function' === typeof callback) {
		callback(action.producerAction, notificationId);
	}
	if (action.dismiss) {
		onDismiss(notificationId, action.permanent);
	}
}

/**
 * The notifications response without one notification, for showing a
 * dismissal before the server confirms it. The given response is not changed.
 *
 * @param {Object|Array|undefined} response Notifications by status, or `[]` for none.
 * @param {string}                 id       Notification to drop.
 * @return {Object|Array|undefined} The response without it.
 */
export function withoutNotification(response, id) {
	// No groups (the server sends `[]` for none): nothing to drop.
	if (
		'object' !== typeof response ||
		null === response ||
		Array.isArray(response)
	) {
		return response;
	}

	return Object.fromEntries(
		Object.entries(response).map(([status, group]) => [
			status,
			Array.isArray(group)
				? group.filter((notice) => notice?.id !== id)
				: group,
		])
	);
}

/**
 * The WPChill notification center's notifications as the bell lists them,
 * from `GET /wpchill/v1/notifications`: every status group, in the order
 * the server sends them. The title is plain text, since it names the item's
 * button; the message stays HTML (the producers format it), which the bell
 * renders through a sanitizing parser.
 *
 * @param {Object|Array|undefined} response Notifications by status, or `[]` for none.
 * @return {Object[]} Items: `{ id, title, message, source, when, dismissible, timed, actions }`.
 */
export function notificationItems(response) {
	if ('object' !== typeof response || null === response) {
		return [];
	}

	return Object.values(response)
		.filter(Array.isArray)
		.flat()
		.filter(isNotification)
		.map((notice) => ({
			id: notice.id,
			title: plainText(notice.title),
			message: String(notice.message ?? ''),
			source: decodedText(notice.source?.name),
			when: decodedText(notice.time_ago || ''),
			dismissible: false !== notice.dismissible,
			// Milliseconds after opening before it dismisses itself; 0 for never.
			timed:
				Number.isInteger(notice.timed) && 0 < notice.timed
					? notice.timed
					: 0,
			actions: Array.isArray(notice.actions)
				? notice.actions.map(notificationAction)
				: [],
		}));
}
