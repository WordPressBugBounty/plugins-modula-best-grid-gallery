/**
 * Defers mounting image markup until the tile is near the viewport.
 * Shows a low-res placeholder immediately when available.
 *
 * @package
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { PictureStackRevealContext } from '../context/PictureStackRevealContext';
import { isLazyLoadEnabled, LAZY_IMAGE_ROOT_MARGIN } from '../utils/lazyLoad';

/**
 * Strip classes that belong on the full image only (legacy `.pic`, wp attachment ids).
 *
 * @param {string} className
 * @returns {string}
 */
function normalizePlaceholderClassName(className) {
	return String(className || '')
		.split(/\s+/)
		.filter(
			(cls) =>
				cls &&
				cls !== 'pic' &&
				!cls.startsWith('wp-image-') &&
				!cls.startsWith('modula-item-picture__img--')
		)
		.join(' ');
}

/**
 * @param {Object}                            props
 * @param {boolean|number|string|undefined}   props.lazyLoad
 * @param {boolean}                           [props.fillParent]
 * @param {string}                            [props.placeholderSrc]
 * @param {string}                            [props.placeholderClassName]
 * @param {Object}                            [props.placeholderStyle]
 * @param {import('react').ReactNode}         props.children
 * @param {string}                            [props.className]
 */
export default function LazyPictureGate({
	lazyLoad,
	fillParent = false,
	placeholderSrc = '',
	placeholderClassName = '',
	placeholderStyle = undefined,
	children,
	className = '',
}) {
	const enabled = isLazyLoadEnabled(lazyLoad);
	const shellRef = useRef(null);
	const [shouldRender, setShouldRender] = useState(!enabled);
	const [fullImageRevealed, setFullImageRevealed] = useState(false);
	const showPlaceholder = Boolean(placeholderSrc);
	const pictureMounted = !enabled || shouldRender;

	useEffect(() => {
		if (!enabled || shouldRender) {
			return undefined;
		}
		const node = shellRef.current;
		if (!node) {
			return undefined;
		}
		if (!('IntersectionObserver' in window)) {
			setShouldRender(true);
			return undefined;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) {
						continue;
					}
					setShouldRender(true);
					observer.disconnect();
					break;
				}
			},
			{ rootMargin: LAZY_IMAGE_ROOT_MARGIN, threshold: 0.01 }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [enabled, shouldRender]);

	const notifyPictureRevealed = useCallback(() => {
		setFullImageRevealed(true);
	}, []);

	const stackStyle = fillParent
		? {
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
			}
		: undefined;

	const placeholderClasses = [
		'modula-item-picture--placeholder',
		pictureMounted
			? 'modula-item-picture--placeholder--overlay'
			: 'modula-item-picture--placeholder--sizer',
		normalizePlaceholderClassName(placeholderClassName),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<PictureStackRevealContext.Provider value={notifyPictureRevealed}>
			<div
				ref={shellRef}
				className={[
					'modula-item-picture-stack',
					fillParent ? 'modula-item-picture-stack--fill-parent' : '',
					className,
				]
					.filter(Boolean)
					.join(' ')}
				style={stackStyle}
			>
				{showPlaceholder && !fullImageRevealed ? (
					<img
						src={placeholderSrc}
						alt=""
						aria-hidden="true"
						className={placeholderClasses}
						style={
							pictureMounted
								? placeholderStyle
								: {
										width: '100%',
										height: 'auto',
										display: 'block',
									}
						}
						loading="eager"
						decoding="async"
					/>
				) : null}
				{pictureMounted ? children : null}
			</div>
		</PictureStackRevealContext.Provider>
	);
}
