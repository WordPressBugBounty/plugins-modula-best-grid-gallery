/**
 * Start/End segment for “new images” insert position (preview chrome + reorder panel).
 */
import { __ } from '@wordpress/i18n';

/** TanStack form field path for v2 grouped settings. */
export const PREVIEW_UPLOAD_POSITION_FIELD = 'general.uploadPosition';

/**
 * @param {{ value: string, onChange: (v: string) => void }} props
 */
export default function PreviewUploadPositionSegment({ value, onChange }) {
	const v = value || 'end';

	const setPos = (next) => {
		onChange(next);
	};

	return (
		<div
			className="modula-gallery-takeover__preview-insert"
			role="group"
			aria-label={__(
				'Where to add new images in the gallery list',
				'modula-best-grid-gallery'
			)}
		>
			<span className="modula-gallery-takeover__preview-insert-label">
				{__('New images', 'modula-best-grid-gallery')}
			</span>
			<div className="modula-gallery-takeover__preview-segment">
				<button
					type="button"
					className={
						v === 'start'
							? 'modula-gallery-takeover__preview-segment-btn is-active'
							: 'modula-gallery-takeover__preview-segment-btn'
					}
					aria-pressed={v === 'start'}
					onClick={() => setPos('start')}
				>
					{__('Start', 'modula-best-grid-gallery')}
				</button>
				<button
					type="button"
					className={
						v === 'end'
							? 'modula-gallery-takeover__preview-segment-btn is-active'
							: 'modula-gallery-takeover__preview-segment-btn'
					}
					aria-pressed={v === 'end'}
					onClick={() => setPos('end')}
				>
					{__('End', 'modula-best-grid-gallery')}
				</button>
			</div>
		</div>
	);
}
