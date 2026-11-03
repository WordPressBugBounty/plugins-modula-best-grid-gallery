import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, check, chevronDown, copy } from '@wordpress/icons';
import { Popover } from 'admin-ui';
import { copyText } from 'admin-ui/copy-field/copyText';
import { listingRowToFields } from './listingRowToFields';

/** Below this td width, show icon-only shortcode controls. */
const SHORTCODE_COMPACT_WIDTH_PX = 144;

/**
 * @param {Object}                             props
 * @param {string}                             props.code
 * @param {string}                             props.id
 * @param {string|null}                        props.copiedId
 * @param {(code: string, id: string) => void} props.onCopy
 * @param {string}                             [props.ariaLabel]
 * @param {string}                             [props.className]
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
				'modula-content-page__shortcode-icon-btn',
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
 * @param {Object}                                    props
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
				'modula-content-page__shortcode-cell',
				isCompact ? 'is-compact' : '',
			]
				.filter(Boolean)
				.join(' ')}
			onClick={stopRowSelect}
			onMouseDown={stopRowSelect}
		>
			<div className="modula-content-page__shortcode">
				<code className="modula-content-page__shortcode-text">
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
							className="modula-content-page__shortcode-sep"
							aria-hidden="true"
						/>
						<Popover
							open={open}
							onOpenChange={setOpen}
							label={__(
								'Additional shortcodes',
								'modula-best-grid-gallery'
							)}
							align="end"
							className="modula-content-page__shortcode-popover"
							trigger={(triggerProps) => (
								<button
									type="button"
									className="modula-content-page__shortcode-icon-btn modula-content-page__shortcode-icon-btn--chevron"
									aria-label={__(
										'More shortcodes',
										'modula-best-grid-gallery'
									)}
									{...triggerProps}
								>
									<Icon
										icon={chevronDown}
										size={16}
										className={
											open
												? 'modula-content-page__shortcode-chevron is-open'
												: 'modula-content-page__shortcode-chevron'
										}
										aria-hidden="true"
									/>
								</button>
							)}
						>
							<ExtraShortcodeRows
								rows={extraRows}
								copiedId={copiedId}
								onCopy={copyCode}
							/>
						</Popover>
					</>
				) : null}
			</div>
		</div>
	);
}

/**
 * The extra shortcodes (album, standalone…) in the chevron's popover, each
 * with its label and a copy button.
 *
 * @param {Object}                             props
 * @param {Array<Object>}                      props.rows
 * @param {string|null}                        props.copiedId
 * @param {(code: string, id: string) => void} props.onCopy
 */
function ExtraShortcodeRows({ rows, copiedId, onCopy }) {
	return (
		<div className="modula-content-page__shortcode-menu">
			{rows.map((row) => (
				<div
					key={row.id}
					className="modula-content-page__shortcode-menu-row"
				>
					{row.label ? (
						<div className="modula-content-page__shortcode-menu-label">
							{row.label}
						</div>
					) : null}
					<div className="modula-content-page__shortcode-menu-field">
						<code className="modula-content-page__shortcode-menu-code">
							{row.code}
						</code>
						<CopyShortcodeButton
							code={row.code}
							id={row.id}
							copiedId={copiedId}
							onCopy={onCopy}
							ariaLabel={sprintf(
								/* translators: %s: shortcode type label */
								__(
									'Copy %s shortcode',
									'modula-best-grid-gallery'
								),
								row.label ||
									__('shortcode', 'modula-best-grid-gallery')
							)}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
