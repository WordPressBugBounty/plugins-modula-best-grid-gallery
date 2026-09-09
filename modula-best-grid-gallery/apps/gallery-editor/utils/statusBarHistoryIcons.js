/**
 * Stroke undo/redo icons for the canvas status bar (styleguide `.hbtn`).
 */
import { Path, SVG } from '@wordpress/primitives';

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.9',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

export const statusBarUndoIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M9 14 4 9l5-5" />
		<Path d="M4 9h11a5 5 0 0 1 0 10h-4" />
	</SVG>
);

export const statusBarRedoIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="m15 14 5-5-5-5" />
		<Path d="M20 9H9a5 5 0 0 0 0 10h4" />
	</SVG>
);
