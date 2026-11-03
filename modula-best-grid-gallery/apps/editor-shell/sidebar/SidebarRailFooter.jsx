/**
 * Rail footer: the appearance menu (Light, Dark, System), its only item.
 */
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { Menu, MenuItem } from 'admin-ui';
import AdminUiScope from '../appearance/AdminUiScope';
import { useSettingsEditorAppearance } from '../appearance/SettingsEditorAppearanceContext';
import { APPEARANCE_DARK } from '../appearance/settingsEditorAppearance';
import {
	APPEARANCE_PREFERENCE_CHOICES,
	getAppearancePreferenceLabel,
} from '../appearance/appearanceChoices';
import { moonIcon, sunIcon } from './railIcons';

export default function SidebarRailFooter() {
	// Scoped itself, so an editor may place it outside a scoped sidebar.
	return (
		<AdminUiScope>
			<div className="modula-takeover__sidebar-rail-footer">
				<RailAppearanceMenu />
			</div>
		</AdminUiScope>
	);
}

function RailAppearanceMenu() {
	const { appearance, preference, setPreference } =
		useSettingsEditorAppearance();
	const [isOpen, setIsOpen] = useState(false);
	const menuLabel = __('Appearance', 'modula-best-grid-gallery');
	const preferenceLabel = getAppearancePreferenceLabel(preference);

	// The rail ends at the window's foot, so the menu opens upward.
	return (
		<Menu
			open={isOpen}
			onOpenChange={setIsOpen}
			label={menuLabel}
			side="top"
			trigger={(triggerProps) => (
				<button
					type="button"
					{...triggerProps}
					className="modula-takeover__sidebar-rail-appearance modula-settings-editor__appearance-toggle"
					aria-label={sprintf(
						/* translators: %s: chosen appearance (Light, Dark or System). */
						__('Appearance: %s', 'modula-best-grid-gallery'),
						preferenceLabel
					)}
				>
					<Icon
						icon={
							appearance === APPEARANCE_DARK ? moonIcon : sunIcon
						}
						size={16}
					/>
					<span className="modula-takeover__sidebar-rail-appearance-label">
						{preferenceLabel}
					</span>
				</button>
			)}
		>
			{APPEARANCE_PREFERENCE_CHOICES.map((choice) => (
				<MenuItem
					key={choice.value}
					checked={preference === choice.value}
					onSelect={() => setPreference(choice.value)}
				>
					{choice.label}
				</MenuItem>
			))}
		</Menu>
	);
}
