/**
 * Gallery-level title (WordPress post title), legacy `modula-gallery-title` parity.
 *
 * @package
 */

import { useSelector } from 'react-redux';

const GALLERY_TITLE_TAGS = new Set([
	'p',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
]);

/**
 * @return {import('react').JSX.Element|null}
 */
export default function GalleryTitle() {
	const config = useSelector((state) => state.gallery.config);
	const metadata = useSelector((state) => state.gallery.metadata);

	if (config?.hideGalleryTitle) {
		return null;
	}

	const title =
		typeof metadata?.galleryTitle === 'string'
			? metadata.galleryTitle.trim()
			: '';
	if (!title) {
		return null;
	}

	const requested =
		typeof config?.galleryTitleType === 'string'
			? config.galleryTitleType.trim().toLowerCase()
			: 'p';
	const Tag = GALLERY_TITLE_TAGS.has(requested) ? requested : 'p';

	return <Tag className="modula-gallery-title">{title}</Tag>;
}
