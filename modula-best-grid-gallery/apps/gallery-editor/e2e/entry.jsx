import { createRoot } from '@wordpress/element';
import CompactSidebarRailFixture from './CompactSidebarRailFixture';

window.modulaSettingsEditor = {
	isPro: true,
	extensionEntitlements: {
		'modula-video': { available: true, enabled: true },
	},
};

createRoot(document.getElementById('modula-gallery-editor-rail-root')).render(
	<CompactSidebarRailFixture />
);
