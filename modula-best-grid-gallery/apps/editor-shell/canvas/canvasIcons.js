/**
 * Stroke icons for the canvas device pill (the canvas's device glyphs).
 */
import { Path, SVG } from '@wordpress/primitives';

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.7',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

export const desktopIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M4 5h16v11H4zM2 19h20" />
	</SVG>
);

export const tabletIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2" />
	</SVG>
);

export const phoneIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2" />
	</SVG>
);
