import {
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { Button } from '../button/Button';
import { Chip } from '../chip/Chip';
import { TextInput } from '../text-input/TextInput';

/**
 * Normalize token values.
 *
 * @param {unknown} tokens
 * @return {string[]}
 */
export function normalizeFilterTokens(tokens) {
	if (!Array.isArray(tokens)) {
		return [];
	}
	return tokens.map((t) => String(t).trim()).filter(Boolean);
}

/**
 * Tag input with chips + optional autocomplete suggestions.
 * Visual-only — host apps own persistence (comma string, JSON array, etc.).
 *
 * @param {Object}   props
 * @param {string[]} props.value
 * @param {Function} props.onChange           `(tokens: string[]) => void`
 * @param {string[]} [props.suggestions=[]]
 * @param {boolean}  [props.disabled=false]
 * @param {string}   [props.placeholder='']   Input placeholder while adding.
 * @param {string}   [props.addLabel='+ Add'] Add-chip button label.
 * @param {string}   [props.className='']
 * @param {string}   [props.ariaLabel]
 */
export function FiltersTokenField({
	value = [],
	onChange,
	suggestions = [],
	disabled = false,
	placeholder = '',
	addLabel = '+ Add',
	className = '',
	ariaLabel,
}) {
	const tokens = normalizeFilterTokens(value);
	const [adding, setAdding] = useState(false);
	const [draft, setDraft] = useState('');
	const [highlightIndex, setHighlightIndex] = useState(0);
	const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
	const listboxId = useId();
	const rootClass = ['modula-ui-filters-token-field', className]
		.filter(Boolean)
		.join(' ');

	const availableSuggestions = useMemo(() => {
		const selected = new Set(tokens.map((t) => t.toLowerCase()));
		const q = draft.trim().toLowerCase();
		return normalizeFilterTokens(suggestions).filter((name) => {
			if (selected.has(name.toLowerCase())) {
				return false;
			}
			if (!q) {
				return true;
			}
			return name.toLowerCase().includes(q);
		});
	}, [draft, suggestions, tokens]);

	useEffect(() => {
		if (!adding) {
			return;
		}
		inputRef.current?.focus?.();
	}, [adding]);

	useEffect(() => {
		setHighlightIndex(0);
	}, [draft, availableSuggestions.length]);

	const emit = (next) => {
		if (typeof onChange === 'function') {
			onChange(normalizeFilterTokens(next));
		}
	};

	const closeAdd = () => {
		setAdding(false);
		setDraft('');
		setHighlightIndex(0);
	};

	const commitTag = (raw, { keepOpen = false } = {}) => {
		const tag = String(raw || '').trim();
		if (!tag) {
			closeAdd();
			return;
		}
		const exists = tokens.some(
			(t) => t.toLowerCase() === tag.toLowerCase()
		);
		if (!exists) {
			emit([...tokens, tag]);
		}
		if (keepOpen) {
			setDraft('');
			setHighlightIndex(0);
			window.requestAnimationFrame(() => {
				inputRef.current?.focus?.();
			});
			return;
		}
		closeAdd();
	};

	const removeTag = (tag) => {
		emit(tokens.filter((t) => t !== tag));
	};

	const showSuggestions =
		adding && draft.trim().length > 0 && availableSuggestions.length > 0;

	return (
		<div className={rootClass} aria-label={ariaLabel || undefined}>
			<div
				className="modula-ui-filters-token-field__chips"
				role="list"
				aria-label={ariaLabel || undefined}
			>
				{tokens.map((tag) => (
					<span
						key={tag}
						className="modula-ui-filters-token-field__chip-wrap"
						role="listitem"
					>
						<Chip
							disabled={disabled}
							dismissLabel={`Remove ${tag}`}
							onDismiss={
								disabled
									? undefined
									: () => {
											removeTag(tag);
										}
							}
						>
							{tag}
						</Chip>
					</span>
				))}

				{adding ? (
					<div className="modula-ui-filters-token-field__add-wrap">
						<TextInput
							ref={inputRef}
							value={draft}
							disabled={disabled}
							placeholder={placeholder}
							aria-autocomplete="list"
							aria-controls={
								showSuggestions ? listboxId : undefined
							}
							aria-expanded={showSuggestions}
							role="combobox"
							className="modula-ui-filters-token-field__add-input"
							onChange={setDraft}
							onBlur={() => {
								// Defer so suggestion click can commit first.
								window.setTimeout(() => {
									if (
										document.activeElement?.closest?.(
											'.modula-ui-filters-token-field__suggestions'
										)
									) {
										return;
									}
									commitTag(draft);
								}, 0);
							}}
							onKeyDown={(event) => {
								if (
									event.key === 'ArrowDown' &&
									showSuggestions
								) {
									event.preventDefault();
									setHighlightIndex((i) =>
										Math.min(
											i + 1,
											availableSuggestions.length - 1
										)
									);
									return;
								}
								if (
									event.key === 'ArrowUp' &&
									showSuggestions
								) {
									event.preventDefault();
									setHighlightIndex((i) =>
										Math.max(i - 1, 0)
									);
									return;
								}
								if (event.key === 'Enter') {
									event.preventDefault();
									if (
										showSuggestions &&
										availableSuggestions[highlightIndex]
									) {
										commitTag(
											availableSuggestions[
												highlightIndex
											],
											{ keepOpen: true }
										);
										return;
									}
									commitTag(draft, { keepOpen: true });
									return;
								}
								if (event.key === 'Escape') {
									event.preventDefault();
									closeAdd();
								}
							}}
						/>
						{showSuggestions ? (
							<ul
								id={listboxId}
								className="modula-ui-filters-token-field__suggestions"
								role="listbox"
							>
								{availableSuggestions.map((name, index) => (
									<li
										key={name}
										role="option"
										aria-selected={index === highlightIndex}
										className={
											index === highlightIndex
												? 'modula-ui-filters-token-field__suggestion is-selected'
												: 'modula-ui-filters-token-field__suggestion'
										}
										onMouseDown={(event) => {
											event.preventDefault();
											commitTag(name, { keepOpen: true });
										}}
									>
										{name}
									</li>
								))}
							</ul>
						) : null}
					</div>
				) : (
					<Button
						type="button"
						variant="ghost"
						mini
						disabled={disabled}
						className="modula-ui-filters-token-field__add"
						onClick={() => setAdding(true)}
					>
						{addLabel}
					</Button>
				)}
			</div>
		</div>
	);
}
