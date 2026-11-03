import { CloseIcon } from '../icons/icons';

/**
 * A pill with a label and, with `onRemove`, a remove button (a chosen
 * filter, an exception page). The remove button's name comes from
 * `removeLabel` ("Remove Weddings"), since it shows only a cross.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children      Label.
 * @param {Function}                  [props.onRemove]
 * @param {string}                    [props.removeLabel] Required with `onRemove`.
 * @param {boolean}                   [props.disabled]
 * @param {string}                    [props.className]
 */
export function Chip({
	children,
	onRemove,
	removeLabel,
	disabled = false,
	className = '',
}) {
	return (
		<span
			className={[
				'modula-admin-chip',
				onRemove ? 'is-removable' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
		>
			<span className="modula-admin-chip__label">{children}</span>
			{onRemove ? (
				<button
					type="button"
					className="modula-admin-chip__remove"
					aria-label={removeLabel}
					disabled={disabled}
					onClick={() => onRemove()}
				>
					<CloseIcon />
				</button>
			) : null}
		</span>
	);
}
