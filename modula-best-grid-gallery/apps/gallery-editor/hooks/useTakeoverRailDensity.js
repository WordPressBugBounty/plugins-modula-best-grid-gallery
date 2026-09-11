/**
 * Automatic sidebar rail density for the takeover workspace.
 *
 * Compact floor is `RAIL_DENSITY_FALLBACKS.minLeftover` in resolveRailDensity.js.
 * Rail / panel / gap still follow CSS tokens when present.
 */
import { useLayoutEffect, useState } from '@wordpress/element';
import {
	parseCssPx,
	RAIL_DENSITY_FALLBACKS,
	resolveRailDensity,
} from '../utils/resolveRailDensity';

const AUX_PANEL_SELECTOR = '.modula-ui-auxiliary-panel';

/**
 * @param {Element|null} el       Workspace or app element.
 * @param {string}       name     CSS custom property name.
 * @param {number}       fallback Fallback when the var is missing.
 * @return {number} Pixel length from the custom property, or fallback.
 */
function readPxVar(el, name, fallback) {
	if (!el || typeof window.getComputedStyle !== 'function') {
		return fallback;
	}
	const parsed = parseCssPx(
		window.getComputedStyle(el).getPropertyValue(name)
	);
	return parsed === null ? fallback : parsed;
}

/**
 * @param {Element|null} workspaceEl Takeover workspace.
 * @return {number} Auxiliary column width in px.
 */
function measureAuxWidth(workspaceEl) {
	if (!workspaceEl) {
		return 0;
	}
	const aux = workspaceEl.querySelector(AUX_PANEL_SELECTOR);
	if (!aux) {
		return 0;
	}
	const width = aux.getBoundingClientRect().width;
	return Number.isFinite(width) ? width : 0;
}

/**
 * @param {Element|null} workspaceEl Takeover workspace.
 * @return {'comfortable'|'compact'} Rail density for the current leftover.
 */
function measureRailDensity(workspaceEl) {
	const mountWidth = workspaceEl?.clientWidth ?? 0;
	const railWidth = readPxVar(
		workspaceEl,
		'--mod-se-rail-w',
		RAIL_DENSITY_FALLBACKS.railWidth
	);
	const panelWidth = readPxVar(
		workspaceEl,
		'--mod-se-panel-w',
		RAIL_DENSITY_FALLBACKS.panelWidth
	);
	const gap = readPxVar(
		workspaceEl,
		'--mod-se-canvas-gap',
		RAIL_DENSITY_FALLBACKS.stagePaddingX / 2
	);

	return resolveRailDensity({
		mountWidth,
		railWidth,
		panelWidth,
		auxWidth: measureAuxWidth(workspaceEl),
		stagePaddingX: gap * 2,
		minLeftover: RAIL_DENSITY_FALLBACKS.minLeftover,
	});
}

/**
 * @return {'comfortable'|'compact'} Density guessed from window width.
 */
function initialRailDensity() {
	if (typeof window === 'undefined') {
		return 'comfortable';
	}
	return resolveRailDensity({
		mountWidth: window.innerWidth,
		railWidth: RAIL_DENSITY_FALLBACKS.railWidth,
		panelWidth: RAIL_DENSITY_FALLBACKS.panelWidth,
		auxWidth: 0,
		stagePaddingX: RAIL_DENSITY_FALLBACKS.stagePaddingX,
		minLeftover: RAIL_DENSITY_FALLBACKS.minLeftover,
	});
}

/**
 * @param {Object}                    props
 * @param {{ current: Element|null }} props.workspaceRef
 * @param {boolean}                   [props.isAuxiliaryOpen]
 * @return {'comfortable'|'compact'} Automatic rail density.
 */
export function useTakeoverRailDensity({
	workspaceRef,
	isAuxiliaryOpen = false,
}) {
	const [density, setDensity] = useState(initialRailDensity);

	useLayoutEffect(() => {
		const el = workspaceRef.current;
		if (!el) {
			return undefined;
		}

		const update = () => {
			setDensity(measureRailDensity(el));
		};

		update();

		if (typeof window.ResizeObserver === 'undefined') {
			return undefined;
		}

		const ro = new window.ResizeObserver(update);
		ro.observe(el);
		const aux = el.querySelector(AUX_PANEL_SELECTOR);
		if (aux) {
			ro.observe(aux);
		}

		return () => {
			ro.disconnect();
		};
	}, [workspaceRef, isAuxiliaryOpen]);

	return density;
}
