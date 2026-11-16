/**
 * Freeform placements of a preset applied in the editor (Pro Apply preset,
 * ADR 0051 and 0059). The server maps a Preset layout onto the gallery's
 * stored catalog; the editor applies the preset to its working catalog, which
 * may hold unsaved additions, removals and moves. So the editor maps the
 * layout's slots itself, by the same rule, and otherwise keeps its working
 * placements (as Apply keeps the target's own).
 *
 * @package
 */

import {
	freeformOccurrenceIds,
	placeFreeformLayoutSlots,
} from 'gallery-shared/layoutRules';
import { isSettingsGroup } from './groupedSettingsFields';

/**
 * @param {Record<string, Record<string, unknown>>} settings    Grouped preset settings from the server.
 * @param {Object[]}                                layoutSlots The preset's layout slots (empty without a Preset layout).
 * @param {Object[]}                                items       The working catalog, in order.
 * @return {Record<string, Record<string, unknown>>} Settings to apply: placements mapped onto the working catalog, or left out so the working ones stay.
 */
export function presetSettingsForWorkingCatalog(settings, layoutSlots, items) {
	if (!isSettingsGroup(settings?.freeform)) {
		return settings;
	}
	const { placements, ...freeform } = settings.freeform;
	const hasLayout = Array.isArray(layoutSlots) && layoutSlots.length > 0;
	if (!hasLayout || items.length === 0) {
		return { ...settings, freeform };
	}
	return {
		...settings,
		freeform: {
			...freeform,
			placements: placeFreeformLayoutSlots(
				freeformOccurrenceIds(items),
				layoutSlots
			),
		},
	};
}
