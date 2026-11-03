/**
 * Icons of the canvas toolbar's Sort (`CanvasSortPopover`). All paths use
 * currentColor, so they follow the button ink.
 */
import { Circle, Path, SVG } from '@wordpress/primitives';

/** Three descending lines with knob on the shortest — Sort */
export const canvasSortIcon = (
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

/** Chevron after the Sort label; it turns over while the popover is open. */
export const canvasSortChevronIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M6 9l6 6 6-6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);

/** Two crossing arrows — Open drag-and-drop reorder. */
export const canvasReorderIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path
			d="M5 9h14M5 15h14M9 5l-4 4 4 4M15 11l4 4-4 4"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</SVG>
);
