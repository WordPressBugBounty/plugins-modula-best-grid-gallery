/**
 * Embed popover: one copyable row per way of placing the document
 * (shortcode, PHP, link shortcode, …). The editor supplies the rows.
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { CopyField, Popover, usePopoverClose } from 'admin-ui';
import { closeIcon, chevronDownIcon, embedIcon } from './topBarIcons';

/**
 * One embed row, already translated by the owning editor.
 *
 * @typedef {Object} EmbedRow
 * @property {string} id        Stable key.
 * @property {string} label     Visible row label (e.g. Shortcode).
 * @property {string} code      Text the Copy button writes to the clipboard.
 * @property {string} copyLabel Accessible name of the Copy button.
 */

/**
 * @param {Object}     props
 * @param {string}     props.heading
 * @param {EmbedRow[]} props.rows
 */
function EmbedPanel({ heading, rows }) {
	const closePopover = usePopoverClose();

	return (
		<>
			<div className="modula-takeover__embed-header">
				<h2 className="modula-takeover__embed-heading">{heading}</h2>
				<button
					type="button"
					className="modula-takeover__embed-close"
					aria-label={__('Close', 'modula-best-grid-gallery')}
					data-autofocus="true"
					onClick={closePopover}
				>
					<Icon icon={closeIcon} size={15} />
				</button>
			</div>
			{rows.map((row) => (
				<div key={row.id} className="modula-takeover__embed-row">
					<span className="modula-takeover__embed-label">
						{row.label}
					</span>
					<CopyField value={row.code} copyLabel={row.copyLabel} />
				</div>
			))}
		</>
	);
}

/**
 * @param {Object}     props
 * @param {string}     props.heading Popover heading (e.g. Embed this gallery).
 * @param {EmbedRow[]} props.rows    Nothing renders without rows.
 */
export default function TopBarEmbed({ heading, rows }) {
	const [open, setOpen] = useState(false);

	if (rows.length === 0) {
		return null;
	}

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
			label={heading}
			align="end"
			className="modula-takeover__embed-popover"
			trigger={(triggerProps) => (
				<button
					type="button"
					className="modula-takeover__topbar-embed-trigger"
					{...triggerProps}
				>
					<Icon icon={embedIcon} size={16} />
					{__('Embed', 'modula-best-grid-gallery')}
					<Icon icon={chevronDownIcon} size={12} />
				</button>
			)}
		>
			<EmbedPanel heading={heading} rows={rows} />
		</Popover>
	);
}
