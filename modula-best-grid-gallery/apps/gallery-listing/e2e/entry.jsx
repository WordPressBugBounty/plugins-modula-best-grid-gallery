import './locale';
import { createRoot } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GalleryListingApp from '../GalleryListingApp';
import '../dataviews.css';
import '../index.scss';

apiFetch.use(apiFetch.createRootURLMiddleware('/wp-json/'));

createRoot(document.getElementById('modula-gallery-listing-root')).render(
	<QueryClientProvider
		client={
			new QueryClient({ defaultOptions: { queries: { retry: false } } })
		}
	>
		<GalleryListingApp />
	</QueryClientProvider>
);
