/**
 * Selection-bar icons — stroke paths use currentColor.
 */
import { Path, Rect, SVG } from '@wordpress/primitives';

export const selectionBarFiltersIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M3 5h18M6 12h12M10 19h4"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
		/>
	</SVG>
);

export const selectionBarWatermarkIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M12 3l7.5 3v6c0 4.5-3 8.2-7.5 9.5C7.5 20.2 4.5 16.5 4.5 12V6Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
		/>
	</SVG>
);

export const selectionBarReplaceIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M12 16V4M8 8l4-4 4 4"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
		/>
		<Path
			d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
		/>
	</SVG>
);

export const selectionBarTrashIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M12 5.5A2.25 2.25 0 0 0 9.878 7h4.244A2.251 2.251 0 0 0 12 5.5ZM12 4a3.751 3.751 0 0 0-3.675 3H5v1.5h1.27l.818 8.997a2.75 2.75 0 0 0 2.739 2.501h4.347a2.75 2.75 0 0 0 2.738-2.5L17.73 8.5H19V7h-3.325A3.751 3.751 0 0 0 12 4Zm4.224 4.5H7.776l.806 8.861a1.25 1.25 0 0 0 1.245 1.137h4.347a1.25 1.25 0 0 0 1.245-1.137l.805-8.861Z"
			fill="currentColor"
		/>
	</SVG>
);

export const selectionBarChevronIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="m6 9 6 6 6-6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);

export const selectionBarCheckIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="m20 6-11 11-5-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.9"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);

export const selectionBarDashIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M6 12h12"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
		/>
	</SVG>
);

export const selectionBarPlusIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M12 5v14M5 12h14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
		/>
	</SVG>
);

export const selectionBarClearIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M6 6l12 12M18 6 6 18"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.9"
			strokeLinecap="round"
		/>
	</SVG>
);

export const selectionBarMediaLibraryIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Rect
			x="3"
			y="4"
			width="18"
			height="16"
			rx="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
		/>
		<Path
			d="M8.5 9.5a1.6 1.6 0 1 0 0.001 0"
			fill="currentColor"
			stroke="none"
		/>
		<Path
			d="m3.5 17 5-5 4.5 4.5L17 13l3.5 3.5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);

/** Empty checkbox box for filter tri-state (0 selected). */
export const selectionBarFilterEmptyIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Rect
			x="4.25"
			y="4.25"
			width="15.5"
			height="15.5"
			rx="2"
			ry="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</SVG>
);

/** Partial filter state — accent box with dash. */
export const selectionBarFilterPartialIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Rect
			x="4"
			y="4"
			width="16"
			height="16"
			rx="2"
			ry="2"
			fill="currentColor"
			stroke="none"
		/>
		<Path
			d="M8 12h8"
			fill="none"
			stroke="#fff"
			strokeWidth="2.4"
			strokeLinecap="round"
		/>
	</SVG>
);

/** All selected — accent box with check. */
export const selectionBarFilterAllIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Rect
			x="4"
			y="4"
			width="16"
			height="16"
			rx="2"
			ry="2"
			fill="currentColor"
			stroke="none"
		/>
		<Path
			d="m8.2 12.1 2.4 2.5 5.3-5.6"
			fill="none"
			stroke="#fff"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);
