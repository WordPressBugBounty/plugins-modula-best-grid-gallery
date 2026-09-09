import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Popover } from '@wordpress/components';
import { Icon, check, chevronDown, copy } from '@wordpress/icons';
import { copyText } from './copyText';
import { listingRowToFields } from './listingRowToFields';

/** Below this td width, show icon-only shortcode controls. */
const SHORTCODE_COMPACT_WIDTH_PX = 144;

/**
 * @param {Object} props
 * @param {string} props.code
 * @param {string} props.id
 * @param {string|null} props.copiedId
 * @param {(code: string, id: string) => void} props.onCopy
 * @param {string} [props.ariaLabel]
 * @param {string} [props.className]
 */
function CopyShortcodeButton({
	code,
	id,
	copiedId,
	onCopy,
	ariaLabel,
	className = '',
}) {
	const isCopied = copiedId === id;
	return (
		<button
			type="button"
			className={[
				'modula-gallery-listing__shortcode-icon-btn',
				isCopied ? 'is-copied' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-label={
				isCopied
					? __('Copied', 'modula-best-grid-gallery')
					: ariaLabel ||
						__('Copy shortcode', 'modula-best-grid-gallery')
			}
			onClick={() => onCopy(code, id)}
		>
			<Icon icon={isCopied ? check : copy} size={14} aria-hidden="true" />
		</button>
	);
}

/**
 * Shortcode cell: primary code + copy icon; extras in a Popover when present.
 *
 * @param {Object} props
 * @param {import('./listingRowToFields').ListingRow} props.item
 */
export function ShortcodeCell({ item }) {
	const { shortcode, shortcodeRows, hasExtraShortcodes } =
		listingRowToFields(item);
	const [open, setOpen] = useState(false);
	const [copiedId, setCopiedId] = useState(/** @type {string|null} */ (null));
	const [isCompact, setIsCompact] = useState(false);
	const copiedTimerRef = useRef(0);
	const wrapRef = useRef(null);

	useEffect(() => {
		return () => {
			window.clearTimeout(copiedTimerRef.current);
		};
	}, []);

	useEffect(() => {
		const tableCell = wrapRef.current?.closest('td');
		if (!tableCell || typeof ResizeObserver === 'undefined') {
			return undefined;
		}

		const syncCompact = (width) => {
			setIsCompact(width < SHORTCODE_COMPACT_WIDTH_PX);
		};

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				return;
			}
			syncCompact(entry.contentRect.width);
		});

		observer.observe(tableCell);
		syncCompact(tableCell.getBoundingClientRect().width);

		return () => observer.disconnect();
	}, []);

	if (!shortcode) {
		return '—';
	}

	const copyCode = async (code, id) => {
		const text = String(code || '');
		if (!text) {
			return;
		}
		try {
			await copyText(text);
			window.clearTimeout(copiedTimerRef.current);
			setCopiedId(id);
			copiedTimerRef.current = window.setTimeout(() => {
				setCopiedId(null);
			}, 1500);
		} catch (e) {
			// Ignore copy failures.
		}
	};

	const extraRows = hasExtraShortcodes ? shortcodeRows.slice(1) : [];

	const stopRowSelect = (event) => {
		event.stopPropagation();
	};

	return (
		<div
			ref={wrapRef}
			className={[
				'modula-gallery-listing__shortcode-cell',
				isCompact ? 'is-compact' : '',
			]
				.filter(Boolean)
				.join(' ')}
			onClick={stopRowSelect}
			onMouseDown={stopRowSelect}
		>
			<div className="modula-gallery-listing__shortcode">
				<code className="modula-gallery-listing__shortcode-text">
					{shortcode}
				</code>
				<CopyShortcodeButton
					code={shortcode}
					id="primary"
					copiedId={copiedId}
					onCopy={copyCode}
				/>
				{hasExtraShortcodes ? (
					<>
						<span
							className="modula-gallery-listing__shortcode-sep"
							aria-hidden="true"
						/>
						<button
							type="button"
							className="modula-gallery-listing__shortcode-icon-btn modula-gallery-listing__shortcode-icon-btn--chevron"
							aria-expanded={open}
							aria-haspopup="menu"
							aria-label={__(
								'More shortcodes',
								'modula-best-grid-gallery'
							)}
							onClick={() => setOpen((value) => !value)}
						>
							<Icon
								icon={chevronDown}
								size={16}
								className={
									open
										? 'modula-gallery-listing__shortcode-chevron is-open'
										: 'modula-gallery-listing__shortcode-chevron'
								}
								aria-hidden="true"
							/>
						</button>
					</>
				) : null}
			</div>
			{open && hasExtraShortcodes ? (
				<Popover
					anchor={wrapRef.current}
					placement="bottom-end"
					offset={6}
					focusOnMount={false}
					onFocusOutside={() => setOpen(false)}
					onClose={() => setOpen(false)}
					className="modula-gallery-listing__shortcode-popover"
				>
					<div
						className="modula-gallery-listing__shortcode-menu"
						role="menu"
						aria-label={__(
							'Additional shortcodes',
							'modula-best-grid-gallery'
						)}
					>
						{extraRows.map((row) => (
							<div
								key={row.id}
								className="modula-gallery-listing__shortcode-menu-row"
								role="none"
							>
								{row.label ? (
									<div className="modula-gallery-listing__shortcode-menu-label">
										{row.label}
									</div>
								) : null}
								<div className="modula-gallery-listing__shortcode-menu-field">
									<code className="modula-gallery-listing__shortcode-menu-code">
										{row.code}
									</code>
									<CopyShortcodeButton
										code={row.code}
										id={row.id}
										copiedId={copiedId}
										onCopy={copyCode}
										ariaLabel={sprintf(
											/* translators: %s: shortcode type label */
											__(
												'Copy %s shortcode',
												'modula-best-grid-gallery'
											),
											row.label ||
												__(
													'shortcode',
													'modula-best-grid-gallery'
												)
										)}
									/>
								</div>
							</div>
						))}
					</div>
				</Popover>
			) : null}
		</div>
	);
}
