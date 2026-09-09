import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { useDebouncedValue } from './useDebouncedValue';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';
import { buildSettingsCommandPaletteIndex } from '../utils/buildSettingsCommandPaletteIndex';
import {
	filterPaletteEntries,
	searchPaletteEntries,
} from '../utils/settingsCommandPaletteFilter';

const QUERY_DEBOUNCE_MS = 200;

/**
 * Debounced search + visibility filtering for the settings command palette.
 *
 * @param {boolean}                                 isOpen       Whether the palette is visible.
 * @param {Record<string, Record<string, unknown>>} values       TanStack grouped form values.
 * @return {Object} Palette model: `query`, `setQuery`, `filteredEntries`, `activeIndex`, `setActiveIndex`, `moveActive`.
 */
export function useSettingsCommandPaletteModel(isOpen, values) {
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const debouncedQuery = useDebouncedValue(query, QUERY_DEBOUNCE_MS);
	const config = useModulaSettingsEditorConfig();
	const groupLabelsKey = JSON.stringify(config.formUi?.groupLabels ?? {});

	const fullIndex = useMemo(
		() => buildSettingsCommandPaletteIndex(groupLabelsKey),
		[groupLabelsKey]
	);

	const visibleEntries = useMemo(
		() => filterPaletteEntries(fullIndex, values),
		[fullIndex, values]
	);

	const filteredEntries = useMemo(
		() => searchPaletteEntries(visibleEntries, debouncedQuery),
		[visibleEntries, debouncedQuery]
	);

	const prevDebouncedQueryRef = useRef(debouncedQuery);
	const wasOpenRef = useRef(isOpen);

	useEffect(() => {
		if (!isOpen) {
			setQuery('');
			setActiveIndex(0);
			wasOpenRef.current = false;
			prevDebouncedQueryRef.current = '';
			return;
		}

		const justOpened = !wasOpenRef.current;
		wasOpenRef.current = true;

		const debouncedQueryChanged =
			prevDebouncedQueryRef.current !== debouncedQuery;
		prevDebouncedQueryRef.current = debouncedQuery;

		if (justOpened || debouncedQueryChanged) {
			setActiveIndex(0);
			return;
		}

		setActiveIndex((i) =>
			filteredEntries.length === 0
				? 0
				: Math.min(i, filteredEntries.length - 1)
		);
	}, [isOpen, debouncedQuery, filteredEntries.length]);

	const moveActive = (delta) => {
		if (filteredEntries.length === 0) {
			return;
		}
		setActiveIndex((i) => {
			const next = i + delta;
			if (next < 0) {
				return filteredEntries.length - 1;
			}
			if (next >= filteredEntries.length) {
				return 0;
			}
			return next;
		});
	};

	return {
		query,
		setQuery,
		filteredEntries,
		activeIndex,
		setActiveIndex,
		moveActive,
	};
}
