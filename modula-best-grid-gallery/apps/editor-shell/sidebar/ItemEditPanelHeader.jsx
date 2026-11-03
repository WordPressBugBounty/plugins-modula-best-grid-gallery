/**
 * Header of an item edit panel (canvas "Edit image"), which replaces the
 * settings panel in its column: "Back to settings" over the item's place in
 * the gallery ("Image 3 of 12") and previous/next arrows.
 */
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import AdminUiScope from '../appearance/AdminUiScope';
import { backIcon } from '../top-bar/topBarIcons';

const nextIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.7"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M9 18l6-6-6-6" />
	</svg>
);

/**
 * @param {Object}     props
 * @param {string}     props.label
 * @param {Object}     props.icon
 * @param {(() => void)|null} props.onClick Null disables the arrow.
 */
function PagerArrow({ label, icon, onClick }) {
	return (
		<button
			type="button"
			className="modula-settings-panel__pager-arrow"
			aria-label={label}
			title={label}
			disabled={!onClick}
			onClick={onClick ?? undefined}
		>
			<Icon icon={icon} size={15} aria-hidden="true" />
		</button>
	);
}

/**
 * The arrows show while either handler is set; a null handler disables its
 * arrow. Without both (a lone item, a shortcode tile) there are none.
 *
 * @param {Object}            props
 * @param {string}            props.title           The item's place ("Image 3 of 12").
 * @param {() => void}        props.onBack
 * @param {(() => void)|null} [props.onPrevious]
 * @param {(() => void)|null} [props.onNext]
 * @param {string}            [props.previousLabel]
 * @param {string}            [props.nextLabel]
 */
export default function ItemEditPanelHeader({
	title,
	onBack,
	onPrevious = null,
	onNext = null,
	previousLabel = __('Previous image', 'modula-best-grid-gallery'),
	nextLabel = __('Next image', 'modula-best-grid-gallery'),
}) {
	const hasPager = Boolean(onPrevious || onNext);
	return (
		<AdminUiScope>
			<header className="modula-settings-panel__header modula-settings-panel__header--item">
				<button
					type="button"
					className="modula-settings-panel__back"
					onClick={onBack}
				>
					<Icon
						icon={backIcon}
						size={12}
						aria-hidden="true"
						className="modula-settings-panel__back-icon"
					/>
					<span className="modula-settings-panel__back-label">
						{__('Back to settings', 'modula-best-grid-gallery')}
					</span>
				</button>
				<div className="modula-settings-panel__pager">
					<h2 className="modula-settings-panel__title">{title}</h2>
					{hasPager ? (
						<div className="modula-settings-panel__pager-arrows">
							<PagerArrow
								label={previousLabel}
								icon={backIcon}
								onClick={onPrevious}
							/>
							<PagerArrow
								label={nextLabel}
								icon={nextIcon}
								onClick={onNext}
							/>
						</div>
					) : null}
				</div>
			</header>
		</AdminUiScope>
	);
}
