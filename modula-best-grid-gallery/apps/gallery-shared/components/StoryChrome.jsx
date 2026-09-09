/**
 * Story layout chrome: segmented progress (Instagram-style) + tap zones for prev/next.
 * Sits above slides; center band uses pointer-events: none so lightbox links keep working.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * @param {Object} props
 * @param {number} props.total
 * @param {number} props.activeIndex
 * @param {() => void} props.onPrev
 * @param {() => void} props.onNext
 * @param {(index: number) => void} [props.onGoTo]
 */
export default function StoryChrome({
	total,
	activeIndex,
	onPrev,
	onNext,
	onGoTo,
}) {
	if (!total) {
		return null;
	}

	return (
		<div className="modula-story-chrome">
			<div
				className="modula-story-progress"
				role="tablist"
				aria-label={__('Stories', 'modula-best-grid-gallery')}
			>
				{Array.from({ length: total }, (_, i) => (
					<button
						key={i}
						type="button"
						className="modula-story-progress__seg"
						role="tab"
						aria-selected={i === activeIndex}
						aria-label={sprintf(
							/* translators: 1: story number, 2: total stories */
							__(
								'Story %1$d of %2$d',
								'modula-best-grid-gallery'
							),
							i + 1,
							total
						)}
						onClick={(e) => {
							e.stopPropagation();
							onGoTo?.(i);
						}}
					>
						<span
							className={
								i < activeIndex
									? 'modula-story-progress__fill is-done'
									: i === activeIndex
										? 'modula-story-progress__fill is-active'
										: 'modula-story-progress__fill'
							}
							aria-hidden="true"
						/>
					</button>
				))}
			</div>
			<div className="modula-story-taps">
				<button
					type="button"
					className="modula-story-tap modula-story-tap--prev"
					onClick={(e) => {
						e.stopPropagation();
						onPrev();
					}}
					aria-label="Previous slide"
				/>
				<span
					className="modula-story-tap modula-story-tap--pass"
					aria-hidden="true"
				/>
				<button
					type="button"
					className="modula-story-tap modula-story-tap--next"
					onClick={(e) => {
						e.stopPropagation();
						onNext();
					}}
					aria-label="Next slide"
				/>
			</div>
		</div>
	);
}
