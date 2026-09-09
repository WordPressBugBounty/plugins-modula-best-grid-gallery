/**
 * Horizontal rule between virtual pagination pages (settings editor preview only).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

export default function EditorPreviewPageBreakDivider({ style = undefined }) {
	return (
		<div
			className="modula-editor-page-break"
			role="separator"
			aria-label={__('Next page boundary', 'modula-best-grid-gallery')}
			style={style}
		>
			<span
				className="modula-editor-page-break__line"
				aria-hidden="true"
			/>
			<span className="modula-editor-page-break__text">
				{__('-- next page --', 'modula-best-grid-gallery')}
			</span>
			<span
				className="modula-editor-page-break__line"
				aria-hidden="true"
			/>
		</div>
	);
}
