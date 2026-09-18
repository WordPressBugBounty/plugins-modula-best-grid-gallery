/**
 * Modula Gallery - Filtering slice
 *
 * @package
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	enabled: false,
	type: 'client',
	activeFilters: [],
	availableFilters: [],
	/** Full-catalog filter→count map from PHP bootstrap (server/chunked catalogs). */
	usageCounts: null,
	/** Full-catalog filterable image count for the All label. */
	filterableImageCount: null,
};

const filteringSlice = createSlice({
	name: 'filtering',
	initialState,
	reducers: {
		setFiltering: (state, action) => {
			Object.assign(state, action.payload);
		},
		setActiveFilters: (state, action) => {
			state.activeFilters = Array.isArray(action.payload)
				? action.payload
				: [];
		},
		clearFilters: (state) => {
			state.activeFilters = [];
		},
		addFilter: (state, action) => {
			const { key, value } = action.payload;
			const idx = state.activeFilters.findIndex((f) => f.key === key);
			if (idx >= 0) {
				state.activeFilters[idx].value = value;
			} else {
				state.activeFilters.push({ key, value });
			}
		},
		removeFilter: (state, action) => {
			state.activeFilters = state.activeFilters.filter(
				(f) => f.key !== action.payload
			);
		},
	},
});

export const {
	setFiltering,
	setActiveFilters,
	clearFilters,
	addFilter,
	removeFilter,
} = filteringSlice.actions;
export default filteringSlice.reducer;
