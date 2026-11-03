/**
 * Stroke icons for the takeover top bar (back, menus, rename, add, embed, close).
 */
import { Path, SVG } from '@wordpress/primitives';

const strokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '1.6',
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

export const backIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M15 18l-6-6 6-6" />
	</SVG>
);

export const chevronDownIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M6 9l6 6 6-6" />
	</SVG>
);

export const closeIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M6 6l12 12M18 6L6 18" />
	</SVG>
);

export const pencilIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
	</SVG>
);

export const plusIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M12 5v14M5 12h14" />
	</SVG>
);

export const embedIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...strokeProps}
	>
		<Path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
	</SVG>
);
