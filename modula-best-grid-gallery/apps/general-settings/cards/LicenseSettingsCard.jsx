import { useQueryClient } from '@tanstack/react-query';
import { LicenseCard } from 'license-card';
import { TABS_QUERY_KEY } from '../query/useTabsQuery';

/**
 * A settings card of the license kind (Pro's Settings › License): the same
 * license card as on the Extensions page (ADR 0049). It saves through its
 * own actions, so it never records pending edits for the page's Save.
 */
export function LicenseSettingsCard() {
	const queryClient = useQueryClient();
	// A new or removed license changes the plan, and with it which cards
	// are locked.
	const onLicenseChange = () => {
		queryClient.invalidateQueries({ queryKey: TABS_QUERY_KEY });
	};

	return <LicenseCard onLicenseChange={onLicenseChange} />;
}
