import { createRoot } from '@wordpress/element';
import { SettingsEditorAppearanceProvider } from 'editor-shell/appearance/SettingsEditorAppearanceContext';
import { DemoPage } from './DemoPage';
import './demo.scss';

const container = document.getElementById('modula-admin-ui-demo');

if (container) {
	createRoot(container).render(
		<SettingsEditorAppearanceProvider>
			<DemoPage />
		</SettingsEditorAppearanceProvider>
	);
}
