import { useId } from '@wordpress/element';

/**
 * Joins `aria-describedby` ids, dropping empty ones.
 *
 * @param {...(string|undefined)} ids
 * @return {string|undefined} Space-separated ids, or undefined when none.
 */
export function joinIds(...ids) {
	const joined = ids.filter(Boolean).join(' ');

	return joined === '' ? undefined : joined;
}

/**
 * The one rule for "this field shows an error": a non-empty string message.
 *
 * @param {*} error
 * @return {boolean} Whether the message should render.
 */
function hasErrorMessage(error) {
	return typeof error === 'string' && '' !== error;
}

/**
 * Resolves a field's id, error state and the accessibility props its control
 * needs, so every field wires them the same way.
 *
 * @param {Object} args
 * @param {string} [args.id]          Caller id, used when given.
 * @param {*}      [args.error]       Error message; anything but a non-empty string is valid.
 * @param {string} [args.describedBy] Caller `aria-describedby` ids.
 * @return {{ errorId: string, hasError: boolean, controlProps: Object }} Field state and control props.
 */
export function useField({ id: idProp, error, describedBy }) {
	const generated = useId();
	const id = idProp || `modula-admin-field-${generated}`;
	const errorId = `${id}-error`;
	const hasError = hasErrorMessage(error);

	return {
		errorId,
		hasError,
		controlProps: {
			id,
			'aria-invalid': hasError ? 'true' : undefined,
			'aria-describedby': joinIds(describedBy, hasError ? errorId : ''),
		},
	};
}

/**
 * Wraps a text-like control with its error message.
 *
 * @param {Object}                    props
 * @param {string}                    props.errorId
 * @param {boolean}                   props.hasError
 * @param {string}                    [props.error]
 * @param {'field'|'full'}            [props.width]
 * @param {import('react').ReactNode} props.children
 */
export function Field({ errorId, hasError, error, width = 'field', children }) {
	const classes = ['modula-admin-field', 'full' === width ? 'is-full' : '']
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes}>
			{children}
			{hasError ? (
				<p id={errorId} className="modula-admin-field__error">
					{error}
				</p>
			) : null}
		</div>
	);
}
