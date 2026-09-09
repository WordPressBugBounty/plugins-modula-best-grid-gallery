import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';

/**
 * @typedef {'card' | 'title' | 'caption' | 'social'} HoverBuilderTarget
 */

const HoverEffectBuilderContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 * @param {string}                    props.activeCategory Current takeover settings category id (top-level hash).
 * @param {boolean}                   props.hoverEffectBuilderActive True when Hover drill is open or legacy `hover` category.
 */
/**
 * @typedef {'build' | 'preview'} HoverBuilderViewMode
 */

export function HoverEffectBuilderProvider({
	children,
	activeCategory,
	hoverEffectBuilderActive = false,
}) {
	const [selectedTarget, setSelectedTarget] =
		/** @type {import('react').Dispatch<import('react').SetStateAction<HoverBuilderTarget>>} */ (
			useState('card')
		);
	const [builderViewMode, setBuilderViewMode] =
		/** @type {import('react').Dispatch<import('react').SetStateAction<HoverBuilderViewMode>>} */ (
			useState(/** @type {HoverBuilderViewMode} */ ('preview'))
		);
	const [linkedOverlaySlots, setLinkedOverlaySlots] = useState(
		/** @type {('title'|'caption'|'social')[]} */ ([])
	);

	useEffect(() => {
		if (hoverEffectBuilderActive || activeCategory === 'hover') {
			setSelectedTarget('card');
			// Presets is the default auxiliary tab — start in Preview so hover effects are visible.
			setBuilderViewMode('preview');
			setLinkedOverlaySlots([]);
		}
	}, [activeCategory, hoverEffectBuilderActive]);

	const value = useMemo(
		() => ({
			selectedTarget,
			setSelectedTarget,
			builderViewMode,
			setBuilderViewMode,
			linkedOverlaySlots,
			setLinkedOverlaySlots,
		}),
		[selectedTarget, builderViewMode, linkedOverlaySlots]
	);

	return (
		<HoverEffectBuilderContext.Provider value={value}>
			{children}
		</HoverEffectBuilderContext.Provider>
	);
}

export function useHoverEffectBuilder() {
	const ctx = useContext(HoverEffectBuilderContext);
	if (!ctx) {
		throw new Error(
			'useHoverEffectBuilder must be used within HoverEffectBuilderProvider'
		);
	}
	return ctx;
}

/**
 * Safe hook when provider may be absent (e.g. metabox).
 *
 * @return {{ selectedTarget: HoverBuilderTarget, setSelectedTarget: (t: HoverBuilderTarget) => void, builderViewMode?: 'build'|'preview', setBuilderViewMode?: (m: 'build'|'preview') => void } | null}
 */
export function useHoverEffectBuilderOptional() {
	return useContext(HoverEffectBuilderContext);
}
