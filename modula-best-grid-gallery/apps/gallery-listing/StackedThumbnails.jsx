import { getListingThumbnailUrls } from './getListingThumbnailUrls';

const STACK_SLOTS = 3;

/**
 * Stacked preview thumbnails for a listing row (gallery or album).
 *
 * @param {{ item: { thumbnailUrls?: string[], thumbnailUrl?: string } }} props
 */
export function StackedThumbnails({ item }) {
	const urls = getListingThumbnailUrls(item, STACK_SLOTS);

	if (urls.length === 0) {
		return (
			<span
				className="modula-gallery-listing__thumb-stack modula-gallery-listing__thumb-stack--empty"
				aria-hidden="true"
			>
				<span className="modula-gallery-listing__thumb modula-gallery-listing__thumb--empty" />
			</span>
		);
	}

	const layers = Array.from({ length: STACK_SLOTS }, (_, index) => {
		const depth = STACK_SLOTS - 1 - index;
		return urls[depth] || null;
	});

	return (
		<span
			className="modula-gallery-listing__thumb-stack"
			aria-hidden="true"
		>
			{layers.map((url, index) => {
				const depth = STACK_SLOTS - 1 - index;
				const className = [
					'modula-gallery-listing__thumb',
					'modula-gallery-listing__thumb-layer',
					`modula-gallery-listing__thumb-layer--${depth}`,
					url ? '' : 'modula-gallery-listing__thumb--empty',
				]
					.filter(Boolean)
					.join(' ');

				if (!url) {
					return (
						<span key={`empty-${depth}`} className={className} />
					);
				}

				return (
					<img
						key={`${url}-${depth}`}
						className={className}
						src={url}
						alt=""
					/>
				);
			})}
		</span>
	);
}
