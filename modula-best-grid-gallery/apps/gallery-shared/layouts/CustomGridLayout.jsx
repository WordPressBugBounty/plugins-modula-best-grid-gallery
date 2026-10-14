/**
 * Modula Gallery - Custom grid layout
 *
 * Frontend: bin-packing placement (Packery-style).
 * Settings-editor preview: react-grid-layout for drag/resize on desktop only.
 *
 * @package
 */

import { Fragment, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import Masonry from 'react-responsive-masonry';
import GalleryItem from '../components/GalleryItem';
import EditorPreviewPageBreakDivider from '../components/EditorPreviewPageBreakDivider';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { isSettingsEditorPreview } from '../utils/displayContext';
import { buildCustomGridPackedTiles } from '../utils/customGridLayout';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import { usePreviewCatalogChunks } from '../hooks/usePreviewCatalogChunks';
import { splitCustomGridDisplayChunks } from '../utils/customGridDisplayChunks';
import { editorPreviewUsesNumberedPageBreakDividers } from '../utils/paginationFromSettings';
import {
	isCustomGridPreviewLayoutEditable,
	resolveResponsiveColumnsForWidth,
	resolveResponsiveGutterForWidth,
	shouldCustomGridUseColumnFlow,
} from '../utils/resolvePreviewViewport';

const CUSTOM_GRID_RESPONSIVE_LAYOUT = { layout: 'custom-grid' };

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

/**
 * Tablet/mobile: N columns from responsive settings (masonry flow, not custom-grid pack/RGL).
 * @param root0
 * @param root0.items
 * @param root0.config
 * @param root0.containerRef
 * @param root0.containerWidth
 */
function CustomGridColumnFlowLayout({
	items,
	config,
	containerRef,
	containerWidth,
}) {
	const measureWidth = containerWidth > 0 ? containerWidth : 0;
	const columnsCount = useMemo(
		() =>
			resolveResponsiveColumnsForWidth(
				config,
				measureWidth,
				CUSTOM_GRID_RESPONSIVE_LAYOUT
			),
		[config, measureWidth]
	);
	const gutterRaw = useMemo(
		() =>
			resolveResponsiveGutterForWidth(
				config,
				measureWidth,
				CUSTOM_GRID_RESPONSIVE_LAYOUT
			),
		[config, measureWidth]
	);

	const gutter = masonryGutterProp(gutterRaw);
	const chunks = usePreviewCatalogChunks(items, config);

	if (chunks.length <= 1) {
		const chunk = Array.isArray(chunks[0]) ? chunks[0] : [];
		return (
			<div
				ref={containerRef}
				className="modula-custom-grid-column-flow-host"
				style={{ width: '100%', minWidth: 0 }}
			>
				<Masonry
					className="modula-items modula-custom-grid modula-custom-grid--column-flow modula-masonry-react"
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
		<div
			ref={containerRef}
			className="modula-custom-grid-column-flow-pages modula-custom-grid--editor-pages"
		>
			{chunks.map((chunk, ci) => (
				<Fragment key={ci}>
					{ci > 0 ? <EditorPreviewPageBreakDivider /> : null}
					<div
						className="modula-custom-grid-column-flow-host"
						style={{ width: '100%', minWidth: 0 }}
					>
						<Masonry
							className="modula-items modula-custom-grid modula-custom-grid--column-flow modula-masonry-react"
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

function CustomGridPackerLayout({
	items,
	config,
	containerRef,
	containerWidth,
	chunkOptions,
}) {
	const chunks = useMemo(
		() => splitCustomGridDisplayChunks(items, chunkOptions),
		[items, chunkOptions]
	);
	const isEditorPreview = isSettingsEditorPreview(chunkOptions?.metadata);
	const showEditorPageDividers =
		isEditorPreview &&
		editorPreviewUsesNumberedPageBreakDividers(
			chunkOptions?.settings || {}
		);
	const tileShellOverflow =
		parseInt(config?.shadowSize ?? 0, 10) > 0 ? 'visible' : 'hidden';

	const pageSections = useMemo(() => {
		if (containerWidth <= 0) {
			return [];
		}
		return chunks.map((chunk) => {
			if (!chunk.length) {
				return { chunk, tiles: [], containerHeight: 0 };
			}
			const { tiles, containerHeight } = buildCustomGridPackedTiles(
				chunk,
				containerWidth,
				config
			);
			return { chunk, tiles, containerHeight };
		});
	}, [chunks, containerWidth, config]);

	return (
		<div
			ref={containerRef}
			className="modula-items modula-custom-grid modula-custom-grid--editor-pages"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 0,
				width: '100%',
				minHeight: 0,
			}}
		>
			{pageSections.map((section, si) => (
				<Fragment key={si}>
					{si > 0 ? (
						showEditorPageDividers ? (
							<EditorPreviewPageBreakDivider />
						) : (
							<div
								className="modula-custom-grid-visitor-page-gap"
								aria-hidden="true"
							/>
						)
					) : null}
					<div
						style={{
							position: 'relative',
							width: '100%',
							height:
								section.tiles.length > 0
									? section.containerHeight
									: 'auto',
							minHeight: 0,
						}}
					>
						{section.tiles.map((tile, i) => {
							const item = section.chunk[i];
							if (!item) {
								return null;
							}
							const isHorizontal = tile.width > tile.height;
							return (
								<div
									key={`${si}-${galleryItemRowKey(item, i)}`}
									className={`modula-item modula-item-tiled ${isHorizontal ? 'tile-h' : 'tile-v'}`}
									style={{
										position: 'absolute',
										left: tile.left,
										top: tile.top,
										width: tile.width,
										height: tile.height,
										boxSizing: 'border-box',
										overflow: tileShellOverflow,
									}}
								>
									<GalleryItem
										itemData={item}
										config={config}
										slotWidth={tile.width}
										slotHeight={tile.height}
										fillSlot
										style={{
											position: 'absolute',
											inset: 0,
											width: '100%',
											height: '100%',
										}}
									/>
								</div>
							);
						})}
					</div>
				</Fragment>
			))}
		</div>
	);
}

export default function CustomGridLayout({ EditorLayout } = {}) {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const metadata = useSelector((state) => state.gallery.metadata);
	const settings = useSelector((state) => state.gallery.settings);
	const pagination = useSelector((state) => state.pagination);
	const { containerRef, containerWidth } = useContainerWidth(0);

	const chunkOptions = useMemo(
		() => ({ pagination, settings, metadata, config }),
		[pagination, settings, metadata, config]
	);

	const isEditorPreview = isSettingsEditorPreview(metadata);
	const useColumnFlow = shouldCustomGridUseColumnFlow(
		config,
		metadata,
		containerWidth
	);
	const gridEditable = isCustomGridPreviewLayoutEditable(config, metadata);

	if (useColumnFlow) {
		return (
			<CustomGridColumnFlowLayout
				items={items}
				config={config}
				containerRef={containerRef}
				containerWidth={containerWidth}
			/>
		);
	}

	if (isEditorPreview && EditorLayout) {
		return (
			<EditorLayout
				items={items}
				config={config}
				containerRef={containerRef}
				containerWidth={containerWidth}
				gridEditable={gridEditable}
				chunkOptions={chunkOptions}
			/>
		);
	}

	return (
		<CustomGridPackerLayout
			items={items}
			config={config}
			containerRef={containerRef}
			containerWidth={containerWidth}
			chunkOptions={chunkOptions}
		/>
	);
}
