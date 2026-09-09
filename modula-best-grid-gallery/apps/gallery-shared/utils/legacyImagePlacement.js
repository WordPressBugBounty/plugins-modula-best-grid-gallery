/**
 * Legacy image placement (same logic as jquery-modula.js placeImage).
 * Computes CSS so the image fills the tile on one axis and overflows on the other,
 * with alignment via valign/halign. Used so the React gallery matches legacy visual.
 *
 * @param {number} tileWidth  Tile width (px)
 * @param {number} tileHeight Tile height (px)
 * @param {number} imgWidth   Image intrinsic width (px)
 * @param {number} imgHeight  Image intrinsic height (px)
 * @param {string} valign     'top' | 'middle' | 'bottom'
 * @param {string} halign     'left' | 'center' | 'right'
 * @return {Object} React style object for the img (position absolute + top/left/width/height etc.)
 */
export function computeLegacyImageStyle(
	tileWidth,
	tileHeight,
	imgWidth,
	imgHeight,
	valign = 'middle',
	halign = 'center'
) {
	const iRatio = imgWidth / imgHeight;
	const newHeight = (tileWidth * imgHeight) / imgWidth;

	const style = {
		position: 'absolute',
		top: 'auto',
		bottom: 'auto',
		left: 'auto',
		right: 'auto',
		width: 'auto',
		height: 'auto',
		margin: 0,
		maxWidth: '999em',
	};

	if (newHeight > tileHeight) {
		style.width = tileWidth;
		style.left = 0;
		switch (valign) {
			case 'top':
				style.top = 0;
				break;
			case 'middle':
				style.top = 0 - (tileWidth * (1 / iRatio) - tileHeight) / 2;
				break;
			case 'bottom':
				style.bottom = 0;
				break;
			default:
				style.top = 0 - (tileWidth * (1 / iRatio) - tileHeight) / 2;
		}
	} else {
		style.height = tileHeight;
		style.top = 0;
		switch (halign) {
			case 'left':
				style.left = 0;
				break;
			case 'center':
				style.left = 0 - (tileHeight * iRatio - tileWidth) / 2;
				break;
			case 'right':
				style.right = 0;
				break;
			default:
				style.left = 0 - (tileHeight * iRatio - tileWidth) / 2;
		}
	}

	// Convert numeric values to px for React
	const out = { ...style };
	['top', 'bottom', 'left', 'right', 'width', 'height'].forEach((key) => {
		if (typeof out[key] === 'number') {
			out[key] = `${out[key]}px`;
		}
	});
	return out;
}
