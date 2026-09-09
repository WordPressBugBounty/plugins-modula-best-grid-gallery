import { createRoot } from '@wordpress/element';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query/client';
import './index.scss';
import ExtensionList from './components/extension-list';
import { PageHeader, PageNav, adminPageTabs } from 'shared-ui';

document.addEventListener('DOMContentLoaded', () => {
	const addonsPage = document.getElementById('modula-addons');

	if (!addonsPage) {
		return;
	}
	const root = createRoot(addonsPage);

	root.render(
		<QueryClientProvider client={queryClient}>
			<PageHeader />
			<PageNav items={adminPageTabs} activeTab="extensions" />
			<ExtensionList />
		</QueryClientProvider>
	);
});
