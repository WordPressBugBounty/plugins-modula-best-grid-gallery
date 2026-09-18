/**
 * Editor document status — themed status menu in the takeover topbar.
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import { Icon, check, chevronDown } from '@wordpress/icons';
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
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);
	const triggerRef = useRef(null);
	const menuRef = useRef(null);

	useEffect(() => {
		if (!open || busy) {
			setOpen(false);
			return undefined;
		}
		const menu = menuRef.current;
		(
			menu?.querySelector('[aria-checked="true"]:not(:disabled)') ||
			menu?.querySelector('button:not(:disabled)')
		)?.focus();
		const onOutside = (event) => {
			if (!wrapRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};
		const onEscape = (event) => {
			if (event.key === 'Escape') {
				setOpen(false);
				triggerRef.current?.focus();
			}
		};
		document.addEventListener('mousedown', onOutside);
		document.addEventListener('keydown', onEscape);
		return () => {
			document.removeEventListener('mousedown', onOutside);
			document.removeEventListener('keydown', onEscape);
		};
	}, [open, busy]);

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
			ref={wrapRef}
			className="modula-gallery-takeover__topbar-document-status"
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setOpen(false);
				}
			}}
			data-testid="editor-document-status"
			data-status={value}
		>
			<span
				className="modula-gallery-takeover__topbar-document-status-dot"
				aria-hidden="true"
			/>
			<button
				ref={triggerRef}
				type="button"
				className="modula-gallery-takeover__topbar-document-status-trigger"
				disabled={busy}
				aria-label={__('Status', 'modula-best-grid-gallery')}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? 'modula-document-status-menu' : undefined}
				onClick={() => setOpen(!open)}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						setOpen(true);
					}
				}}
			>
				{options.find((row) => row.value === value)?.label}
				<Icon icon={chevronDown} size={16} />
			</button>
			{open && !busy ? (
				<div
					ref={menuRef}
					id="modula-document-status-menu"
					role="menu"
					tabIndex={-1}
					aria-label={__('Status', 'modula-best-grid-gallery')}
					className="modula-gallery-takeover__topbar-document-status-menu"
					onKeyDown={(event) => {
						const items = Array.from(
							event.currentTarget.querySelectorAll(
								'button:not(:disabled)'
							)
						);
						const index = items.indexOf(
							event.currentTarget.ownerDocument.activeElement
						);
						let next;
						if (event.key === 'ArrowDown') {
							next = (index + 1) % items.length;
						}
						if (event.key === 'ArrowUp') {
							next = (index - 1 + items.length) % items.length;
						}
						if (event.key === 'Home') {
							next = 0;
						}
						if (event.key === 'End') {
							next = items.length - 1;
						}
						if (next !== undefined) {
							event.preventDefault();
							items[next]?.focus();
						}
					}}
				>
					{options.map((row) => (
						<button
							key={row.value}
							type="button"
							role="menuitemradio"
							aria-checked={row.value === value}
							disabled={row.disabled}
							tabIndex={-1}
							onClick={() => {
								setOpen(false);
								triggerRef.current?.focus();
								if (row.value !== value) {
									onStatusChange(row.value, row.label);
								}
							}}
						>
							<span>{row.label}</span>
							{row.value === value ? (
								<Icon icon={check} size={16} />
							) : null}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
