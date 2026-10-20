import { __ } from '@wordpress/i18n';
import { AdminPage, AdminUiRoot, PageTabs } from 'admin-ui';
import { DashboardHeader } from './page/DashboardHeader';
import { gettingStartedData } from './page/pageData';
import { ResourceCards } from './page/ResourceCards';
import { UseCases } from './page/UseCases';
import { HelpCard } from './page/HelpCard';

/**
 * Modula › Getting Started: where to begin, the common use cases and where to
 * get help.
 */
export default function GettingStartedPage() {
	const { links, useCases } = gettingStartedData();
	return (
		<AdminUiRoot className="modula-getting-started-page">
			<AdminPage
				header={
					<DashboardHeader
						title={__(
							'Getting Started',
							'modula-best-grid-gallery'
						)}
					/>
				}
				tabs={<PageTabs current="getting-started" />}
				title={__(
					'Thank you for choosing Modula.',
					'modula-best-grid-gallery'
				)}
			>
				<p className="modula-getting-started-intro">
					{__(
						'Here are some valuable resources to help you begin with our plugin.',
						'modula-best-grid-gallery'
					)}
				</p>
				<ResourceCards links={links} />
				<UseCases useCases={useCases} />
				<HelpCard links={links} />
			</AdminPage>
		</AdminUiRoot>
	);
}
