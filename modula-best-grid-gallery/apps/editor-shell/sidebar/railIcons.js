/**
 * Stroke icons for the rail footer's appearance menu (the canvas's moon and sun).
 */
import { Path, SVG } from '@wordpress/primitives';

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.6',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

export const moonIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
	</SVG>
);

export const sunIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M12 4V2M12 22v-2M4.9 4.9L3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 7a5 5 0 100 10 5 5 0 000-10z" />
	</SVG>
);
