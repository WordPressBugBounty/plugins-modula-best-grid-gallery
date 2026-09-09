import {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';

/**
 * @typedef {{
 *   value: string,
 *   label: string,
 *   imageUrl?: string,
 *   disabled?: boolean,
 * }} ImageSelectOption
 */

/**
 * Select with optional thumbnails — trigger + listbox popover.
 *
 * Domain-agnostic: pass resolved `imageUrl` on each option (caller resolves assets).
 *
 * @param {Object}             props
 * @param {ImageSelectOption[]} props.options
 * @param {string}             [props.value]
 * @param {Function}           [props.onChange] Receives string value
 * @param {boolean}            [props.disabled]
 * @param {string}             [props.help]
 * @param {string}             [props.className]
 * @param {string}             [props.id]
 * @param {string}             [props.listLabel] aria-label for the listbox
 * @param {string}             [props.placeholder] Label when value is empty / unknown
 */
export const ImageSelect = forwardRef(function ImageSelect(
	{
		options = [],
		value = '',
		onChange,
		disabled = false,
		help,
		className = '',
		id: idProp,
		listLabel = 'Select option',
		placeholder = 'Select…',
		...rest
	},
	ref
) {
	const genId = useId();
	const id = idProp || `modula-ui-image-select-${genId}`;
	const listId = `${id}-listbox`;
	const rootRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const [open, setOpen] = useState(false);

	const currentKey =
		value === null || value === undefined ? '' : String(value);
	const selected =
		options.find((opt) => String(opt.value) === currentKey) || null;
	const triggerLabel = selected?.label || placeholder;
	const triggerThumb =
		typeof selected?.imageUrl === 'string' && selected.imageUrl.trim()
			? selected.imageUrl.trim()
			: '';

	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onDocPointer = (event) => {
			const root = rootRef.current;
			if (!root || !(event.target instanceof Node)) {
				return;
			}
			if (!root.contains(event.target)) {
				close();
			}
		};
		const onKey = (event) => {
			if (event.key === 'Escape') {
				close();
			}
		};
		document.addEventListener('mousedown', onDocPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocPointer);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, close]);

	const classes = ['modula-ui-image-select', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div
			ref={(node) => {
				rootRef.current = node;
				if (typeof ref === 'function') {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
			}}
			className={classes}
			{...rest}
		>
			<button
				type="button"
				id={id}
				className="modula-ui-image-select__trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listId}
				disabled={disabled}
				onClick={() => {
					if (!disabled) {
						setOpen((was) => !was);
					}
				}}
			>
				{triggerThumb ? (
					<img
						className="modula-ui-image-select__trigger-thumb"
						src={triggerThumb}
						alt=""
					/>
				) : null}
				<span className="modula-ui-image-select__trigger-label">
					{triggerLabel}
				</span>
				<span
					className="modula-ui-image-select__caret"
					aria-hidden="true"
				/>
			</button>
			{open ? (
				<ul
					id={listId}
					className="modula-ui-image-select__list"
					role="listbox"
					aria-label={listLabel}
				>
					{options.map((opt) => {
						const key = String(opt.value);
						const selectedOpt = key === currentKey;
						const thumb =
							typeof opt.imageUrl === 'string' &&
							opt.imageUrl.trim()
								? opt.imageUrl.trim()
								: '';
						const optDisabled = Boolean(opt.disabled) || disabled;
						return (
							<li key={key} role="presentation">
								<button
									type="button"
									role="option"
									aria-selected={selectedOpt}
									className={`modula-ui-image-select__option${
										selectedOpt ? ' is-selected' : ''
									}`}
									disabled={optDisabled}
									onClick={() => {
										if (optDisabled) {
											return;
										}
										if (typeof onChange === 'function') {
											onChange(key);
										}
										close();
									}}
								>
									{thumb ? (
										<img
											className="modula-ui-image-select__option-thumb"
											src={thumb}
											alt=""
										/>
									) : (
										<span
											className="modula-ui-image-select__option-thumb modula-ui-image-select__option-thumb--empty"
											aria-hidden="true"
										/>
									)}
									<span className="modula-ui-image-select__option-label">
										{opt.label}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			) : null}
			{help ? (
				<p className="modula-ui-image-select__help">{help}</p>
			) : null}
		</div>
	);
});
