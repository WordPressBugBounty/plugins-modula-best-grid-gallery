import { createRoot } from '@wordpress/element';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GettingStartedPage from './GettingStartedPage';
import AboutUsPage from './about/AboutUsPage';
import PartnersPage from './partners/PartnersPage';
import { gettingStartedData } from './page/pageData';
import './index.scss';

// Each view the server can ask for (its `tab` query value), by name.
const VIEWS = {
	general: GettingStartedPage,
	about: AboutUsPage,
	partners: PartnersPage,
};

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('modula-getting-started');

	if (!container) {
		return;
	}

	const { view } = gettingStartedData();
	const Page = Object.prototype.hasOwnProperty.call(VIEWS, view)
		? VIEWS[view]
		: GettingStartedPage;

	// The header bell loads its notifications with React Query.
	createRoot(container).render(
		<QueryClientProvider client={new QueryClient()}>
			<Page />
		</QueryClientProvider>
	);
});
