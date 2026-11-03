import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, chevronDown } from '@wordpress/icons';
import { AdminUiRoot, Menu, MenuGroup, MenuItem } from 'admin-ui';
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
	const [open, setOpen] = useState(false);

	return (
		<div className="modula-editor-choice-modal__split">
			<button
				type="button"
				className={`${className} modula-editor-choice-modal__split-main`}
				onClick={() => onChoose()}
			>
				{children}
			</button>
			{/* The modal sits outside the page's AdminUiRoot: the menu brings its own tokens. */}
			<AdminUiRoot className="modula-editor-choice-modal__start">
				<Menu
					open={open}
					onOpenChange={setOpen}
					label={menuLabel}
					align="end"
					side="top"
					trigger={(triggerProps) => (
						<button
							type="button"
							className={`${className} modula-editor-choice-modal__split-arrow`}
							aria-label={arrowLabel}
							{...triggerProps}
						>
							<Icon
								icon={chevronDown}
								size={18}
								fill="currentColor"
							/>
						</button>
					)}
				>
					<MenuGroup label={menuLabel}>
						{presetOptions.presets.map((preset) => (
							<MenuItem
								key={preset.id}
								description={
									getPresetDescription(preset) || null
								}
								onSelect={() => onChoose(preset.id)}
							>
								{preset.title}
							</MenuItem>
						))}
						<MenuItem
							description={__(
								'Built-in defaults',
								'modula-best-grid-gallery'
							)}
							onSelect={() => onChoose(BLANK_START)}
						>
							{__('Blank', 'modula-best-grid-gallery')}
						</MenuItem>
					</MenuGroup>
					{settingsUrl ? (
						<MenuGroup>
							<MenuItem
								onSelect={() => navigateAdminHref(settingsUrl)}
							>
								{__(
									'Choose the default preset in Settings',
									'modula-best-grid-gallery'
								)}
							</MenuItem>
						</MenuGroup>
					) : null}
				</Menu>
			</AdminUiRoot>
		</div>
	);
}
