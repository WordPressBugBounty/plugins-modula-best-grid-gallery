/**
 * Isolated Gallery editor takeover rail for browser geometry checks.
 */
import { useState } from '@wordpress/element';
import { GallerySettingsFormProvider } from '../form/GallerySettingsFormContext';
import { SettingsEditorAppearanceProvider } from '../context/SettingsEditorAppearanceContext';
import TakeoverSidebarNavV2 from '../components/sidebar/TakeoverSidebarNavV2';
import '../styles/takeover.scss';
import '@wordpress/components/build-style/style.css';

const form = {
	Subscribe({ selector, children }) {
		const values = selector({
			values: {
				general: {
					type: 'creative-gallery',
				},
			},
		});
		return children(values);
	},
};

/**
 * @param {Object} props
 * @param {string} [props.docsUrl]
 */
export default function CompactSidebarRailFixture({
	docsUrl = 'https://modula.test/docs',
}) {
	const [activeCategory, setActiveCategory] = useState('layout');

	return (
		<SettingsEditorAppearanceProvider>
			<GallerySettingsFormProvider value={{ form }}>
				<div
					className="modula-settings-editor__app"
					data-appearance="light"
				>
					<div className="modula-gallery-takeover__shell modula-gallery-takeover__shell--redesign-sidebar">
						<div className="modula-gallery-takeover__workspace">
							<aside
								className="modula-gallery-takeover__sidebar modula-gallery-takeover__sidebar--v2"
								aria-label="Settings"
							>
								<div className="modula-gallery-takeover__sidebar-body modula-gallery-takeover__sidebar-body--v2">
									<div className="modula-gallery-takeover__sidebar-v2-columns">
										<div className="modula-gallery-takeover__sidebar-v2-nav-column">
											<TakeoverSidebarNavV2
												activeCategory={activeCategory}
												onActiveCategoryChange={
													setActiveCategory
												}
												onSelect={setActiveCategory}
												docsUrl={docsUrl}
											/>
										</div>
										<div
											className="modula-gallery-takeover__sidebar-v2-settings-column"
											data-testid="settings-panel-slot"
										/>
									</div>
								</div>
							</aside>
							<div
								className="modula-gallery-takeover__canvas-column"
								data-testid="editor-canvas"
							>
								<div className="modula-gallery-takeover__canvas" />
							</div>
						</div>
					</div>
				</div>
			</GallerySettingsFormProvider>
		</SettingsEditorAppearanceProvider>
	);
}
