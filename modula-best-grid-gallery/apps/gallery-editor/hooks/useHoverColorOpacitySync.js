/**
 * Keep `hover.hoverOpacity` in sync with Dim color alpha (strength slider is hidden).
 * On first paint, compose rgba into `hoverColor` when the stored color is opaque.
 */
import { useEffect, useRef } from '@wordpress/element';
import {
	formatRgbaColor,
	parseCssColor,
} from '../utils/cssColorValue';

/**
 * @param {number} alpha 0–1
 * @return {number} 0–100
 */
function opacityPctFromAlpha(alpha) {
	return Math.min(100, Math.max(0, Math.round(alpha * 100)));
}

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 */
export function useHoverColorOpacitySync(form) {
	const lastColorRef = useRef(/** @type {string|null} */ (null));
	const composedOnceRef = useRef(false);

	useEffect(() => {
		const unsub = form.store.subscribe(() => {
			const hover = form.state.values?.hover;
			if (!hover || typeof hover !== 'object') {
				return;
			}

			const colorRaw =
				typeof hover.hoverColor === 'string' ? hover.hoverColor.trim() : '';
			const opacityRaw = Number(hover.hoverOpacity);
			const opacityPct = Number.isFinite(opacityRaw)
				? Math.min(100, Math.max(0, Math.round(opacityRaw)))
				: 50;

			const parts = parseCssColor(colorRaw);
			if (!parts) {
				lastColorRef.current = colorRaw;
				return;
			}

			const colorHasVisibleAlpha = parts.a < 0.999;
			if (!composedOnceRef.current) {
				composedOnceRef.current = true;
				if (!colorHasVisibleAlpha && opacityPct < 100) {
					const composed = formatRgbaColor({
						...parts,
						a: opacityPct / 100,
					});
					if (composed !== colorRaw) {
						form.setFieldValue('hover.hoverColor', composed);
						lastColorRef.current = composed;
						return;
					}
				}
			}

			if (lastColorRef.current === colorRaw) {
				return;
			}
			lastColorRef.current = colorRaw;

			const nextOpacity = opacityPctFromAlpha(parts.a);
			if (nextOpacity !== opacityPct) {
				form.setFieldValue('hover.hoverOpacity', nextOpacity);
			}
		});
		return unsub;
	}, [form]);
}
