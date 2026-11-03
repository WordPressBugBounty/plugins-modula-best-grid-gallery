/**
 * Content page admin screen.
 */
import { createRoot } from '@wordpress/element';
import { QueryClientProvider } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { getContentPageConfig } from './config';
import { queryClient } from './query/client';
import ContentPageApp from './ContentPageApp';
import './index.scss';

const config = getContentPageConfig();
if (config.nonce) {
	apiFetch.use(apiFetch.createNonceMiddleware(config.nonce));
}

document.addEventListener('DOMContentLoaded', () => {
	// The root keeps its old id: Pro's bulk editor and presets detect the page by it.
	const rootEl = document.getElementById('modula-gallery-listing-root');
	if (!rootEl) {
		return;
	}
	const root = createRoot(rootEl);
	root.render(
		<QueryClientProvider client={queryClient}>
			<ContentPageApp />
		</QueryClientProvider>
	);
});
