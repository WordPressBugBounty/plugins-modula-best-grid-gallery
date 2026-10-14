/**
 * Start/End segment for “new images” insert position (reorder panel), with gallery copy.
 */
import { __ } from '@wordpress/i18n';
import { InsertPositionSegment } from 'editor-shell';

/** TanStack form field path for v2 grouped settings. */
export const PREVIEW_UPLOAD_POSITION_FIELD = 'general.uploadPosition';

/**
 * @param {{ value: string, onChange: (v: string) => void }} props
 */
export default function PreviewUploadPositionSegment({ value, onChange }) {
	return (
		<InsertPositionSegment
			value={value}
			onChange={onChange}
			label={__('New images', 'modula-best-grid-gallery')}
			groupLabel={__(
				'Where to add new images in the gallery list',
				'modula-best-grid-gallery'
			)}
		/>
	);
}
