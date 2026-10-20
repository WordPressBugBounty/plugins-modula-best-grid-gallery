import { __, sprintf } from '@wordpress/i18n';
import { Icon, chevronDown } from '@wordpress/icons';
import {
	ListingDropdown,
	ListingDropdownActionItem,
	ListingDropdownDivider,
	ListingDropdownSectionLabel,
} from './ListingDropdown';
import { navigateAdminHref } from './completeEditorChoice';
import { BLANK_START } from './listingCreateGalleryUrl';

/**
 * @param {import('./listingCreatePresets').CreatePreset} preset Menu preset.
 * @return {string} Secondary line: "Default", the summary, or both.
 */
function getPresetDescription(preset) {
	if (!preset.isDefault) {
		return preset.summary;
	}
	if (!preset.summary) {
		return __('Default', 'modula-best-grid-gallery');
	}
	return sprintf(
		/* translators: %s: preset settings summary, e.g. "3 columns · 15px". */
		__('Default · %s', 'modula-best-grid-gallery'),
		preset.summary
	);
}

/**
 * New gallery editor choice button with a New from preset arrow.
 *
 * The main part keeps today's choice; the arrow starts this one create from a
 * preset or blank. It never changes the Default preset.
 *
 * @param {Object}                                               props
 * @param {import('react').ReactNode}                            props.children      Main button content.
 * @param {string}                                               props.className     Main button classes.
 * @param {string}                                               props.menuLabel     Menu header, e.g. "New editor: start from".
 * @param {string}                                               props.arrowLabel    Accessible arrow label.
 * @param {import('./listingCreatePresets').CreatePresetOptions} props.presetOptions Menu model.
 * @param {string}                                               [props.settingsUrl] Settings link for choosing the Default preset.
 * @param {(start?: number | 'blank') => void}                   props.onChoose      Create with an optional start.
 */
export function EditorChoiceSplitButton({
	children,
	className,
	menuLabel,
	arrowLabel,
	presetOptions,
	settingsUrl = '',
	onChoose,
}) {
	return (
		<div className="modula-editor-choice-modal__split">
			<button
				type="button"
				className={`${className} modula-editor-choice-modal__split-main`}
				onClick={() => onChoose()}
			>
				{children}
			</button>
			<ListingDropdown
				className="modula-editor-choice-modal__start-menu"
				placement="top-end"
				renderToggle={({ isOpen, onToggle }) => (
					<button
						type="button"
						className={`${className} modula-editor-choice-modal__split-arrow`}
						onClick={onToggle}
						aria-expanded={isOpen}
						aria-haspopup="menu"
						aria-label={arrowLabel}
					>
						<Icon
							icon={chevronDown}
							size={18}
							fill="currentColor"
						/>
					</button>
				)}
				renderContent={({ onClose }) => {
					const closeThen = (action) => () => {
						onClose();
						action();
					};
					return (
						<>
							<ListingDropdownSectionLabel label={menuLabel} />
							<div className="modula-editor-choice-modal__start-presets">
								{presetOptions.presets.map((preset) => (
									<ListingDropdownActionItem
										key={preset.id}
										label={preset.title}
										description={getPresetDescription(
											preset
										)}
										onClick={closeThen(() =>
											onChoose(preset.id)
										)}
									/>
								))}
							</div>
							<ListingDropdownActionItem
								label={__('Blank', 'modula-best-grid-gallery')}
								description={__(
									'Built-in defaults',
									'modula-best-grid-gallery'
								)}
								onClick={closeThen(() => onChoose(BLANK_START))}
							/>
							{settingsUrl ? (
								<>
									<ListingDropdownDivider />
									<ListingDropdownActionItem
										label={__(
											'Choose the default preset in Settings',
											'modula-best-grid-gallery'
										)}
										onClick={closeThen(() =>
											navigateAdminHref(settingsUrl)
										)}
									/>
								</>
							) : null}
						</>
					);
				}}
			/>
		</div>
	);
}
