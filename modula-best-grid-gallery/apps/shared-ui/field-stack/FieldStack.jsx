import { useId } from '@wordpress/element';
import { DirtyMark } from '../dirty-mark/DirtyMark';
import { ResetToDefaultButton } from '../dirty-mark/ResetToDefaultButton';

/**
 * Stacked field chrome: label above control + optional help.
 * Visual only — host binds value/onChange on the control child.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} props.children Control (TextInput, Select, …)
 * @param {import('react').ReactNode} [props.help]
 * @param {import('react').ReactNode} [props.labelEnd] Optional trailing slot (e.g. AI button)
 * @param {boolean} [props.dirty]
 * @param {Function} [props.onReset]
 * @param {string} [props.htmlFor] When set, associates label with control id
 * @param {string} [props.className]
 */
export function FieldStack({
	label,
	children,
	help,
	labelEnd,
	dirty = false,
	onReset,
	htmlFor: htmlForProp,
	className = '',
	...rest
}) {
	const genId = useId();
	const htmlFor = htmlForProp || undefined;
	const helpId = help ? `modula-ui-field-stack-help-${genId}` : undefined;
	const showReset = dirty && typeof onReset === 'function';
	const classes = [
		'modula-ui-field-stack',
		dirty ? 'is-dirty' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const handleReset = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onReset();
	};

	return (
		<div className={classes} {...rest}>
			<div className="modula-ui-field-stack__label-row">
				{dirty ? (
					<DirtyMark className="modula-ui-field-stack__dirty" />
				) : null}
				{label ? (
					<label
						className="modula-ui-field-stack__label"
						htmlFor={htmlFor}
					>
						{label}
					</label>
				) : null}
				{showReset ? (
					<ResetToDefaultButton onClick={handleReset} />
				) : null}
				{labelEnd ? (
					<div className="modula-ui-field-stack__label-end">
						{labelEnd}
					</div>
				) : null}
			</div>
			<div className="modula-ui-field-stack__control">{children}</div>
			{help ? (
				<p id={helpId} className="modula-ui-field-stack__help">
					{help}
				</p>
			) : null}
		</div>
	);
}
