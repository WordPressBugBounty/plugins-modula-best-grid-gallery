/**
 * Command palette: jump to a settings category, group, or field (takeover + metabox).
 * Custom overlay (not WP Modal) — command-palette layout + portal to body.
 */
import {
	useCallback,
	useEffect,
	useRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { createPortal } from 'react-dom';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModalEscapeKey } from '../../hooks/useModalEscapeKey';
import { useSettingsCommandPaletteModel } from '../../hooks/useSettingsCommandPaletteModel';
import { useSettingsEditorAppearance } from '../../context/SettingsEditorAppearanceContext';

/**
 * @param {Object}                                          props
 * @param {boolean}                                         props.isOpen
 * @param {() => void}                                      props.onClose
 * @param {(target: {
 *   kind: 'category'|'group'|'field',
 *   categoryName: string,
 *   groupKey?: string,
 *   groupedPath?: string
 * }, values: Record<string, Record<string, unknown>>) => void} props.onNavigate
 */
export default function SettingsCommandPalette({ isOpen, onClose, onNavigate }) {
	const { form } = useGallerySettingsFormBundle();
	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => (
				<SettingsCommandPaletteInner
					isOpen={isOpen}
					onClose={onClose}
					onNavigate={onNavigate}
					values={values}
				/>
			)}
		</form.Subscribe>
	);
}

/**
 * @param {Object}                                          props
 * @param {boolean}                                         props.isOpen
 * @param {() => void}                                      props.onClose
 * @param {(target: {
 *   kind: 'category'|'group'|'field',
 *   categoryName: string,
 *   groupKey?: string,
 *   groupedPath?: string
 * }, values: Record<string, Record<string, unknown>>) => void} props.onNavigate
 * @param {Record<string, Record<string, unknown>>}         props.values
 */
function SettingsCommandPaletteInner({
	isOpen,
	onClose,
	onNavigate,
	values,
}) {
	const { appearance } = useSettingsEditorAppearance();
	const inputRef = useRef(null);
	const listRef = useRef(null);
	const {
		query,
		setQuery,
		filteredEntries,
		activeIndex,
		setActiveIndex,
		moveActive,
	} = useSettingsCommandPaletteModel(isOpen, values);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prevOverflow;
		};
	}, [isOpen]);

	useModalEscapeKey(isOpen, onClose);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}
		const onKey = (e) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				String(e.key).toLowerCase() === 'k'
			) {
				e.preventDefault();
				e.stopPropagation();
				onClose();
			}
		};
		document.addEventListener('keydown', onKey, true);
		return () => document.removeEventListener('keydown', onKey, true);
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const t = window.setTimeout(() => {
			inputRef.current?.focus?.();
			inputRef.current?.select?.();
		}, 0);
		return () => window.clearTimeout(t);
	}, [isOpen]);

	const pick = useCallback(
		(index) => {
			const e = filteredEntries[index];
			if (!e) {
				return;
			}
			onNavigate(
				{
					kind: e.kind,
					categoryName: e.categoryName,
					groupKey: e.groupKey,
					groupedPath: e.groupedPath,
				},
				values
			);
			onClose();
		},
		[filteredEntries, onNavigate, onClose, values]
	);

	const onPanelKeyDown = (event) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveActive(1);
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveActive(-1);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			pick(activeIndex);
		}
	};

	useEffect(() => {
		const node = listRef.current?.querySelector?.(
			`[data-palette-index="${activeIndex}"]`
		);
		node?.scrollIntoView?.({ block: 'nearest' });
	}, [activeIndex, filteredEntries]);

	if (!isOpen || typeof document === 'undefined') {
		return null;
	}

	const titleId = 'modula-settings-cmd-palette-title';

	return createPortal(
		<div
			className={`modula-cmd-palette modula-cmd-palette--${appearance}`}
			role="presentation"
		>
			<div
				className="modula-cmd-palette__backdrop"
				aria-hidden="true"
				onMouseDown={(e) => {
					e.preventDefault();
					onClose();
				}}
			/>
			<div
				className="modula-cmd-palette__panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onMouseDown={(e) => e.stopPropagation()}
				onKeyDown={onPanelKeyDown}
			>
				<div className="modula-cmd-palette__header">
					<span id={titleId} className="modula-cmd-palette__title">
						{__('Search settings', 'modula-best-grid-gallery')}
					</span>
					<span className="modula-cmd-palette__hints" aria-hidden="true">
						{__('↑↓ navigate · ↵ open · esc close', 'modula-best-grid-gallery')}
					</span>
				</div>
				<div className="modula-cmd-palette__input-wrap">
					<input
						ref={inputRef}
						type="text"
						className="modula-cmd-palette__input"
						autoComplete="off"
						role="searchbox"
						placeholder={__(
							'Type a setting name…',
							'modula-best-grid-gallery'
						)}
						aria-label={__(
							'Filter settings',
							'modula-best-grid-gallery'
						)}
						value={query}
						onChange={(ev) => setQuery(ev.target.value)}
						onKeyDown={(e) => {
							if (
								e.key === 'ArrowDown' ||
								e.key === 'ArrowUp' ||
								e.key === 'Enter'
							) {
								onPanelKeyDown(e);
							}
						}}
					/>
				</div>
				<ul
					ref={listRef}
					className="modula-cmd-palette__list"
					role="listbox"
					aria-label={__(
						'Matching settings',
						'modula-best-grid-gallery'
					)}
					aria-activedescendant={
						filteredEntries.length > 0
							? `modula-cmd-palette-opt-${activeIndex}`
							: undefined
					}
				>
					{filteredEntries.length === 0 ? (
						<li
							className="modula-cmd-palette__empty"
							role="option"
						>
							{__(
								'No matches.',
								'modula-best-grid-gallery'
							)}
						</li>
					) : (
						filteredEntries.map((e, i) => (
							<li
								key={e.id}
								id={`modula-cmd-palette-opt-${i}`}
								data-palette-index={i}
								role="option"
								aria-selected={i === activeIndex}
								className={
									i === activeIndex
										? 'modula-cmd-palette__item is-active'
										: 'modula-cmd-palette__item'
								}
								onMouseEnter={() => setActiveIndex(i)}
								onMouseDown={(ev) => {
									ev.preventDefault();
									pick(i);
								}}
							>
								<span className="modula-cmd-palette__item-title">
									{e.title}
								</span>
								<span className="modula-cmd-palette__item-meta">
									{e.kind === 'category'
										? __('Tab', 'modula-best-grid-gallery')
										: null}
									{e.kind === 'group'
										? __('Section', 'modula-best-grid-gallery')
										: null}
									{e.kind === 'field'
										? __('Field', 'modula-best-grid-gallery')
										: null}
									{' · '}
									{e.categoryName}
									{e.groupKey ? ` · ${e.groupKey}` : ''}
								</span>
							</li>
						))
					)}
				</ul>
			</div>
		</div>,
		document.body
	);
}
