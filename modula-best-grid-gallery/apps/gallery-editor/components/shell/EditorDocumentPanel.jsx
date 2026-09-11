/**
 * Editor document status — publish status control for the gallery editor document panel.
 */
import { __ } from '@wordpress/i18n';
import { FieldStack, Select } from 'shared-ui';
import SettingsPanelSection from '../sidebar/settings-panel/SettingsPanelSection';
import { filterEditorDocumentStatusChoices } from '../../utils/editorPostDocument';

/**
 * @param {Object} props
 * @param {string} props.status
 * @param {string} [props.statusLabel]
 * @param {Array<{ value?: string, label?: string }>} [props.statusChoices]
 * @param {(status: string, label: string) => void} props.onStatusChange
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.busy]
 */
export default function EditorDocumentPanel({
	status,
	statusLabel = '',
	statusChoices = [],
	onStatusChange,
	disabled = false,
	busy = false,
}) {
	const allowed = filterEditorDocumentStatusChoices(statusChoices);
	if (allowed.length === 0) {
		return null;
	}

	const options = [...allowed];
	if (
		typeof status === 'string' &&
		status !== '' &&
		!options.some((row) => row.value === status)
	) {
		options.unshift({
			value: status,
			label:
				typeof statusLabel === 'string' && statusLabel !== ''
					? statusLabel
					: status,
			disabled: true,
		});
	}

	const value = options.some((row) => row.value === status)
		? status
		: options[0].value;

	return (
		<div
			className="modula-editor-document-panel"
			data-testid="editor-document-panel"
		>
			<SettingsPanelSection
				label={__('Document', 'modula-best-grid-gallery')}
			>
				<div className="modula-editor-document-panel__status">
					<FieldStack
						label={__('Status', 'modula-best-grid-gallery')}
						htmlFor="modula-editor-document-status"
					>
						<Select
							id="modula-editor-document-status"
							options={options}
							value={value}
							disabled={disabled || busy}
							onChange={(next) => {
								const slug = String(next || '').trim();
								const match = options.find(
									(row) => row.value === slug
								);
								if (!match) {
									return;
								}
								onStatusChange(match.value, match.label);
							}}
						/>
					</FieldStack>
				</div>
			</SettingsPanelSection>
		</div>
	);
}
