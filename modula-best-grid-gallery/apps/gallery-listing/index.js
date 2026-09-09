/**
 * Gallery listing admin screen.
 */
import { createRoot } from '@wordpress/element';
import { QueryClientProvider } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { getGalleryListingConfig } from './config';
import { queryClient } from './query/client';
import GalleryListingApp from './GalleryListingApp';
import './dataviews.css';
import 'shared-ui/menu-select/_menu-select.scss';
import './index.scss';

const config = getGalleryListingConfig();
if (config.nonce) {
	apiFetch.use(apiFetch.createNonceMiddleware(config.nonce));
}

document.addEventListener('DOMContentLoaded', () => {
	const rootEl = document.getElementById('modula-gallery-listing-root');
	if (!rootEl) {
		return;
	}
	const root = createRoot(rootEl);
	root.render(
		<QueryClientProvider client={queryClient}>
			<GalleryListingApp />
		</QueryClientProvider>
	);
});
