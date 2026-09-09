/**
 * Redesign settings panel — context header (EDITING / Back + title).
 */
import { __, sprintf } from '@wordpress/i18n';
import { Icon, chevronLeft } from '@wordpress/icons';

/**
 * @param {Object}   props
 * @param {string}   props.title
 * @param {string}   [props.description]
 * @param {boolean}  [props.isNested]
 * @param {string}   [props.parentTitle]
 * @param {() => void} [props.onBack]
 */
export default function SettingsPanelHeader({
	title,
	description = '',
	isNested = false,
	parentTitle = '',
	onBack,
}) {
	const backLabel = parentTitle || __('Settings', 'modula-best-grid-gallery');

	return (
		<header
			className={`modula-settings-panel__header${
				isNested ? ' modula-settings-panel__header--nested' : ''
			}`}
		>
			{isNested ? (
				<button
					type="button"
					className="modula-settings-panel__back"
					onClick={onBack}
					aria-label={sprintf(
						/* translators: %s: parent settings section title. */
						__('Back to %s', 'modula-best-grid-gallery'),
						backLabel
					)}
				>
					<Icon
						icon={chevronLeft}
						size={16}
						aria-hidden="true"
						className="modula-settings-panel__back-icon"
					/>
					<span className="modula-settings-panel__back-label">
						{backLabel}
					</span>
				</button>
			) : (
				<span className="modula-settings-panel__eyebrow">
					{__('Editing', 'modula-best-grid-gallery')}
				</span>
			)}
			<h2
				className="modula-settings-panel__title"
				id={
					isNested
						? 'modula-gallery-takeover-nested-frame-title'
						: undefined
				}
			>
				{title}
			</h2>
			{description ? (
				<p className="modula-settings-panel__desc">{description}</p>
			) : null}
		</header>
	);
}
