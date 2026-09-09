/**
 * Stroke icons for the redesign Add images flyout (styleguide iframe SVGs).
 */
import { Path, SVG, Circle, Rect } from '@wordpress/primitives';

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.7',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

/** Upload tray — Upload files */
export const addMenuUploadFilesIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M12 16V4M8 8l4-4 4 4" />
		<Path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
	</SVG>
);

/** Folder + download arrow — ZIP archive */
export const addMenuZipArchiveIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M4 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
		<Path d="M12 10v5M9.5 12.5 12 15l2.5-2.5" />
	</SVG>
);

/** Landscape frame — Media library */
export const addMenuMediaLibraryIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Rect x="3" y="4" width="18" height="16" rx="2" />
		<Circle cx="8.5" cy="9.5" r="1.6" />
		<Path d="m3.5 17 5-5 4.5 4.5L17 13l3.5 3.5" />
	</SVG>
);

/** Folder outline — Server folder */
export const addMenuFolderIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M4 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
	</SVG>
);

/** Layout grid — Content block */
export const addMenuContentBlockIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Rect x="3" y="4" width="18" height="16" rx="2" />
		<Path d="M3 9h18M9 9v11" />
	</SVG>
);

/** 2×2 tiles — Another gallery */
export const addMenuAnotherGalleryIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
		<Rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
		<Rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
		<Rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
	</SVG>
);

/** Play in frame — Video */
export const addMenuVideoIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Rect x="3" y="5" width="18" height="14" rx="2" />
		<Path d="m10.5 9.5 5 2.5-5 2.5Z" />
	</SVG>
);

/** Lines + play — Video playlist */
export const addMenuVideoPlaylistIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M4 6h11M4 12h11M4 18h7" />
		<Path d="m17 11 4 3-4 3Z" />
	</SVG>
);

/** Instagram glyph */
export const addMenuInstagramIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Rect x="3" y="3" width="18" height="18" rx="5" />
		<Circle cx="12" cy="12" r="4" />
		<Circle cx="17.5" cy="6.5" r="1.1" />
	</SVG>
);
