/**
 * Stroke icons for the takeover history controls (save state, undo, redo).
 */
import { Path, SVG } from '@wordpress/primitives';

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.6',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

export const historyIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8M3 3v5h5M12 7v5l3 3" />
	</SVG>
);

export const undoIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M9 14 4 9l5-5" />
		<Path d="M4 9h11a5 5 0 0 1 0 10h-4" />
	</SVG>
);

export const redoIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="m15 14 5-5-5-5" />
		<Path d="M20 9H9a5 5 0 0 0 0 10h4" />
	</SVG>
);
