import { __ } from '@wordpress/i18n';
import { Icon, closeSmall } from '@wordpress/icons';
import { IconButton } from '../icon-button/IconButton';

/**
 * Auxiliary panel header: title, optional description, optional close.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {() => void} [props.onClose] When omitted, no close control (category-driven panels).
 * @param {string} [props.className]
 * @param {string} [props.closeLabel]
 */
export function AuxiliaryPanelHead({
	title,
	description,
	onClose,
	className = '',
	closeLabel,
}) {
	const classes = ['modula-ui-auxiliary-panel__head', className]
		.filter(Boolean)
		.join(' ');
	const label =
		typeof closeLabel === 'string' && closeLabel.trim() !== ''
			? closeLabel.trim()
			: __('Close panel', 'modula-best-grid-gallery');
	const showClose = typeof onClose === 'function';

	return (
		<header className={classes}>
			<div className="modula-ui-auxiliary-panel__head-text">
				<h2 className="modula-ui-auxiliary-panel__title">{title}</h2>
				{description ? (
					<p className="modula-ui-auxiliary-panel__hint">
						{description}
					</p>
				) : null}
			</div>
			{showClose ? (
				<IconButton
					className="modula-ui-auxiliary-panel__close"
					label={label}
					onClick={onClose}
				>
					<Icon icon={closeSmall} size={24} />
				</IconButton>
			) : null}
		</header>
	);
}
