/**
 * Settings panel header: the title, with Back above it in a nested screen.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import AdminUiScope from '../appearance/AdminUiScope';
import { backIcon } from '../top-bar/topBarIcons';

/**
 * @param {Object}     props
 * @param {string}     props.title
 * @param {string}     [props.description] Help under the title (nested screens, image and Sort panels).
 * @param {boolean}    [props.isNested]
 * @param {string}     [props.parentTitle]
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

	// The header also renders in modals, outside the sidebar's scope.
	return (
		<AdminUiScope>
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
							icon={backIcon}
							size={12}
							aria-hidden="true"
							className="modula-settings-panel__back-icon"
						/>
						<span className="modula-settings-panel__back-label">
							{backLabel}
						</span>
					</button>
				) : null}
				<h2
					className="modula-settings-panel__title"
					id={
						isNested
							? 'modula-takeover-nested-frame-title'
							: undefined
					}
				>
					{title}
				</h2>
				{description ? (
					<p className="modula-settings-panel__desc">{description}</p>
				) : null}
			</header>
		</AdminUiScope>
	);
}
