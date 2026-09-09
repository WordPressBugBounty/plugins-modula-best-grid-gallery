/**
 * Modula Gallery - BnB layout
 *
 * Top: one hero image (left, tall) + 2x2 grid of smaller images (right).
 * Bottom: uniform grid of remaining items (e.g. 6 per row).
 * Matches backend UI: modula_bnb_main_wrapper + modula_bnb_items_wrapper + grid.
 *
 * Gap uses the CSS default (`--modula-bnb-gutter` / $mod-space-10). Saved
 * layout.gutter from other gallery types is ignored — those controls are hidden
 * for BnB, so inherited values must not stick.
 *
 * Compact / mobile: hero full-width on row 1, then the 2×2 featured block below
 * (3 rows total).
 *
 * On the public front, extra images stay off-layout (CSS); in the settings-editor
 * preview they are shown below with a “Hidden” overlay like classic Pro metabox.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import BnbShowAllPhotosButton from '../components/BnbShowAllPhotosButton';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { getForcedPreviewViewport } from '../utils/resolvePreviewViewport';

const FEATURED_COUNT = 5;
const GRID_COLUMNS = 6;
/** Match masonry mobile / legacy BnB: stacked hero + 2×2. */
const BNB_COMPACT_MAX_PX = 768;

export default function BnbLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const isSettingsEditorPreview = useSelector(
		(s) => s.gallery.metadata?.displayContext === 'settings-editor-preview'
	);
	const list = Array.isArray(items) ? items : [];
	const forcedViewport = getForcedPreviewViewport(config);
	/*
	 * Settings-editor preview forces desktop/tablet/mobile via config — skip
	 * ResizeObserver width state there. Width flicker (scrollbar ↔ layout) was
	 * re-rendering every fillSlot tile and nesting setState in commitAttachRef.
	 */
	const { containerRef, containerWidth } = useContainerWidth(0);
	const measureContainer = !forcedViewport;
	const isCompact =
		forcedViewport === 'mobile' ||
		(measureContainer &&
			containerWidth > 0 &&
			containerWidth <= BNB_COMPACT_MAX_PX);

	const hero = list[0] ?? null;
	const featuredFour = list.slice(1, FEATURED_COUNT);
	const rest = list.slice(FEATURED_COUNT);

	const rootClass = [
		'modula-items',
		'modula-bnb',
		isCompact ? 'modula-bnb--compact' : '',
		isSettingsEditorPreview && rest.length > 0
			? 'modula-bnb--editor-preview-extras'
			: '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div ref={measureContainer ? containerRef : undefined} className={rootClass}>
			{(hero || featuredFour.length > 0) && (
				<div className="modula-bnb-featured">
					{hero && (
						<div className="modula-bnb-hero">
							<GalleryItem
								key={galleryItemRowKey(hero, 0)}
								itemData={hero}
								config={config}
								fillSlot
								style={{
									position: 'absolute',
									inset: 0,
									width: '100%',
									height: '100%',
								}}
							/>
						</div>
					)}
					<div className="modula-bnb-featured-grid">
						{featuredFour.map((item, fi) => {
							const isLastFeatured =
								fi === featuredFour.length - 1;
							const showAllPhotos =
								isLastFeatured && rest.length > 0;
							return (
								<div
									key={galleryItemRowKey(item, fi + 1)}
									className={[
										'modula-bnb-featured-cell',
										showAllPhotos
											? 'modula-bnb-featured-cell--has-more'
											: '',
									]
										.filter(Boolean)
										.join(' ')}
								>
									<GalleryItem
										itemData={item}
										config={config}
										fillSlot
										style={{
											position: 'absolute',
											inset: 0,
											width: '100%',
											height: '100%',
										}}
									/>
									{showAllPhotos ? (
										<BnbShowAllPhotosButton
											moreCount={rest.length}
											config={config}
										/>
									) : null}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{rest.length > 0 && (
				<div
					className="modula-bnb-grid"
					style={{
						gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
					}}
				>
					{rest.map((item, ri) => (
						<div
							key={galleryItemRowKey(item, ri + FEATURED_COUNT)}
							className="modula-bnb-grid-cell"
						>
							{isSettingsEditorPreview ? (
								<div
									className="modula-bnb-lightbox-only-overlay"
									aria-hidden="true"
								>
									<span className="modula-bnb-lightbox-only-overlay__label">
										{__(
											'Hidden',
											'modula-best-grid-gallery'
										)}
									</span>
									<span className="modula-bnb-lightbox-only-overlay__hint">
										{__(
											'Not shown in the BnB grid; opens in the lightbox.',
											'modula-best-grid-gallery'
										)}
									</span>
								</div>
							) : null}
							<GalleryItem
								itemData={item}
								config={config}
								fillSlot
								style={{
									position: 'absolute',
									inset: 0,
									width: '100%',
									height: '100%',
								}}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
