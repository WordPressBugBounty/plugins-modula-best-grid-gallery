/**
 * Modula Gallery - Gallery slice
 * grouped settings (source of truth), gallery config (derived), metadata, galleryId, fetchFunction
 *
 * @package
 */

import { createSlice } from '@reduxjs/toolkit';
import { deriveGalleryConfig } from '../../utils/deriveGalleryConfig';

const initialState = {
	/** Grouped settings (v2 JSON). Source of truth. */
	settings: {},
	/** Gallery config derived from grouped settings. */
	config: {},
	metadata: {},
	galleryId: null,
	fetchFunction: null,
};

const gallerySlice = createSlice({
	name: 'gallery',
	initialState,
	reducers: {
		setGallery: (state, action) => {
			const { settings, metadata, galleryId, fetchFunction, extras } =
				action.payload || {};
			if (galleryId !== undefined) {
				state.galleryId = galleryId;
			}
			if (metadata !== undefined) {
				state.metadata = metadata;
			}
			if (fetchFunction !== undefined) {
				state.fetchFunction = fetchFunction;
			}
			if (settings !== undefined) {
				state.settings = settings;
				const extraBag =
					extras && typeof extras === 'object' ? extras : {};
				state.config = deriveGalleryConfig(settings, {
					...extraBag,
					galleryId:
						extraBag.galleryId ??
						(galleryId !== undefined ? galleryId : state.galleryId),
				});
			}
		},
	},
});

export const { setGallery } = gallerySlice.actions;
export default gallerySlice.reducer;
