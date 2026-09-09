/**
 * Point the browser at the stable edit URL so refresh does not open another auto-draft.
 *
 * @param {number} postId Gallery post ID.
 */
export function syncGalleryAdminEditUrl(postId) {
	const id = Number(postId) || 0;
	if (!id || typeof window === 'undefined' || !window.history) {
		return;
	}

	const { pathname, search, hash } = window.location;
	if (!pathname.endsWith('post-new.php')) {
		return;
	}

	const params = new URLSearchParams(search);
	if (params.get('post') === String(id) && params.get('action') === 'edit') {
		return;
	}

	const url = new URL(window.location.href);
	url.pathname = pathname.replace(/post-new\.php$/, 'post.php');
	url.search = '';
	url.searchParams.set('post', String(id));
	url.searchParams.set('action', 'edit');
	url.hash = hash || '';
	window.history.replaceState(null, '', url.toString());
}
