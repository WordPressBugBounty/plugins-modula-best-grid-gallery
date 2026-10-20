import {
	NotificationsBell,
	PageHeader,
	WPCHILL_NOTIFICATIONS_ROUTE,
} from 'admin-ui';
import { notificationsIcon } from './pageData';

/**
 * The header every view of this app shares: its title and the notifications
 * bell, without Save, as on Extensions.
 *
 * @param {Object} props
 * @param {string} props.title The view's name.
 */
export function DashboardHeader({ title }) {
	return (
		<PageHeader title={title}>
			<NotificationsBell
				iconSrc={notificationsIcon()}
				route={WPCHILL_NOTIFICATIONS_ROUTE}
			/>
		</PageHeader>
	);
}
