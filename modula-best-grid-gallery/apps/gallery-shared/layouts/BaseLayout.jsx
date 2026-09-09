/**
 * Modula Gallery - Base layout (simple list of items)
 *
 * @package
 */

import { useSelector } from 'react-redux';
import GalleryItem from '../components/GalleryItem';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';

export default function BaseLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);

	return (
		<div className="modula-items">
			{Array.isArray(items) &&
				items.map((item, idx) => (
					<GalleryItem
						key={galleryItemRowKey(item, idx)}
						itemData={item}
						config={config}
					/>
				))}
		</div>
	);
}
