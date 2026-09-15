/**
 * Editor document status — compact unlabeled select in the takeover topbar.
 */
import { __ } from '@wordpress/i18n';
import { Select } from 'shared-ui';
import { buildEditorDocumentStatusSelectOptions } from '../../utils/editorPostDocument';

/**
 * @param {Object} props
 * @param {string} props.status
 * @param {string} [props.statusLabel]
 * @param {Array<{ value?: string, label?: string }>} [props.statusChoices]
 * @param {(status: string, label: string) => void} props.onStatusChange
 * @param {boolean} [props.busy]
 */
export default function TakeoverTopBarDocumentStatus({
	status,
	statusLabel = '',
	statusChoices = [],
	onStatusChange,
	busy = false,
}) {
	const options = buildEditorDocumentStatusSelectOptions({
		status,
		statusLabel,
		statusChoices,
	});
	if (options.length === 0) {
		return null;
	}

	const value = options.some((row) => row.value === status)
		? status
		: options[0].value;

	return (
		<div
			className="modula-gallery-takeover__topbar-document-status"
			data-testid="editor-document-status"
		>
			<Select
				id="modula-editor-document-status"
				options={options}
				value={value}
				disabled={busy}
				aria-label={__('Status', 'modula-best-grid-gallery')}
				onChange={(next) => {
					const slug = String(next || '').trim();
					const match = options.find((row) => row.value === slug);
					if (!match || match.disabled) {
						return;
					}
					onStatusChange(match.value, match.label);
				}}
			/>
		</div>
	);
}
