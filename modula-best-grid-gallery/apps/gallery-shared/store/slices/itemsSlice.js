/**
 * Modula Gallery - Items slice
 * items (display), originalItems, filteredItems
 * Syncs from RTK Query getItems.fulfilled when server-side.
 *
 * @package
 */

import { createSlice } from '@reduxjs/toolkit';
import { galleryApi } from '../api/galleryApi';

const initialState = {
	items: [],
	originalItems: [],
	filteredItems: null,
};

const itemsSlice = createSlice({
	name: 'items',
	initialState,
	reducers: {
		setItems: (state, action) => {
			state.items = Array.isArray(action.payload) ? action.payload : [];
		},
		setOriginalItems: (state, action) => {
			state.originalItems = Array.isArray(action.payload)
				? action.payload
				: [];
		},
		setFilteredItems: (state, action) => {
			state.filteredItems = Array.isArray(action.payload)
				? action.payload
				: null;
		},
		clearFilteredItems: (state) => {
			state.filteredItems = null;
		},
		addItems: (state, action) => {
			if (Array.isArray(action.payload)) {
				state.items.push(...action.payload);
			}
		},
	},
	extraReducers: (builder) => {
		builder.addMatcher(
			galleryApi.endpoints.getItems.matchFulfilled,
			(state, action) => {
				const { items, requestArg } = action.payload;
				if (!Array.isArray(items)) {
					return;
				}
				const isAppend =
					requestArg?.type === 'pagination' &&
					(requestArg?.mode === 'infinite-scroll' ||
						requestArg?.mode === 'load-more');
				if (isAppend) {
					state.items.push(...items);
				} else {
					state.items = items;
				}
			}
		);
	},
});

export const {
	setItems,
	setOriginalItems,
	setFilteredItems,
	clearFilteredItems,
	addItems,
} = itemsSlice.actions;
export default itemsSlice.reducer;
