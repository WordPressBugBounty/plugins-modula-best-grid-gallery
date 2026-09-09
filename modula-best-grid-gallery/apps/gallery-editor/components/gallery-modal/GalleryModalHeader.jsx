/**
 * Shared top bar for gallery builder modals.
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { Icon, closeSmall } from '@wordpress/icons';

/**
 * @param {Object}                      props
 * @param {string}                      [props.title]
 * @param {string}                      [props.subtitle]
 * @param {import('@wordpress/icons').Icon} [props.icon]
 * @param {import('react').ReactNode}       [props.iconElement]
 * @param {string}                      [props.titleId]
 * @param {import('react').ReactNode}   [props.headerActions]
 * @param {() => void}                  [props.onClose]
 * @param {boolean}                     [props.showClose=true]
 * @param {string}                      [props.className]
 */
export default function GalleryModalHeader({
	title,
	subtitle,
	icon,
	iconElement,
	titleId = 'modula-gallery-modal-title',
	headerActions,
	onClose,
	showClose = true,
	className = '',
}) {
	const headerClassName = ['modula-gallery-modal__header', className]
		.filter(Boolean)
		.join(' ');

	return (
		<header className={headerClassName}>
			<div className="modula-gallery-modal__header-main">
				{icon ? (
					<Icon
						icon={icon}
						size={20}
						className="modula-gallery-modal__header-icon"
					/>
				) : iconElement ? (
					<span
						className="modula-gallery-modal__header-icon"
						aria-hidden="true"
					>
						{iconElement}
					</span>
				) : null}
				<div className="modula-gallery-modal__header-text">
					{title ? (
						<h2
							id={titleId}
							className="modula-gallery-modal__title"
						>
							{title}
						</h2>
					) : null}
					{subtitle ? (
						<p className="modula-gallery-modal__subtitle">
							{subtitle}
						</p>
					) : null}
				</div>
			</div>
			<div className="modula-gallery-modal__header-actions">
				{headerActions}
				{showClose && onClose ? (
					<>
						{headerActions ? (
							<span
								className="modula-gallery-modal__divider"
								aria-hidden="true"
							/>
						) : null}
						<Button
							variant="tertiary"
							className="modula-gallery-modal__close"
							icon={closeSmall}
							onClick={onClose}
							label={__('Close', 'modula-best-grid-gallery')}
							showTooltip={false}
						/>
					</>
				) : null}
			</div>
		</header>
	);
}
