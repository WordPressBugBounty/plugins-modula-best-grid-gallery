import { Path, SVG } from '@wordpress/primitives';

/** Double-check icon for the listing proofing badge (mockup parity). */
export const proofingBadgeIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 16 16"
		width={12}
		height={12}
	>
		<Path
			fill="currentColor"
			d="M2.4 8.1 4.9 10.6 9.8 4.7 8.8 3.7 4.9 8.7 3.4 7.2z"
		/>
		<Path
			fill="currentColor"
			d="M6.1 8.1 8.6 10.6 13.5 4.7 12.5 3.7 8.6 8.7 7.1 7.2z"
		/>
	</SVG>
);
