/**
 * Resolve a WP media attachment URL (settings-editor live preview).
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import { fetchWpMediaSourceUrl } from '../api/wpRestMediaApi';

/**
 * @param {number|string} attachmentId
 * @return {string}
 */
export function useWpAttachmentSourceUrl(attachmentId) {
	const id = parseInt(attachmentId, 10);
	const [url, setUrl] = useState('');

	useEffect(() => {
		if (!Number.isFinite(id) || id <= 0) {
			setUrl('');
			return undefined;
		}

		let cancelled = false;

		fetchWpMediaSourceUrl(id).then((next) => {
			if (!cancelled) {
				setUrl(next);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [id]);

	return url;
}
