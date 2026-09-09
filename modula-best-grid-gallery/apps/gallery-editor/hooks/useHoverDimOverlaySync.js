/**
 * Keep sidebar `hover.dimOverlay` and builder `hover.builder.dimOverlay` aligned for live preview.
 */
import { useEffect, useRef } from '@wordpress/element';

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 */
export function useHoverDimOverlaySync(form) {
	const lastRootRef = useRef(/** @type {boolean|null} */ (null));
	const lastBuilderRef = useRef(/** @type {boolean|null} */ (null));

	useEffect(() => {
		const unsub = form.store.subscribe(() => {
			const hover = form.state.values?.hover;
			if (!hover || typeof hover !== 'object') {
				return;
			}
			const builder =
				hover.builder && typeof hover.builder === 'object'
					? hover.builder
					: null;
			if (!builder) {
				return;
			}

			const rootDim = !!hover.dimOverlay;
			const builderDim = !!builder.dimOverlay;

			if (lastRootRef.current === null || lastBuilderRef.current === null) {
				lastRootRef.current = rootDim;
				lastBuilderRef.current = builderDim;
				if (rootDim !== builderDim) {
					form.setFieldValue('hover.dimOverlay', builderDim);
					lastRootRef.current = builderDim;
				}
				return;
			}

			const rootChanged = rootDim !== lastRootRef.current;
			const builderChanged = builderDim !== lastBuilderRef.current;

			if (rootChanged && !builderChanged) {
				form.setFieldValue(['hover', 'builder', 'dimOverlay'], rootDim);
				lastBuilderRef.current = rootDim;
			} else if (builderChanged && !rootChanged) {
				form.setFieldValue('hover.dimOverlay', builderDim);
				lastRootRef.current = builderDim;
			} else if (rootChanged && builderChanged && rootDim !== builderDim) {
				form.setFieldValue(['hover', 'builder', 'dimOverlay'], rootDim);
				lastBuilderRef.current = rootDim;
			}

			lastRootRef.current = rootDim;
			lastBuilderRef.current = builderDim;
		});
		return unsub;
	}, [form]);
}
