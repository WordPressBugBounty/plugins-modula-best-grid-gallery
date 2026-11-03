/**
 * Publication status pill next to the title, opening the status menu.
 */
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { Menu, MenuItem } from 'admin-ui';
import {
	buildEditorDocumentStatusSelectOptions,
	resolveEditorDocumentStatus,
} from './editorPostDocument';
import { chevronDownIcon } from './topBarIcons';

/**
 * @param {{ status: string }} props
 */
function StatusDot({ status }) {
	return (
		<span
			className="modula-takeover__topbar-document-status-dot"
			data-status={status}
			aria-hidden="true"
		/>
	);
}

/**
 * @param {Object}                                    props
 * @param {string}                                    props.status
 * @param {string}                                    [props.statusLabel]
 * @param {Array<{ value?: string, label?: string }>} [props.statusChoices]
 * @param {(status: string, label: string) => void}   props.onStatusChange
 * @param {boolean}                                   [props.busy]
 */
export default function TopBarDocumentStatus({
	status,
	statusLabel = '',
	statusChoices = [],
	onStatusChange,
	busy = false,
}) {
	const [open, setOpen] = useState(false);
	const options = buildEditorDocumentStatusSelectOptions({
		status,
		statusLabel,
		statusChoices,
	});
	if (options.length === 0) {
		return null;
	}

	const current = resolveEditorDocumentStatus(status);
	const value = options.some((row) => row.value === current)
		? current
		: options[0].value;
	const currentLabel = options.find((row) => row.value === value)?.label;

	return (
		<div
			className="modula-takeover__topbar-document-status"
			data-testid="editor-document-status"
			data-status={value}
		>
			<Menu
				open={open}
				onOpenChange={setOpen}
				label={__('Status', 'modula-best-grid-gallery')}
				trigger={(triggerProps) => (
					<button
						type="button"
						className="modula-takeover__topbar-document-status-trigger"
						{...triggerProps}
						disabled={busy}
						aria-label={sprintf(
							/* translators: %s: current publication status (Published, Draft) */
							__(
								'Status: %s. Change status',
								'modula-best-grid-gallery'
							),
							currentLabel
						)}
					>
						<StatusDot status={value} />
						{currentLabel}
						<Icon icon={chevronDownIcon} size={12} />
					</button>
				)}
			>
				{options.map((row) => (
					<MenuItem
						key={row.value}
						checked={row.value === value}
						disabled={row.disabled}
						icon={<StatusDot status={row.value} />}
						onSelect={() => {
							if (row.value !== value) {
								onStatusChange(row.value, row.label);
							}
						}}
					>
						{row.label}
					</MenuItem>
				))}
			</Menu>
		</div>
	);
}
