/**
 * Top bar: visible primary [modula id="…"] + copy; chevron opens extra shortcodes only when PHP provides them (Pro).
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, check, chevronDown, copy } from '@wordpress/icons';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';

/**
 * @param {{ galleryId: number }} props
 */
export default function TakeoverTopBarShortcodes({ galleryId }) {
	const id = Number(galleryId);
	if (!id) {
		return null;
	}

	const editor = getModulaSettingsEditorConfig();
	const raw = editor?.galleryShortcodes;
	const rows = Array.isArray(raw?.rows) ? raw.rows : [];

	const primary = rows[0];
	const primaryCodeFromPhp = primary?.code ? String(primary.code) : '';
	const primaryCode = primaryCodeFromPhp || `[modula id="${id}"]`;
	const primaryLabel =
		primary?.label || __('Embed gallery', 'modula-best-grid-gallery');

	const extraRows = primaryCodeFromPhp
		? rows.slice(1)
		: rows.length > 1
			? rows.slice(1)
			: [];
	const hasExtras = extraRows.length > 0;

	return (
		<TakeoverTopBarShortcodesInner
			primaryCode={primaryCode}
			primaryLabel={primaryLabel}
			extraRows={extraRows}
			hasExtras={hasExtras}
		/>
	);
}

/**
 * @param {Object}                                                                   props
 * @param {string}                                                                   props.primaryCode
 * @param {string}                                                                   props.primaryLabel
 * @param {Array<{ id: string, label: string, code: string, description?: string }>} props.extraRows
 * @param {boolean}                                                                  props.hasExtras
 */
function TakeoverTopBarShortcodesInner({
	primaryCode,
	primaryLabel,
	extraRows,
	hasExtras,
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
		<div
			ref={wrapRef}
			className="modula-gallery-takeover__topbar-shortcodes"
		>
			<div className="modula-gallery-takeover__topbar-shortcodes-field-wrap">
				<div className="modula-gallery-takeover__topbar-shortcodes-field">
					<code
						className="modula-gallery-takeover__topbar-shortcodes-text"
						title={primaryLabel}
					>
						{primaryCode}
					</code>
					<button
						type="button"
						className={
							copiedId === 'primary'
								? 'modula-gallery-takeover__topbar-shortcodes-inline-action is-copied'
								: 'modula-gallery-takeover__topbar-shortcodes-inline-action'
						}
						aria-label={
							copiedId === 'primary'
								? __('Copied', 'modula-best-grid-gallery')
								: __(
										'Copy gallery shortcode',
										'modula-best-grid-gallery'
									)
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
								className="modula-gallery-takeover__topbar-shortcodes-field-sep"
								aria-hidden="true"
							/>
							<button
								type="button"
								className="modula-gallery-takeover__topbar-shortcodes-inline-action modula-gallery-takeover__topbar-shortcodes-inline-action--chevron"
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
											? 'modula-gallery-takeover__topbar-shortcodes-chevron is-open'
											: 'modula-gallery-takeover__topbar-shortcodes-chevron'
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
					className="modula-gallery-takeover__topbar-shortcodes-dropdown"
					id="modula-extra-shortcodes"
					role="dialog"
					aria-labelledby="modula-extra-shortcodes-heading"
				>
					<h2
						id="modula-extra-shortcodes-heading"
						className="modula-gallery-takeover__topbar-shortcodes-heading"
					>
						{__('Use this gallery', 'modula-best-grid-gallery')}
					</h2>
					<div
						className="modula-gallery-takeover__topbar-shortcodes-tabs"
						role="tablist"
						aria-label={__(
							'Gallery links and shortcodes',
							'modula-best-grid-gallery'
						)}
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
							className="modula-gallery-takeover__topbar-shortcodes-dropdown-row"
							role="tabpanel"
							id={`modula-shortcode-panel-${row.id}`}
							aria-labelledby={`modula-shortcode-tab-${row.id}`}
							hidden={activeRow?.id !== row.id}
						>
							<div className="modula-gallery-takeover__topbar-shortcodes-dropdown-field">
								<code
									className="modula-gallery-takeover__topbar-shortcodes-dropdown-input"
									tabIndex={0}
									aria-label={dropdownInputAriaLabel(row)}
								>
									{row.code}
								</code>
								<button
									type="button"
									className={
										copiedId === row.id
											? 'modula-gallery-takeover__topbar-shortcodes-dropdown-inline-copy is-copied'
											: 'modula-gallery-takeover__topbar-shortcodes-dropdown-inline-copy'
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
									className="modula-gallery-takeover__topbar-shortcodes-dropdown-desc"
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
