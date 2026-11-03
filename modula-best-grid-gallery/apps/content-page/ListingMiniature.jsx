/**
 * A gallery's layout drawn small, for the cover and the row preview of a
 * gallery whose items have no thumbnail. Each tile sits at its place in the
 * layout: a content block in its background image under its colour, any other
 * item in a neutral tone.
 *
 * @param {Object}                                               props
 * @param {import('./listingMiniatureDrawing').ListingMiniature} props.drawing     From readListingMiniature().
 * @param {string}                                               [props.className]
 */
export function ListingMiniature({ drawing, className = '' }) {
	return (
		<svg
			className={['modula-content-page__miniature', className]
				.filter(Boolean)
				.join(' ')}
			viewBox={`0 0 ${drawing.columns} ${drawing.rows}`}
			preserveAspectRatio="xMidYMid meet"
			// Cell edges stay sharp, so pixel art keeps its pixels.
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
		>
			{drawing.tiles.map((tile, index) => {
				const box = {
					x: tile.x,
					y: tile.y,
					width: tile.w,
					height: tile.h,
				};
				return (
					<g key={index}>
						{tile.image ? (
							<image
								{...box}
								href={tile.image}
								preserveAspectRatio="xMidYMid slice"
							/>
						) : null}
						{tile.fill ? <rect {...box} fill={tile.fill} /> : null}
						{!tile.fill && !tile.image ? (
							<rect {...box} className="is-unknown" />
						) : null}
					</g>
				);
			})}
		</svg>
	);
}
