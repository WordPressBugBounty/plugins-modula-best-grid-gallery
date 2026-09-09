/**
 * Single Showcase strip slide — natural aspect image + hover chrome + socials.
 * Consumes the item-tile view model (strip policy: media + link + overlay + socials).
 *
 * @package
 */

import { memo, useCallback, useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { getTileLinkRenderOptions } from '../../utils/resolveGalleryItemLink';
import { isSettingsEditorPreview } from '../../utils/displayContext';
import GalleryPreviewAdminToolbarSlot from '../../components/GalleryPreviewAdminToolbarSlot';
import { GalleryItemTextContent } from '../../components/GalleryItemMarkup';
import { getItemTileViewModel } from '../../utils/galleryItemViewModel';
import { mergeReactClassNameProps } from '../../utils/attributeUtils';
import GalleryItemExpandableSocials from '../../components/social/GalleryItemExpandableSocials';

/**
 * @param {unknown} styleValue
 * @returns {Record<string, string>}
 */
function parseInlineStyle(styleValue) {
	if (!styleValue) {
		return {};
	}
	if (typeof styleValue === 'object' && !Array.isArray(styleValue)) {
		return { ...styleValue };
	}
	if (typeof styleValue !== 'string') {
		return {};
	}
	const out = {};
	styleValue
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean)
		.forEach((declaration) => {
			const idx = declaration.indexOf(':');
			if (idx <= 0) {
				return;
			}
			const prop = declaration.slice(0, idx).trim();
			const value = declaration.slice(idx + 1).trim();
			if (!prop || !value) {
				return;
			}
			out[prop] = value;
		});
	return out;
}

/**
 * @param {object} props
 * @param {string} props.itemKey
 * @param {object} props.itemData
 * @param {object} props.config
 * @param {number} props.width
 * @param {number} props.height
 * @param {number} [props.marginX]
 * @param {boolean} props.isActive
 * @param {boolean} props.lazy
 * @param {(key: string, ratio: number) => void} [props.onAspectRatio]
 * @param {() => void} [props.onSelect]
 */
function ShowcaseSlide({
	itemKey,
	itemData,
	config,
	width,
	height,
	marginX = 0,
	isActive,
	lazy,
	onAspectRatio,
	onSelect,
}) {
	const isPreview = useSelector((s) =>
		isSettingsEditorPreview(s.gallery.metadata)
	);
	const vm = useMemo(() => {
		const linkRender = getTileLinkRenderOptions(isPreview);
		return getItemTileViewModel(itemData, config, {
			renderLinks: linkRender.renderLinks,
			forceLinkNewTab: linkRender.forceLinkNewTab,
			fillSlot: false,
			stripHoverBuilderClasses: isPreview,
			extraClassName: 'modula-showcase__slide',
		});
	}, [itemData, config, isPreview]);

	const src = typeof vm?.imageSrc === 'string' ? vm.imageSrc.trim() : '';
	const alt = typeof vm?.item?.alt === 'string' ? vm.item.alt : '';
	const showLink = Boolean(vm?.showLink);
	const linkHref = vm?.linkHref || '#';
	const isSimpleLink = Boolean(vm?.isSimpleLink);
	const linkProps =
		vm && showLink
			? mergeReactClassNameProps(vm.linkAttrs || {}, vm.linkClasses || [])
			: null;

	const item = vm?.item;
	const showTitle =
		!isPreview &&
		item &&
		!item.hideTitle &&
		String(item.title || '').trim() !== '';
	const showDescription =
		!isPreview &&
		item &&
		!item.hideDescription &&
		String(item.description || '').trim() !== '';
	const hasSocialNetworks =
		!isPreview &&
		item &&
		!item.hideSocials &&
		Array.isArray(item.socials) &&
		item.socials.length > 0;
	const socialDesktopCollapsed = !!item?.socialDesktopCollapsed;
	const hasInlineSocials = hasSocialNetworks && !socialDesktopCollapsed;
	const showExpandableSocials = hasSocialNetworks;
	const hasHoverChrome =
		!isPreview &&
		Array.isArray(vm?.itemClasses) &&
		vm.itemClasses.some((cls) =>
			String(cls || '').startsWith('modula-hover-')
		);
	const hasOverlayChrome =
		hasHoverChrome || showTitle || showDescription || hasInlineSocials;

	const handleLoad = useCallback(
		(e) => {
			const img = e?.currentTarget;
			const nw = img?.naturalWidth;
			const nh = img?.naturalHeight;
			if (nw > 0 && nh > 0 && typeof onAspectRatio === 'function') {
				onAspectRatio(itemKey, nw / nh);
			}
		},
		[itemKey, onAspectRatio]
	);

	const img = src ? (
		<img
			className="modula-showcase__img pic"
			src={src}
			alt={alt}
			width={Math.round(width)}
			height={Math.round(height)}
			loading={lazy ? 'lazy' : 'eager'}
			decoding="async"
			draggable={false}
			onLoad={handleLoad}
		/>
	) : null;

	/*
	 * Match grid tile stacking: media is a sibling under an empty absolute
	 * hit target. Putting the opaque <img> inside the link paints above the
	 * dim overlay (z-index 1) and clips the hover tint to letterbox/gaps.
	 */
	const hitTarget =
		showLink && linkProps ? (
			<a
				{...linkProps}
				href={linkHref}
				aria-label={alt || undefined}
				onMouseDown={(e) => {
					/* Avoid sticky focus ring after pointer drag/click. */
					e.preventDefault();
				}}
				onClick={(e) => {
					if (onSelect) {
						onSelect();
					}
					if (!isSimpleLink && linkHref === '#') {
						e.preventDefault();
					}
				}}
			/>
		) : (
			<button
				type="button"
				className="modula-showcase__hit"
				onMouseDown={(e) => {
					e.preventDefault();
				}}
				onClick={() => onSelect?.()}
				aria-label={alt || undefined}
			/>
		);

	if (!vm) {
		return null;
	}

	const { style: itemInlineStyle, ...itemAttrsSansStyle } =
		vm.itemAttrs || {};
	const rootInlineStyle = parseInlineStyle(itemInlineStyle);
	const rootClass = [
		itemAttrsSansStyle.className,
		isActive ? 'is-active' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div
			{...itemAttrsSansStyle}
			className={rootClass}
			style={{
				...rootInlineStyle,
				width: `${Math.round(width)}px`,
				height: `${Math.round(height)}px`,
				marginLeft:
					marginX > 0 ? `${Math.round(marginX)}px` : undefined,
				marginRight:
					marginX > 0 ? `${Math.round(marginX)}px` : undefined,
			}}
			data-width={Math.round(width)}
			data-height={Math.round(height)}
		>
			<div
				className={
					'modula-showcase__scale' + (isActive ? ' is-active' : '')
				}
			>
				{isPreview ? (
					<GalleryPreviewAdminToolbarSlot itemData={itemData} />
				) : null}
				<div className="modula-showcase__hover-media">
					{img}
					{hasOverlayChrome ? (
						<>
							<div
								className="modula-item-overlay"
								style={{ position: 'absolute', inset: 0 }}
								aria-hidden="true"
							/>
							<div
								className="modula-item-content"
								style={{ position: 'absolute', inset: 0 }}
							>
								<div
									className={`figc${showTitle ? '' : ' no-title'}${
										showDescription ? '' : ' no-description'
									}${hasInlineSocials ? '' : ' no-social'}`}
								>
									<div className="figc-inner">
										<GalleryItemTextContent
											item={item}
											hasTitle={showTitle}
											hasDescription={showDescription}
											hasSocials={hasInlineSocials}
										/>
									</div>
								</div>
							</div>
						</>
					) : null}
				</div>
				{hitTarget}
				{showExpandableSocials ? (
					<GalleryItemExpandableSocials
						itemId={item.id}
						socials={item.socials}
						desktopCollapsed={socialDesktopCollapsed}
					/>
				) : null}
			</div>
		</div>
	);
}

export default memo(ShowcaseSlide);
