/**
 * The Modula logo as a loader: the six-blade mark turns as an aperture
 * (each blade slides out along its own axis and back in turn while the mark
 * turns 60° per loop), and the "Modula" wordmark beside it fills in the text
 * colour from left to right on a loop. Both are decorative (`aria-hidden`);
 * the caller puts the loader in a `role="status"` region, and `label` is
 * visually hidden text that region announces. With reduced motion the mark
 * stands still and the wordmark shows filled.
 *
 * The pre-React boot shell draws the same logo in PHP
 * (`Modula\V2\Admin\Takeover_Boot_Shell`, styled by
 * `assets/css/admin/takeover-boot.css`) before any JS runs, so it cannot
 * render this component; `BrandLoader.test.js` keeps the two in step.
 */
import { useLayoutEffect, useRef } from '@wordpress/element';

/**
 * One blade in the `-50 -50 100 100` view box, tip up; traced from
 * `assets/images/logo-dark.png`.
 */
export const BRAND_MARK_BLADE_POINTS = '-14,-30 1.5,-46 19,-12';

/**
 * The blades sit every 60°.
 */
export const BRAND_MARK_BLADE_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * Runs the loader's animations on the page's clock (document timeline time 0)
 * instead of from when this node was inserted. A load swaps the loader node
 * several times (boot shell, settings, shell chunk); on one clock each new
 * node picks up the motion where the last one was, rather than restarting.
 * The boot shell's inline script does the same for its mark.
 *
 * @param {Element} node Loader root.
 */
export function alignBrandLoaderToPageClock(node) {
	if (typeof node?.getAnimations !== 'function') {
		return;
	}
	node.getAnimations({ subtree: true }).forEach((animation) => {
		animation.startTime = 0;
	});
}

/**
 * @param {Object} props
 * @param {string} [props.label] What loads ("Loading editor…"), for screen readers only.
 * @param {number} [props.size]  Mark size in px; the wordmark is half as tall.
 */
export function BrandLoader({ label, size = 40 }) {
	const rootRef = useRef(null);

	// Before paint, so the first frame is already in phase.
	useLayoutEffect(() => {
		alignBrandLoaderToPageClock(rootRef.current);
	}, []);

	return (
		<span className="modula-admin-brand-loader" ref={rootRef}>
			<svg
				className="modula-admin-brand-loader__mark"
				width={size}
				height={size}
				viewBox="-50 -50 100 100"
				aria-hidden="true"
				focusable="false"
			>
				<g className="modula-admin-brand-loader__blades">
					{BRAND_MARK_BLADE_ANGLES.map((angle) => (
						<g key={angle} transform={`rotate(${angle})`}>
							<polygon
								className="modula-admin-brand-loader__blade"
								points={BRAND_MARK_BLADE_POINTS}
							/>
						</g>
					))}
				</g>
			</svg>
			<span
				className="modula-admin-brand-loader__wordmark"
				style={{ height: size / 2 }}
				aria-hidden="true"
			/>
			{label ? (
				<span className="modula-admin-brand-loader__label modula-admin-sr-only">
					{label}
				</span>
			) : null}
		</span>
	);
}
