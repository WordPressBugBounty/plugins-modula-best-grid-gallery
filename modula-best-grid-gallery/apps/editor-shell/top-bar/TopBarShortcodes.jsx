/**
 * Top bar shortcode chip: primary code + copy; a chevron opens extra links/shortcodes when the editor supplies them.
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, check, chevronDown, copy } from '@wordpress/icons';

/**
 * @param {Object}                                                                   props
 * @param {string}                                                                   props.primaryCode       Shortcode shown in the chip; nothing renders without it.
 * @param {string}                                                                   props.primaryLabel      Tooltip for the primary code.
 * @param {string}                                                                   props.copyLabel         Accessible name of the copy button.
 * @param {Array<{ id: string, label: string, code: string, description?: string }>} [props.extraRows]       Extra links/shortcodes behind the chevron.
 * @param {string}                                                                   [props.extrasHeading]   Heading of the extras dropdown.
 * @param {string}                                                                   [props.extrasTabsLabel] Accessible name of the extras tab list.
 */
export default function TopBarShortcodes({
	primaryCode,
	primaryLabel,
	copyLabel,
	extraRows = [],
	extrasHeading = '',
	extrasTabsLabel = '',
}) {
	if (!primaryCode) {
		return null;
	}

	return (
		<TopBarShortcodesInner
			primaryCode={primaryCode}
			primaryLabel={primaryLabel}
			copyLabel={copyLabel}
			extraRows={extraRows}
			hasExtras={extraRows.length > 0}
			extrasHeading={extrasHeading}
			extrasTabsLabel={extrasTabsLabel}
		/>
	);
}

/**
 * @param {Object}                                                                   props
 * @param {string}                                                                   props.primaryCode
 * @param {string}                                                                   props.primaryLabel
 * @param {string}                                                                   props.copyLabel
 * @param {Array<{ id: string, label: string, code: string, description?: string }>} props.extraRows
 * @param {boolean}                                                                  props.hasExtras
 * @param {string}                                                                   props.extrasHeading
 * @param {string}                                                                   props.extrasTabsLabel
 */
function TopBarShortcodesInner({
	primaryCode,
	primaryLabel,
	copyLabel,
	extraRows,
	hasExtras,
	extrasHeading,
	extrasTabsLabel,
}) {
	const [open, setOpen] = useState(false);
	const [activeId, setActiveId] = useState('modula_link');
	const activeRow =
		extraRows.find((row) => row.id === activeId) || extraRows[0];
	const triggerRef = useRef(null);
	const [copiedId, setCopiedId] = useState(/** @type {string|null} */ (null));
	const wrapRef = useRef(null);
	const copiedTimerRef = useRef(0);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onDoc = (e) => {
			const el = wrapRef.current;
			if (el && e.target instanceof Node && !el.contains(e.target)) {
				setOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				setOpen(false);
				triggerRef.current?.focus();
			}
		};
		const t = window.setTimeout(() => {
			document.addEventListener('mousedown', onDoc, true);
			document.addEventListener('keydown', onKey);
		}, 0);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const copyCode = useCallback(async (code, id) => {
		const text = String(code || '');
		if (!text) {
			return;
		}
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				throw new Error('no clipboard');
			}
		} catch {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.position = 'fixed';
			ta.style.left = '-9999px';
			document.body.appendChild(ta);
			ta.select();
			try {
				document.execCommand('copy');
			} finally {
				document.body.removeChild(ta);
			}
		}
		window.clearTimeout(copiedTimerRef.current);
		setCopiedId(id);
		copiedTimerRef.current = window.setTimeout(() => {
			setCopiedId(null);
		}, 2000);
	}, []);

	useEffect(() => {
		return () => {
			window.clearTimeout(copiedTimerRef.current);
		};
	}, []);

	return (
		<div ref={wrapRef} className="modula-takeover__topbar-shortcodes">
			<div className="modula-takeover__topbar-shortcodes-field-wrap">
				<div className="modula-takeover__topbar-shortcodes-field">
					<code
						className="modula-takeover__topbar-shortcodes-text"
						title={primaryLabel}
					>
						{primaryCode}
					</code>
					<button
						type="button"
						className={
							copiedId === 'primary'
								? 'modula-takeover__topbar-shortcodes-inline-action is-copied'
								: 'modula-takeover__topbar-shortcodes-inline-action'
						}
						aria-label={
							copiedId === 'primary'
								? __('Copied', 'modula-best-grid-gallery')
								: copyLabel
						}
						onClick={() => copyCode(primaryCode, 'primary')}
					>
						<Icon
							icon={copiedId === 'primary' ? check : copy}
							size={14}
							aria-hidden="true"
						/>
					</button>
					{hasExtras ? (
						<>
							<span
								className="modula-takeover__topbar-shortcodes-field-sep"
								aria-hidden="true"
							/>
							<button
								type="button"
								className="modula-takeover__topbar-shortcodes-inline-action modula-takeover__topbar-shortcodes-inline-action--chevron"
								aria-expanded={open}
								ref={triggerRef}
								aria-haspopup="dialog"
								aria-controls={
									open ? 'modula-extra-shortcodes' : undefined
								}
								aria-label={__(
									'More shortcodes',
									'modula-best-grid-gallery'
								)}
								onClick={() => {
									setActiveId('modula_link');
									setOpen((o) => !o);
								}}
							>
								<Icon
									icon={chevronDown}
									size={16}
									className={
										open
											? 'modula-takeover__topbar-shortcodes-chevron is-open'
											: 'modula-takeover__topbar-shortcodes-chevron'
									}
									aria-hidden="true"
								/>
							</button>
						</>
					) : null}
				</div>
			</div>
			{open && hasExtras ? (
				<div
					className="modula-takeover__topbar-shortcodes-dropdown"
					id="modula-extra-shortcodes"
					role="dialog"
					aria-labelledby="modula-extra-shortcodes-heading"
				>
					<h2
						id="modula-extra-shortcodes-heading"
						className="modula-takeover__topbar-shortcodes-heading"
					>
						{extrasHeading}
					</h2>
					<div
						className="modula-takeover__topbar-shortcodes-tabs"
						role="tablist"
						aria-label={extrasTabsLabel}
					>
						{extraRows.map((row, index) => (
							<button
								key={row.id}
								type="button"
								role="tab"
								id={`modula-shortcode-tab-${row.id}`}
								aria-controls={`modula-shortcode-panel-${row.id}`}
								aria-selected={activeRow?.id === row.id}
								tabIndex={activeRow?.id === row.id ? 0 : -1}
								onClick={() => setActiveId(row.id)}
								onKeyDown={(event) => {
									let next;
									if (event.key === 'ArrowRight') {
										next = (index + 1) % extraRows.length;
									}
									if (event.key === 'ArrowLeft') {
										next =
											(index - 1 + extraRows.length) %
											extraRows.length;
									}
									if (event.key === 'Home') {
										next = 0;
									}
									if (event.key === 'End') {
										next = extraRows.length - 1;
									}
									if (next === undefined) {
										return;
									}
									event.preventDefault();
									setActiveId(extraRows[next].id);
									event.currentTarget.parentElement.children[
										next
									].focus();
								}}
							>
								{row.id === 'modula_link'
									? __('Link', 'modula-best-grid-gallery')
									: row.label}
							</button>
						))}
					</div>
					{extraRows.map((row) => (
						<div
							key={row.id}
							className="modula-takeover__topbar-shortcodes-dropdown-row"
							role="tabpanel"
							id={`modula-shortcode-panel-${row.id}`}
							aria-labelledby={`modula-shortcode-tab-${row.id}`}
							hidden={activeRow?.id !== row.id}
						>
							<div className="modula-takeover__topbar-shortcodes-dropdown-field">
								<code
									className="modula-takeover__topbar-shortcodes-dropdown-input"
									tabIndex={0}
									aria-label={dropdownInputAriaLabel(row)}
								>
									{row.code}
								</code>
								<button
									type="button"
									className={
										copiedId === row.id
											? 'modula-takeover__topbar-shortcodes-dropdown-inline-copy is-copied'
											: 'modula-takeover__topbar-shortcodes-dropdown-inline-copy'
									}
									aria-label={dropdownCopyAriaLabel(
										row,
										copiedId === row.id
									)}
									onClick={() => copyCode(row.code, row.id)}
								>
									<Icon
										icon={
											copiedId === row.id ? check : copy
										}
										size={14}
										aria-hidden="true"
									/>
									<span aria-live="polite">
										{copiedId === row.id
											? __(
													'Copied',
													'modula-best-grid-gallery'
												)
											: __(
													'Copy',
													'modula-best-grid-gallery'
												)}
									</span>
								</button>
							</div>
							{row.description ? (
								<p
									className="modula-takeover__topbar-shortcodes-dropdown-desc"
									// eslint-disable-next-line react/no-danger -- Same trusted HTML as PHP shortcode metabox (wp_kses_post).
									dangerouslySetInnerHTML={{
										__html: row.description,
									}}
								/>
							) : null}
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}

/**
 * @param {{ id: string, label: string }} row
 */
function dropdownInputAriaLabel(row) {
	const label = row.label || '';
	if (row.id === 'standalone_permalink') {
		return sprintf(
			/* translators: %s: field label (e.g. Permalink) */
			__('%s — URL', 'modula-best-grid-gallery'),
			label
		);
	}
	return sprintf(
		/* translators: %s: shortcode type label */
		__('%s — shortcode text', 'modula-best-grid-gallery'),
		label
	);
}

/**
 * @param {{ id: string }} row
 * @param {boolean}        copied
 */
function dropdownCopyAriaLabel(row, copied) {
	if (copied) {
		return __('Copied', 'modula-best-grid-gallery');
	}
	if (row.id === 'standalone_permalink') {
		return __('Copy URL', 'modula-best-grid-gallery');
	}
	return __('Copy shortcode', 'modula-best-grid-gallery');
}
