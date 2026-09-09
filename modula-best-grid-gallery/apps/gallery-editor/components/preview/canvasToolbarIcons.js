/**
 * Canvas toolbar icons — all paths use currentColor (WP drawerRight does not).
 */
import { Circle, Path, Rect, SVG } from '@wordpress/primitives';

/** Empty checkbox — Select multiple (enter multi-select mode) */
export const canvasToolbarSelectMultipleIcon = (
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

/** Checkbox with check — Select all */
export const canvasToolbarSelectAllIcon = (
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
		<Path
			d="M8.2 12.1 10.6 14.6 15.9 9"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);

/** Split pane / drawer — Bulk edit (same glyph as drawerRight, with currentColor). */
export const canvasToolbarBulkEditIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			fill="currentColor"
			fillRule="evenodd"
			clipRule="evenodd"
			d="M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-4 14.5H6c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h8v13zm4.5-.5c0 .3-.2.5-.5.5h-2.5v-13H18c.3 0 .5.2.5.5v12z"
		/>
	</SVG>
);

/** Three descending lines with knob on the shortest — Sort */
export const canvasToolbarSortIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M5 7.25h14"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
		/>
		<Path
			d="M5 12h10"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
		/>
		<Path
			d="M5 16.75h6"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
		/>
		<Circle cx="14.75" cy="16.75" r="2" fill="currentColor" />
	</SVG>
);
