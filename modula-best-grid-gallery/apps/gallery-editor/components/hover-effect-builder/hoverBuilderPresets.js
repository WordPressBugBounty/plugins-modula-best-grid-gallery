import { __ } from '@wordpress/i18n';

export const HOVER_BUILDER_PRESETS = [
	{
		id: 'none',
		label: __('None', 'modula-best-grid-gallery'),
		description: __(
			'Pure photos only: no hover motion, overlay, or on-image title, caption, or social icons.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: false,
			titleEnter: 'none',
			captionEnter: 'none',
			socialEnter: 'none',
			titleVisibility: 'hidden',
			captionVisibility: 'hidden',
			socialVisibility: 'hidden',
			cardEnterDurationMs: 180,
			cardEnterDelayMs: 0,
			titleEnterDurationMs: 180,
			captionEnterDurationMs: 180,
			socialEnterDurationMs: 180,
			titleEnterDelayMs: 0,
			captionEnterDelayMs: 0,
			socialEnterDelayMs: 0,
			titleEnterStaggerMs: 0,
			captionEnterStaggerMs: 0,
			socialEnterStaggerMs: 0,
			slotPositions: {
				title: { x: 50, y: 18 },
				caption: { x: 50, y: 50 },
				social: { x: 50, y: 82 },
			},
		},
		hover: {
			hoverColor: 'rgba(0,0,0,0)',
			hoverOpacity: 0,
		},
	},
	{
		id: 'none-with-captions',
		label: __('None - with captions', 'modula-best-grid-gallery'),
		description: __(
			'No hover effects, but title, caption, and social stay visible on the image.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: false,
			titleEnter: 'none',
			captionEnter: 'none',
			socialEnter: 'none',
			titleVisibility: 'always',
			captionVisibility: 'always',
			socialVisibility: 'always',
			cardEnterDurationMs: 180,
			cardEnterDelayMs: 0,
			titleEnterDurationMs: 180,
			captionEnterDurationMs: 180,
			socialEnterDurationMs: 180,
			titleEnterDelayMs: 0,
			captionEnterDelayMs: 0,
			socialEnterDelayMs: 0,
			titleEnterStaggerMs: 0,
			captionEnterStaggerMs: 0,
			socialEnterStaggerMs: 0,
			slotPositions: {
				title: { x: 50, y: 18 },
				caption: { x: 50, y: 30 },
				social: { x: 50, y: 82 },
			},
		},
		hover: {
			hoverColor: 'rgba(0,0,0,0)',
			hoverOpacity: 0,
		},
	},
	{
		id: 'balanced-reveal',
		label: __('Balanced reveal', 'modula-best-grid-gallery'),
		description: __(
			'General-purpose hover: soft zoom, readable overlay, all content revealed without drama.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'zoom',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'fade',
			captionEnter: 'fade',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 280,
			cardEnterDelayMs: 0,
			titleEnterDurationMs: 280,
			captionEnterDurationMs: 280,
			socialEnterDurationMs: 280,
			titleEnterDelayMs: 0,
			captionEnterDelayMs: 0,
			socialEnterDelayMs: 0,
			titleEnterStaggerMs: 40,
			captionEnterStaggerMs: 40,
			socialEnterStaggerMs: 40,
			slotPositions: {
				title: { x: 50, y: 24 },
				caption: { x: 50, y: 36 },
				social: { x: 50, y: 78 },
			},
		},
		hover: {
			hoverColor: 'rgba(17,17,17,.46)',
			hoverOpacity: 46,
		},
	},
	{
		id: 'portfolio-lift',
		label: __('Portfolio lift', 'modula-best-grid-gallery'),
		description: __(
			'A polished portfolio card with a small lift and upward content entrance.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'lift',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'slide-up',
			captionEnter: 'slide-up',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 320,
			cardEnterDelayMs: 25,
			titleEnterDurationMs: 320,
			captionEnterDurationMs: 320,
			socialEnterDurationMs: 320,
			titleEnterDelayMs: 25,
			captionEnterDelayMs: 25,
			socialEnterDelayMs: 25,
			titleEnterStaggerMs: 55,
			captionEnterStaggerMs: 55,
			socialEnterStaggerMs: 55,
			slotPositions: {
				title: { x: 50, y: 22 },
				caption: { x: 50, y: 34 },
				social: { x: 50, y: 76 },
			},
		},
		hover: {
			hoverColor: 'rgba(15,23,42,.54)',
			hoverOpacity: 54,
		},
	},
	{
		id: 'center-hero',
		label: __('Center hero', 'modula-best-grid-gallery'),
		description: __(
			'Hero-style hover with centered copy, stronger title emphasis, and balanced timing.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'zoom',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'scale',
			captionEnter: 'fade',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 360,
			cardEnterDelayMs: 20,
			titleEnterDurationMs: 360,
			captionEnterDurationMs: 360,
			socialEnterDurationMs: 360,
			titleEnterDelayMs: 20,
			captionEnterDelayMs: 20,
			socialEnterDelayMs: 20,
			titleEnterStaggerMs: 60,
			captionEnterStaggerMs: 60,
			socialEnterStaggerMs: 60,
			slotPositions: {
				title: { x: 50, y: 40 },
				caption: { x: 50, y: 54 },
				social: { x: 50, y: 70 },
			},
		},
		hover: {
			hoverColor: 'rgba(31,41,55,.52)',
			hoverOpacity: 52,
		},
	},
	{
		id: 'caption-spotlight',
		label: __('Caption spotlight', 'modula-best-grid-gallery'),
		description: __(
			'For storytelling galleries where the caption is the main content layer.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'blur-in',
			captionEnter: 'slide-up',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 340,
			cardEnterDelayMs: 40,
			titleEnterDurationMs: 340,
			captionEnterDurationMs: 340,
			socialEnterDurationMs: 340,
			titleEnterDelayMs: 40,
			captionEnterDelayMs: 40,
			socialEnterDelayMs: 40,
			titleEnterStaggerMs: 70,
			captionEnterStaggerMs: 70,
			socialEnterStaggerMs: 70,
			slotPositions: {
				title: { x: 50, y: 56 },
				caption: { x: 50, y: 70 },
				social: { x: 50, y: 86 },
			},
		},
		hover: {
			hoverColor: 'rgba(17,24,39,.64)',
			hoverOpacity: 64,
		},
	},
	{
		id: 'cinematic-dark',
		label: __('Cinematic dark', 'modula-best-grid-gallery'),
		description: __(
			'Darker, slower, dramatic reveal for large photography tiles.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'lift',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'blur-in',
			captionEnter: 'slide-up',
			socialEnter: 'slide-up',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 420,
			cardEnterDelayMs: 50,
			titleEnterDurationMs: 420,
			captionEnterDurationMs: 420,
			socialEnterDurationMs: 420,
			titleEnterDelayMs: 50,
			captionEnterDelayMs: 50,
			socialEnterDelayMs: 50,
			titleEnterStaggerMs: 80,
			captionEnterStaggerMs: 80,
			socialEnterStaggerMs: 80,
			slotPositions: {
				title: { x: 50, y: 60 },
				caption: { x: 50, y: 74 },
				social: { x: 50, y: 88 },
			},
		},
		hover: {
			hoverColor: 'rgba(2,6,23,.72)',
			hoverOpacity: 72,
		},
	},
	{
		id: 'editorial-corner-left',
		label: __('Editorial corner left', 'modula-best-grid-gallery'),
		description: __(
			'Magazine-like top-left stack: copy reveals together on hover.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'slide-right',
			captionEnter: 'slide-right',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 280,
			cardEnterDelayMs: 10,
			titleEnterDurationMs: 280,
			captionEnterDurationMs: 280,
			socialEnterDurationMs: 280,
			titleEnterDelayMs: 10,
			captionEnterDelayMs: 10,
			socialEnterDelayMs: 10,
			titleEnterStaggerMs: 35,
			captionEnterStaggerMs: 35,
			socialEnterStaggerMs: 35,
			slotPositions: {
				title: { x: 12, y: 16 },
				caption: { x: 12, y: 30 },
				social: { x: 12, y: 46 },
			},
		},
		hover: {
			hoverColor: 'rgba(16,24,39,.3)',
			hoverOpacity: 30,
		},
	},
	{
		id: 'editorial-corner-right',
		label: __('Editorial corner right', 'modula-best-grid-gallery'),
		description: __(
			'Clean top-right editorial layout: stacked copy reveals on hover.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'slide-left',
			captionEnter: 'slide-left',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 280,
			cardEnterDelayMs: 10,
			titleEnterDurationMs: 280,
			captionEnterDurationMs: 280,
			socialEnterDurationMs: 280,
			titleEnterDelayMs: 10,
			captionEnterDelayMs: 10,
			socialEnterDelayMs: 10,
			titleEnterStaggerMs: 35,
			captionEnterStaggerMs: 35,
			socialEnterStaggerMs: 35,
			slotPositions: {
				title: { x: 88, y: 16 },
				caption: { x: 88, y: 30 },
				social: { x: 88, y: 46 },
			},
		},
		hover: {
			hoverColor: 'rgba(15,23,42,.34)',
			hoverOpacity: 34,
		},
	},
	{
		id: 'monochrome-frame',
		label: __('Monochrome', 'modula-best-grid-gallery'),
		description: __(
			'Grayscale editorial hover with compact stacked content.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'grayscale',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'slide-up',
			captionEnter: 'slide-up',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 300,
			cardEnterDelayMs: 15,
			titleEnterDurationMs: 300,
			captionEnterDurationMs: 300,
			socialEnterDurationMs: 300,
			titleEnterDelayMs: 15,
			captionEnterDelayMs: 15,
			socialEnterDelayMs: 15,
			titleEnterStaggerMs: 45,
			captionEnterStaggerMs: 45,
			socialEnterStaggerMs: 45,
			slotPositions: {
				title: { x: 50, y: 24 },
				caption: { x: 50, y: 42 },
				social: { x: 50, y: 62 },
			},
		},
		hover: {
			hoverColor: 'rgba(15,17,21,.36)',
			hoverOpacity: 36,
		},
	},
	{
		id: 'social-strip-bottom',
		label: __('Social strip bottom', 'modula-best-grid-gallery'),
		description: __(
			'Keeps social actions predictable at the bottom while text enters above.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'slide-down',
			captionEnter: 'slide-right',
			socialEnter: 'slide-up',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 300,
			cardEnterDelayMs: 25,
			titleEnterDurationMs: 300,
			captionEnterDurationMs: 300,
			socialEnterDurationMs: 300,
			titleEnterDelayMs: 25,
			captionEnterDelayMs: 25,
			socialEnterDelayMs: 25,
			titleEnterStaggerMs: 55,
			captionEnterStaggerMs: 55,
			socialEnterStaggerMs: 55,
			slotPositions: {
				title: { x: 50, y: 20 },
				caption: { x: 50, y: 36 },
				social: { x: 50, y: 88 },
			},
		},
		hover: {
			hoverColor: 'rgba(11,18,32,.56)',
			hoverOpacity: 56,
		},
	},
	{
		id: 'product-card-clean',
		label: __('Product card clean', 'modula-best-grid-gallery'),
		description: __(
			'A restrained product/gallery hover: no tile motion, low overlay, bottom-stacked content.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'fade',
			captionEnter: 'slide-up',
			socialEnter: 'fade',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 240,
			cardEnterDelayMs: 0,
			titleEnterDurationMs: 240,
			captionEnterDurationMs: 240,
			socialEnterDurationMs: 240,
			titleEnterDelayMs: 0,
			captionEnterDelayMs: 0,
			socialEnterDelayMs: 0,
			titleEnterStaggerMs: 25,
			captionEnterStaggerMs: 25,
			socialEnterStaggerMs: 25,
			slotPositions: {
				title: { x: 50, y: 70 },
				caption: { x: 50, y: 82 },
				social: { x: 50, y: 92 },
			},
		},
		hover: {
			hoverColor: 'rgba(0,0,0,.24)',
			hoverOpacity: 24,
		},
	},
	{
		id: 'soft-zoom-stack',
		label: __('Soft zoom stack', 'modula-best-grid-gallery'),
		description: __(
			'Friendly modern preset with soft zoom and bottom stacked metadata.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'zoom',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'blur-in',
			captionEnter: 'slide-up',
			socialEnter: 'slide-up',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 350,
			cardEnterDelayMs: 35,
			titleEnterDurationMs: 350,
			captionEnterDurationMs: 350,
			socialEnterDurationMs: 350,
			titleEnterDelayMs: 35,
			captionEnterDelayMs: 35,
			socialEnterDelayMs: 35,
			titleEnterStaggerMs: 65,
			captionEnterStaggerMs: 65,
			socialEnterStaggerMs: 65,
			slotPositions: {
				title: { x: 50, y: 60 },
				caption: { x: 50, y: 72 },
				social: { x: 50, y: 84 },
			},
		},
		hover: {
			hoverColor: 'rgba(15,23,42,.6)',
			hoverOpacity: 60,
		},
	},
	{
		id: 'accessible-no-motion',
		label: __('Accessible no motion', 'modula-best-grid-gallery'),
		description: __(
			'No animation preset: content appears on hover without movement or scaling.',
			'modula-best-grid-gallery'
		),
		builder: {
			cardTreatment: 'none',
			graphicElement: 'none',
			graphicVisibility: 'on-hover',
			dimOverlay: true,
			titleEnter: 'none',
			captionEnter: 'none',
			socialEnter: 'none',
			titleVisibility: 'on-hover',
			captionVisibility: 'on-hover',
			socialVisibility: 'on-hover',
			cardEnterDurationMs: 180,
			cardEnterDelayMs: 0,
			titleEnterDurationMs: 180,
			captionEnterDurationMs: 180,
			socialEnterDurationMs: 180,
			titleEnterDelayMs: 0,
			captionEnterDelayMs: 0,
			socialEnterDelayMs: 0,
			titleEnterStaggerMs: 0,
			captionEnterStaggerMs: 0,
			socialEnterStaggerMs: 0,
			slotPositions: {
				title: { x: 50, y: 64 },
				caption: { x: 50, y: 76 },
				social: { x: 50, y: 88 },
			},
		},
		hover: {
			hoverColor: 'rgba(0,0,0,.42)',
			hoverOpacity: 42,
		},
	},
];

function normalizeBuilderForPresetCompare(builder) {
	const slotPositions =
		builder?.slotPositions && typeof builder.slotPositions === 'object'
			? builder.slotPositions
			: {};
	const readXY = (slotId, axis, fallback) => {
		const value = slotPositions?.[slotId]?.[axis];
		const n = Number(value);
		if (!Number.isFinite(n)) {
			return fallback;
		}
		return Math.min(100, Math.max(0, Math.round(n)));
	};
	return {
		cardTreatment:
			typeof builder?.cardTreatment === 'string'
				? builder.cardTreatment
				: 'zoom',
		graphicElement:
			typeof builder?.graphicElement === 'string'
				? builder.graphicElement
				: 'none',
		graphicVisibility:
			builder?.graphicVisibility === 'always' ? 'always' : 'on-hover',
		dimOverlay:
			builder?.dimOverlay === true ||
			builder?.dimOverlay === 1 ||
			builder?.dimOverlay === '1',
		titleEnter:
			typeof builder?.titleEnter === 'string'
				? builder.titleEnter
				: 'fade',
		captionEnter:
			typeof builder?.captionEnter === 'string'
				? builder.captionEnter
				: 'fade',
		socialEnter:
			typeof builder?.socialEnter === 'string'
				? builder.socialEnter
				: 'fade',
		titleVisibility:
			typeof builder?.titleVisibility === 'string'
				? builder.titleVisibility
				: 'on-hover',
		captionVisibility:
			typeof builder?.captionVisibility === 'string'
				? builder.captionVisibility
				: 'on-hover',
		socialVisibility:
			typeof builder?.socialVisibility === 'string'
				? builder.socialVisibility
				: 'on-hover',
		cardEnterDurationMs: (() => {
			const n = Number(builder?.cardEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		cardEnterDelayMs: (() => {
			const n = Number(builder?.cardEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		titleEnterDurationMs: (() => {
			const n = Number(builder?.titleEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		captionEnterDurationMs: (() => {
			const n = Number(builder?.captionEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		socialEnterDurationMs: (() => {
			const n = Number(builder?.socialEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		titleEnterDelayMs: (() => {
			const n = Number(builder?.titleEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		captionEnterDelayMs: (() => {
			const n = Number(builder?.captionEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		socialEnterDelayMs: (() => {
			const n = Number(builder?.socialEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		titleEnterStaggerMs: (() => {
			const n = Number(builder?.titleEnterStaggerMs);
			return Number.isFinite(n)
				? Math.min(300, Math.max(0, Math.round(n)))
				: 45;
		})(),
		captionEnterStaggerMs: (() => {
			const n = Number(builder?.captionEnterStaggerMs);
			return Number.isFinite(n)
				? Math.min(300, Math.max(0, Math.round(n)))
				: 45;
		})(),
		socialEnterStaggerMs: (() => {
			const n = Number(builder?.socialEnterStaggerMs);
			return Number.isFinite(n)
				? Math.min(300, Math.max(0, Math.round(n)))
				: 45;
		})(),
		slotPositions: {
			title: {
				x: readXY('title', 'x', 50),
				y: readXY('title', 'y', 18),
			},
			caption: {
				x: readXY('caption', 'x', 50),
				y: readXY('caption', 'y', 50),
			},
			social: {
				x: readXY('social', 'x', 50),
				y: readXY('social', 'y', 82),
			},
		},
	};
}

export function getMatchingPresetId(builder) {
	const current = normalizeBuilderForPresetCompare(builder);
	const matched = HOVER_BUILDER_PRESETS.find((preset) => {
		const candidate = normalizeBuilderForPresetCompare(preset.builder);
		return (
			current.cardTreatment === candidate.cardTreatment &&
			current.graphicElement === candidate.graphicElement &&
			current.graphicVisibility === candidate.graphicVisibility &&
			current.dimOverlay === candidate.dimOverlay &&
			current.titleEnter === candidate.titleEnter &&
			current.captionEnter === candidate.captionEnter &&
			current.socialEnter === candidate.socialEnter &&
			current.titleVisibility === candidate.titleVisibility &&
			current.captionVisibility === candidate.captionVisibility &&
			current.socialVisibility === candidate.socialVisibility &&
			current.cardEnterDurationMs === candidate.cardEnterDurationMs &&
			current.cardEnterDelayMs === candidate.cardEnterDelayMs &&
			current.titleEnterDurationMs === candidate.titleEnterDurationMs &&
			current.captionEnterDurationMs ===
				candidate.captionEnterDurationMs &&
			current.socialEnterDurationMs === candidate.socialEnterDurationMs &&
			current.titleEnterDelayMs === candidate.titleEnterDelayMs &&
			current.captionEnterDelayMs === candidate.captionEnterDelayMs &&
			current.socialEnterDelayMs === candidate.socialEnterDelayMs &&
			current.titleEnterStaggerMs === candidate.titleEnterStaggerMs &&
			current.captionEnterStaggerMs === candidate.captionEnterStaggerMs &&
			current.socialEnterStaggerMs === candidate.socialEnterStaggerMs &&
			current.slotPositions.title.x === candidate.slotPositions.title.x &&
			current.slotPositions.title.y === candidate.slotPositions.title.y &&
			current.slotPositions.caption.x ===
				candidate.slotPositions.caption.x &&
			current.slotPositions.caption.y ===
				candidate.slotPositions.caption.y &&
			current.slotPositions.social.x ===
				candidate.slotPositions.social.x &&
			current.slotPositions.social.y === candidate.slotPositions.social.y
		);
	});
	return matched ? matched.id : '';
}

export function applyHoverPreset(baseBuilder, preset) {
	const next = {
		cardTreatment: preset.builder.cardTreatment,
		graphicElement: preset.builder.graphicElement || 'none',
		graphicVisibility: preset.builder.graphicVisibility || 'on-hover',
		dimOverlay: preset.builder.dimOverlay,
		titleEnter: preset.builder.titleEnter,
		captionEnter: preset.builder.captionEnter,
		socialEnter: preset.builder.socialEnter,
		titleVisibility: preset.builder.titleVisibility || 'on-hover',
		captionVisibility: preset.builder.captionVisibility || 'on-hover',
		socialVisibility: preset.builder.socialVisibility || 'on-hover',
		cardEnterDurationMs: preset.builder.cardEnterDurationMs,
		cardEnterDelayMs: preset.builder.cardEnterDelayMs,
		titleEnterDurationMs: preset.builder.titleEnterDurationMs,
		captionEnterDurationMs: preset.builder.captionEnterDurationMs,
		socialEnterDurationMs: preset.builder.socialEnterDurationMs,
		titleEnterDelayMs: preset.builder.titleEnterDelayMs,
		captionEnterDelayMs: preset.builder.captionEnterDelayMs,
		socialEnterDelayMs: preset.builder.socialEnterDelayMs,
		titleEnterStaggerMs: preset.builder.titleEnterStaggerMs,
		captionEnterStaggerMs: preset.builder.captionEnterStaggerMs,
		socialEnterStaggerMs: preset.builder.socialEnterStaggerMs,
		slotPositions: {
			title: { ...preset.builder.slotPositions.title },
			caption: { ...preset.builder.slotPositions.caption },
			social: { ...preset.builder.slotPositions.social },
		},
		sourcePresetId: typeof preset.id === 'string' ? preset.id : '',
	};
	return next;
}
