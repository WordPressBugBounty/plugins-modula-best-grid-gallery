/**
 * Renders Pro-registered Instagram account panel (or nothing until registered).
 */
import { useInstagramRegistration } from '../../hooks/useInstagramRegistration';

export default function InstagramAccountSlot() {
	const registration = useInstagramRegistration();
	const AccountPanel = registration?.AccountPanel;
	if (!AccountPanel) {
		return null;
	}
	return <AccountPanel />;
}
