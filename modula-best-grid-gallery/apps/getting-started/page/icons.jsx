// Resource card icons, drawn like the admin-ui stroke icons. All are
// decorative: the card title names the resource.

/**
 * A decorative 20px stroke icon drawn from one path, as the admin-ui icons.
 *
 * @param {Object} props
 * @param {string} props.d SVG path data on a 24×24 grid.
 */
export function StrokeIcon({ d }) {
	return (
		<svg
			width={20}
			height={20}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d={d} />
		</svg>
	);
}

export const DocumentationIcon = () => (
	<StrokeIcon d="M4 19V5a2 2 0 012-2h14v16H6a2 2 0 00-2 2 2 2 0 002 2h14M8 7h8M8 11h5" />
);

export const SettingsIcon = () => (
	<StrokeIcon d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" />
);

export const GalleriesIcon = () => (
	<StrokeIcon d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5v.01" />
);

export const ExtensionsIcon = () => (
	<StrokeIcon d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7" />
);
