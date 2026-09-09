import { createRoot } from '@wordpress/element';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query/client';
import './index.scss';
import Insights from './insights';
import { PageHeader, PageNav, adminPageTabs } from 'shared-ui';

document.addEventListener('DOMContentLoaded', () => {
	const insightsPage = document.getElementById('modula-insights');

	if (!insightsPage) {
		return;
	}
	const root = createRoot(insightsPage);

	root.render(
		<QueryClientProvider client={queryClient}>
			<PageHeader />
			<PageNav items={adminPageTabs} activeTab="insights" />
			<Insights />
		</QueryClientProvider>
	);
});
