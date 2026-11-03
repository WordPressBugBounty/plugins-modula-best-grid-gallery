import { Icon, image } from '@wordpress/icons';
import { readListingMiniature } from './listingMiniatureDrawing';
import { ListingMiniature } from './ListingMiniature';

/**
 * The play mark on a video cover.
 */
function PlayIcon() {
	return (
		<svg
			className="modula-content-page__cover-play"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M8 5.5v13l11-6.5z" />
		</svg>
	);
}

/**
 * The row's one cover thumbnail; a video cover carries the play mark. A row
 * without one shows its layout miniature when it has content blocks, else an
 * empty frame. Quick edit shows it larger.
 *
 * @param {Object}                                    props
 * @param {import('./listingRowToFields').ListingRow} props.item
 */
export function ListingCover({ item }) {
	const url = typeof item.cover?.url === 'string' ? item.cover.url : '';
	const miniature = url ? null : readListingMiniature(item.cover?.miniature);
	const classes = [
		'modula-content-page__cover',
		item.cover?.isVideo ? 'is-video' : '',
		url || miniature ? '' : 'is-empty',
		item.status === 'trash' ? 'is-trash' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<span className={classes}>
			{url ? (
				<img src={url} alt="" loading="lazy" decoding="async" />
			) : null}
			{miniature ? <ListingMiniature drawing={miniature} /> : null}
			{!url && !miniature && !item.cover?.isVideo ? (
				<Icon icon={image} size={18} />
			) : null}
			{item.cover?.isVideo ? <PlayIcon /> : null}
		</span>
	);
}
