/**
 * Responsive column count from gallery config breakpoints.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import {
	getForcedPreviewViewport,
	getMasonryMobileMq,
	getMasonryTabletMq,
	resolvePolaroidUniformColumns,
	resolveResponsiveColumns,
	resolveResponsiveGutterValue,
} from '../utils/resolvePreviewViewport';

/**
 * @param {Object|null|undefined} config Gallery flat config.
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {number}
 */
export function resolveResponsiveColumnsForConfig(config, opts = {}) {
	return resolveResponsiveColumns(config, {
		layout: opts.layout ?? 'masonry',
	});
}

/**
 * @param {Object|null|undefined} config
 * @return {number}
 */
export function resolveResponsiveGutter(config, opts = {}) {
	return resolveResponsiveGutterValue(config, {
		layout: opts.layout ?? 'masonry',
	});
}

/**
 * @param {Object|null|undefined} config
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {number}
 */
export function useResponsiveColumns(config, opts = {}) {
	const layout = opts.layout ?? 'masonry';
	const forcedViewport = getForcedPreviewViewport(config);
	const [columns, setColumns] = useState(() =>
		resolveResponsiveColumnsForConfig(config, { layout })
	);

	useEffect(() => {
		if (forcedViewport) {
			setColumns(resolveResponsiveColumnsForConfig(config, { layout }));
			return undefined;
		}

		if (!config?.enableResponsive || typeof window === 'undefined') {
			setColumns(parseInt(config?.columns ?? 3, 10) || 3);
			return undefined;
		}

		const update = () =>
			setColumns(resolveResponsiveColumnsForConfig(config, { layout }));
		update();

		const tablet = window.matchMedia(getMasonryTabletMq(config));
		const mobile = window.matchMedia(getMasonryMobileMq(config));
		tablet.addEventListener('change', update);
		mobile.addEventListener('change', update);
		return () => {
			tablet.removeEventListener('change', update);
			mobile.removeEventListener('change', update);
		};
	}, [
		forcedViewport,
		config?.columns,
		config?.enableResponsive,
		config?.mobileColumns,
		config?.tabletColumns,
		config?.treatAsPhoneUnder,
		config?.treatAsTabletUnder,
		config?.previewViewport,
		layout,
	]);

	return columns;
}

/**
 * @param {Object|null|undefined} config
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {number}
 */
export function useResponsiveGutter(config, opts = {}) {
	const layout = opts.layout ?? 'masonry';
	const forcedViewport = getForcedPreviewViewport(config);
	const [gutter, setGutter] = useState(() =>
		resolveResponsiveGutterValue(config, { layout })
	);

	useEffect(() => {
		if (forcedViewport) {
			setGutter(resolveResponsiveGutterValue(config, { layout }));
			return undefined;
		}

		if (!config?.enableResponsive || typeof window === 'undefined') {
			setGutter(resolveResponsiveGutterValue(config, { layout }));
			return undefined;
		}
		const update = () =>
			setGutter(resolveResponsiveGutterValue(config, { layout }));
		update();
		const tablet = window.matchMedia(getMasonryTabletMq(config));
		const mobile = window.matchMedia(getMasonryMobileMq(config));
		tablet.addEventListener('change', update);
		mobile.addEventListener('change', update);
		return () => {
			tablet.removeEventListener('change', update);
			mobile.removeEventListener('change', update);
		};
	}, [
		forcedViewport,
		config?.gutter,
		config?.desktopGutter,
		config?.tabletGutter,
		config?.mobileGutter,
		config?.enableResponsive,
		config?.treatAsPhoneUnder,
		config?.treatAsTabletUnder,
		config?.previewViewport,
		layout,
	]);

	return gutter;
}

/**
 * Polaroid uniform-size columns for the active viewport (desktop = uniformColumns).
 *
 * @param {Object|null|undefined} config
 * @param {number}                uniformColumns
 * @return {number}
 */
export function usePolaroidUniformColumns(config, uniformColumns) {
	const forcedViewport = getForcedPreviewViewport(config);
	const [columns, setColumns] = useState(() =>
		resolvePolaroidUniformColumns(config, uniformColumns)
	);

	useEffect(() => {
		if (forcedViewport) {
			setColumns(resolvePolaroidUniformColumns(config, uniformColumns));
			return undefined;
		}

		if (!config?.enableResponsive || typeof window === 'undefined') {
			setColumns(resolvePolaroidUniformColumns(config, uniformColumns));
			return undefined;
		}

		const update = () =>
			setColumns(resolvePolaroidUniformColumns(config, uniformColumns));
		update();

		const tablet = window.matchMedia(getMasonryTabletMq(config));
		const mobile = window.matchMedia(getMasonryMobileMq(config));
		tablet.addEventListener('change', update);
		mobile.addEventListener('change', update);
		return () => {
			tablet.removeEventListener('change', update);
			mobile.removeEventListener('change', update);
		};
	}, [
		forcedViewport,
		uniformColumns,
		config?.enableResponsive,
		config?.mobileColumns,
		config?.tabletColumns,
		config?.treatAsPhoneUnder,
		config?.treatAsTabletUnder,
		config?.previewViewport,
	]);

	return columns;
}
