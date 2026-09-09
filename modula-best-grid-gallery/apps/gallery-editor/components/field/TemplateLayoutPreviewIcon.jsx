/**
 * Inline SVG wireframe previews for template layout MenuSelect options.
 *
 * @package
 */

/**
 * @param {string} slug
 * @return {import('react').ReactNode}
 */
export function TemplateLayoutPreviewIcon({ slug }) {
	const common = {
		width: 40,
		height: 28,
		viewBox: '0 0 40 28',
		fill: 'none',
		xmlns: 'http://www.w3.org/2000/svg',
		'aria-hidden': true,
	};

	switch (slug) {
		case 'split-stack':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="1" y="11" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="15" y="1" width="24" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'asymmetric-trio':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="14" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="17" y="5" width="22" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="22" y="17" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'offset-duo':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="38" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="1" y="11" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="24" y="15" width="15" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'minimal-feature':
			return (
				<svg {...common}>
					<rect x="8" y="1" width="24" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="1" y="17" width="16" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="23" y="17" width="16" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'editorial-hero':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="30" y="1" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="12" y="8" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 1.5" />
					<rect x="3" y="18" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="28" y="16" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'magazine-spread':
			return (
				<svg {...common}>
					<rect x="1" y="6" width="11" height="20" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="14" y="1" width="10" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="26" y="1" width="13" height="8" rx="1.5" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 1.5" />
					<rect x="28" y="11" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="26" y="21" width="13" height="6" rx="1.5" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 1.5" />
				</svg>
			);
		case 'lookbook-ladder':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="16" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="18" y="6" width="14" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="4" y="13" width="15" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="20" y="18" width="12" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'corner-collage':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="30" y="2" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="3" y="18" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="28" y="16" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'portfolio-statement':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="12" height="26" rx="1.5" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 1.5" />
					<rect x="15" y="1" width="24" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="15" y="13" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="28" y="13" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		case 'editorial-cluster':
			return (
				<svg {...common}>
					<rect x="1" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="13" y="4" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="23" y="1" width="16" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="4" y="15" width="7" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="13" y="16" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
					<rect x="27" y="14" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
		default:
			return (
				<svg {...common}>
					<rect x="1" y="1" width="38" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
				</svg>
			);
	}
}
