/**
 * Selection mode's count in the canvas toolbar: "<N> … selected · Clear".
 * The editor passes the count line in its own words.
 */
import { __ } from '@wordpress/i18n';
import { focusCanvasToolbarFirstAction } from './CanvasToolbar';

/**
 * @param {Object}     props
 * @param {string}     props.label   Count line ("3 images selected").
 * @param {() => void} props.onClear Empties the selection.
 */
export default function CanvasToolbarSelectionCount({ label, onClear }) {
	return (
		<span className="modula-takeover__canvas-toolbar-count">
			<span className="modula-takeover__canvas-toolbar-count-value">
				{label}
			</span>
			<span aria-hidden="true">·</span>
			<button
				type="button"
				className="modula-takeover__canvas-toolbar-count-clear"
				onClick={(event) => {
					// Clear goes with the selection: keep focus in the toolbar.
					focusCanvasToolbarFirstAction(event.currentTarget);
					onClear();
				}}
			>
				{__('Clear', 'modula-best-grid-gallery')}
			</button>
		</span>
	);
}
