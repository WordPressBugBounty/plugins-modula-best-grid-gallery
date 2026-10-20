import { useId } from '@wordpress/element';
import { Button } from '../button/Button';
import { ChevronDownIcon } from '../icons/icons';

/**
 * A card row whose button reveals more settings below it (Vimeo "Set up").
 * The button is named by its text and the row label ("Set up Vimeo") and
 * exposes `aria-expanded`; the panel stays mounted but hidden while closed.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.description] Status line under the label.
 * @param {import('react').ReactNode} props.toggleLabel   Button text, e.g. "Set up".
 * @param {boolean}                   props.open
 * @param {Function}                  props.onOpenChange  Receives the next boolean.
 * @param {import('react').ReactNode} props.children      Revealed content, usually a SettingsGroup.
 */
export function ExpandableRow({
	label,
	description = null,
	toggleLabel,
	open,
	onOpenChange,
	children,
}) {
	const baseId = `modula-admin-expandable-${useId()}`;
	const labelId = `${baseId}-label`;
	const toggleTextId = `${baseId}-toggle`;
	const panelId = `${baseId}-panel`;

	return (
		<div
			className={[
				'modula-admin-row',
				'modula-admin-expandable',
				open ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<div className="modula-admin-row__main">
				<span className="modula-admin-expandable__text">
					<span
						id={labelId}
						className="modula-admin-expandable__label"
					>
						{label}
					</span>
					{description ? (
						<span className="modula-admin-expandable__description">
							{description}
						</span>
					) : null}
				</span>
				<Button
					className="modula-admin-expandable__toggle"
					aria-expanded={open}
					aria-controls={panelId}
					aria-labelledby={`${toggleTextId} ${labelId}`}
					onClick={() => onOpenChange(!open)}
				>
					<span id={toggleTextId}>{toggleLabel}</span>
					<span
						className="modula-admin-expandable__chevron"
						aria-hidden="true"
					>
						<ChevronDownIcon />
					</span>
				</Button>
			</div>
			<div
				id={panelId}
				className="modula-admin-expandable__panel"
				hidden={!open}
			>
				{children}
			</div>
		</div>
	);
}
