import { useId } from '@wordpress/element';
import { ChevronDownIcon } from '../icons/icons';

/**
 * A text button with a chevron that shows or hides the content under it
 * ("Can't sign in? Use a password", "Recent activity"). It exposes
 * `aria-expanded`; the panel stays mounted but hidden while closed.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.label        Button text.
 * @param {boolean}                   props.open
 * @param {Function}                  props.onOpenChange Receives the next boolean.
 * @param {import('react').ReactNode} props.children     Revealed content.
 */
export function Disclosure({ label, open, onOpenChange, children }) {
	const panelId = `modula-admin-disclosure-${useId()}`;

	return (
		<div
			className={['modula-admin-disclosure', open ? 'is-open' : '']
				.filter(Boolean)
				.join(' ')}
		>
			<button
				type="button"
				className="modula-admin-disclosure__toggle"
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => onOpenChange(!open)}
			>
				{label}
				<span
					className="modula-admin-disclosure__chevron"
					aria-hidden="true"
				>
					<ChevronDownIcon />
				</span>
			</button>
			<div
				id={panelId}
				className="modula-admin-disclosure__panel"
				hidden={!open}
			>
				{children}
			</div>
		</div>
	);
}
