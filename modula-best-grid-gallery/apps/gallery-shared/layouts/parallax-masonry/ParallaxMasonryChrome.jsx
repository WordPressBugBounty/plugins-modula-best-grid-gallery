/**
 * Parallax masonry — edge fades, overlay, center title
 *
 * @package
 */

import { memo } from '@wordpress/element';

function ParallaxMasonryChrome({
	parallaxOverlayEnabled,
	parallaxOverlayBackground,
	parallaxCaption,
}) {
	if (!parallaxOverlayEnabled && !parallaxCaption) {
		return null;
	}
	return (
		<>
			{parallaxOverlayEnabled ? (
				<>
					<div
						className="modula-parallax-masonry-fade modula-parallax-masonry-fade--top"
						aria-hidden="true"
					/>
					<div
						className="modula-parallax-masonry-fade modula-parallax-masonry-fade--bottom"
						aria-hidden="true"
					/>
					<div
						className="modula-parallax-masonry-overlay"
						style={{ background: parallaxOverlayBackground }}
						aria-hidden="true"
					/>
				</>
			) : null}
			{parallaxCaption ? (
				<div className="modula-parallax-masonry-title">
					{parallaxCaption}
				</div>
			) : null}
		</>
	);
}

export default memo(ParallaxMasonryChrome);
