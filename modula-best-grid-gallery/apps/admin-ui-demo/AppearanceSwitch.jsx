// Light / dark / system switch for the demo page. It sets the gallery
// editor's appearance preference (editor-shell), the one store admin-ui
// screens resolve their appearance from.
import { Segmented } from 'admin-ui';
import { useSettingsEditorAppearance } from 'editor-shell/appearance/SettingsEditorAppearanceContext';
import {
	APPEARANCE_DARK,
	APPEARANCE_LIGHT,
	APPEARANCE_SYSTEM,
} from 'editor-shell/appearance/settingsEditorAppearance';

const APPEARANCES = [
	{ value: APPEARANCE_LIGHT, label: 'Light' },
	{ value: APPEARANCE_DARK, label: 'Dark' },
	{ value: APPEARANCE_SYSTEM, label: 'System' },
];

export function AppearanceSwitch() {
	const { preference, setPreference } = useSettingsEditorAppearance();

	return (
		<div className="modula-admin-demo__appearance">
			<Segmented
				options={APPEARANCES}
				value={preference}
				onChange={setPreference}
				aria-label="Appearance"
			/>
		</div>
	);
}
