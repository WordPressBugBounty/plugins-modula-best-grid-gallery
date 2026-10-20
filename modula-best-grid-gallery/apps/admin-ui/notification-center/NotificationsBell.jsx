import { __, sprintf } from '@wordpress/i18n';
import { Markup } from 'interweave';
import { Button } from '../button/Button';
import { NotificationCenter } from './NotificationCenter';
import { runNotificationAction } from './notifications';
import { useNotifications } from './useNotifications';

// The WPChill notification center's REST route, for the bell's `route`.
export const WPCHILL_NOTIFICATIONS_ROUTE = '/wpchill/v1/notifications';

/**
 * "Modula · 2 days ago": the source and age line under a title.
 *
 * @param {Object} item Notification from notificationItems().
 * @return {string} Meta line.
 */
function metaLine(item) {
	if ('' === item.source || '' === item.when) {
		return item.source || item.when;
	}

	return sprintf(
		/* translators: 1: plugin that sent the notification, 2: age, e.g. "2 days ago". */
		__('%1$s · %2$s', 'modula-best-grid-gallery'),
		item.source,
		item.when
	);
}

/**
 * A notification's action buttons. An action may open a link, call the
 * global function its producer enqueued (Custom URL "Fix links"), and
 * dismiss the notification, as in the WPChill notification bubble.
 *
 * @param {Object}   props
 * @param {Object}   props.item      Notification from notificationItems().
 * @param {Function} props.onDismiss Receives (id, permanent).
 */
function NotificationActions({ item, onDismiss }) {
	return item.actions.map((action, index) => (
		<Button
			key={index}
			variant={action.variant}
			href={action.url || undefined}
			target={action.target || undefined}
			onClick={() => runNotificationAction(action, item.id, onDismiss)}
		>
			{action.label}
		</Button>
	));
}

/**
 * The header bell of a redesigned screen, connected to the WPChill
 * notification center, which the floating WPChill bubble shows on other
 * Modula screens. The page passes the avatar (the WPChill bear) and the
 * notification center's route; without an avatar, which the page sends only
 * when the notification center is loaded, there is no bell and nothing is
 * fetched. Needs the page's QueryClientProvider.
 *
 * @param {Object}      props
 * @param {string|null} props.iconSrc Avatar image, or null for no bell.
 * @param {string}      props.route   REST path of the notification center (WPCHILL_NOTIFICATIONS_ROUTE).
 */
export function NotificationsBell({ iconSrc, route }) {
	return 'string' === typeof iconSrc && '' !== iconSrc ? (
		<Bell iconSrc={iconSrc} route={route} />
	) : null;
}

/**
 * The bell with its notifications.
 *
 * @param {Object} props
 * @param {string} props.iconSrc Avatar image.
 * @param {string} props.route   REST path of the notification center.
 */
function Bell({ iconSrc, route }) {
	const { items, isPending, problem, dismiss, dismissAll, dismissLater } =
		useNotifications(route);

	// No count until the list is in: an empty bell would claim there is none.
	if (isPending) {
		return null;
	}

	const notifications = items.map((item) => ({
		id: item.id,
		title: item.title,
		meta: metaLine(item),
		// Producer HTML; Markup drops tags and attributes outside its allow list.
		body: '' !== item.message ? <Markup content={item.message} /> : null,
		actions:
			0 < item.actions.length ? (
				<NotificationActions item={item} onDismiss={dismiss} />
			) : null,
		dismissible: item.dismissible,
	}));
	const openItem = (id) => {
		const item = items.find((candidate) => candidate.id === id);
		if (item && 0 < item.timed) {
			dismissLater(id, item.timed);
		}
	};

	return (
		<NotificationCenter
			iconSrc={iconSrc}
			notifications={notifications}
			onDismiss={dismiss}
			onDismissAll={dismissAll}
			onOpenItem={openItem}
			notice={problem}
		/>
	);
}
