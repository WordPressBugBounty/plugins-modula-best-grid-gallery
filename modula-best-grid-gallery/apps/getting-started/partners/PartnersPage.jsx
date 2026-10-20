import { __ } from '@wordpress/i18n';
import { AdminPage, AdminUiRoot, Notice, PageTabs } from 'admin-ui';
import { DashboardHeader } from '../page/DashboardHeader';
import { partnersData } from './partnersData';
import { PartnerCards } from './PartnerCards';

/**
 * Modula › Partners: other plugins known to work well with Modula.
 */
export default function PartnersPage() {
	const partners = partnersData();

	return (
		<AdminUiRoot className="modula-getting-started-page">
			<AdminPage
				header={
					<DashboardHeader
						title={__('Partners', 'modula-best-grid-gallery')}
					/>
				}
				tabs={<PageTabs current="partners" />}
				title={__('Our Partners', 'modula-best-grid-gallery')}
			>
				<p className="modula-getting-started-intro">
					{__(
						'Other plugins that are known to work great alongside Modula',
						'modula-best-grid-gallery'
					)}
				</p>
				{partners ? (
					<PartnerCards partners={partners} />
				) : (
					<Notice>
						{__(
							"The partner list can't be loaded right now. Please try again later.",
							'modula-best-grid-gallery'
						)}
					</Notice>
				)}
			</AdminPage>
		</AdminUiRoot>
	);
}
