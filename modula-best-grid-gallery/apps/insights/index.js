import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import { AdminUiRoot, PageHeader, PageTabs } from 'admin-ui';
import { queryClient } from './query/client';
import './index.scss';
import Insights from './insights';

document.addEventListener('DOMContentLoaded', () => {
	const insightsPage = document.getElementById('modula-insights');

	if (!insightsPage) {
		return;
	}
	const root = createRoot(insightsPage);

	root.render(
		<QueryClientProvider client={queryClient}>
			<AdminUiRoot className="modula-insights-page">
				<PageHeader
					title={__('Insights', 'modula-best-grid-gallery')}
				/>
				<PageTabs current="insights" />
			</AdminUiRoot>
			<Insights />
		</QueryClientProvider>
	);
});
