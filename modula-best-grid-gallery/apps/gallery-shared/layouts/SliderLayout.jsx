/**
 * Modula Gallery - Slider layout: the gallery items from the store, on the
 * shared SliderCarousel.
 *
 * @package
 */

import { useSelector } from 'react-redux';
import SliderItem from '../components/SliderItem';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { shouldSuppressGalleryMotion } from '../utils/reducedMotion';
import SliderCarousel from './SliderCarousel';

export default function SliderLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const metadata = useSelector((state) => state.gallery.metadata);

	return (
		<SliderCarousel
			items={items}
			config={config}
			suppressMotion={shouldSuppressGalleryMotion(metadata)}
			itemKey={galleryItemRowKey}
			renderSlide={(item, idx) => (
				<SliderItem
					key={`slide-${idx}-${String(item?.id ?? '')}`}
					itemData={item}
					config={config}
				/>
			)}
		/>
	);
}
