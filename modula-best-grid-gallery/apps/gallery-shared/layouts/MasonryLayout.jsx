/**
 * Modula Gallery - Masonry layout (react-responsive-masonry)
 *
 * @package
 */

import { Fragment } from '@wordpress/element';
import { useSelector } from 'react-redux';
import Masonry from 'react-responsive-masonry';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import {
	useResponsiveColumns,
	useResponsiveGutter,
} from '../hooks/useResponsiveColumns';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { captionPlacementLayoutKey } from '../utils/captionPlacement';

function masonryGutterProp(raw) {
	if (raw === null || raw === '') {
		return undefined;
	}
	if (typeof raw === 'string') {
		return raw;
	}
	const n = Number(raw);
	return Number.isFinite(n) ? `${n}px` : undefined;
}

export default function MasonryLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const columnsCount = useResponsiveColumns(config);
	const gutterRaw = useResponsiveGutter(config);
	const gutter = masonryGutterProp(gutterRaw);
	const layoutPlacementKey = captionPlacementLayoutKey(config);

	const chunks = usePreviewCatalogChunks(items, config);

	if (chunks.length <= 1) {
		const chunk = Array.isArray(chunks[0]) ? chunks[0] : [];
		return (
			<div
				className="modula-masonry-react-host"
				style={{ width: '100%', minWidth: 0 }}
			>
				<Masonry
					key={layoutPlacementKey}
					className="modula-items modula-masonry-react"
					columnsCount={columnsCount}
					gutter={gutter}
				>
					{chunk.map((item, idx) => (
						<GalleryItem
							key={galleryItemRowKey(item, idx)}
							itemData={item}
							config={config}
						/>
					))}
				</Masonry>
			</div>
		);
	}

	return (
		<div className="modula-masonry-react-pages">
			{chunks.map((chunk, ci) => (
				<Fragment key={ci}>
					{ci > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<div
						className="modula-masonry-react-host"
						style={{ width: '100%', minWidth: 0 }}
					>
						<Masonry
							key={layoutPlacementKey}
							className="modula-items modula-masonry-react"
							columnsCount={columnsCount}
							gutter={gutter}
						>
							{chunk.map((item, idx) => (
								<GalleryItem
									key={galleryItemRowKey(item, idx)}
									itemData={item}
									config={config}
								/>
							))}
						</Masonry>
					</div>
				</Fragment>
			))}
		</div>
	);
}
