/**
 * App shell: WordPress TabPanel + category content. Keeps layout concerns in one place.
 * Tabs respect category `visibleWhen` (e.g. Video only for video gallery type).
 */

import {
	useCallback,
	useState,
} from '@wordpress/element';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import { __ } from '@wordpress/i18n';
import { TabPanel } from '@wordpress/components';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { getVisibleCategories } from '../../logic/categoryVisibility';
import { applyCommandPaletteHubNavigation } from '../../utils/commandPaletteHubNavigation';
import { isModulaSettingsCommandPaletteKeyScope } from '../../utils/isModulaSettingsCommandPaletteKeyScope';
import { scrollSettingsEditorTargetIntoView } from '../../utils/scrollSettingsEditorTargetIntoView';
import { useCommandPaletteHotkey } from '../../hooks/useCommandPaletteHotkey';
import AppHeader from './AppHeader';
import CategoryPanelContent from '../sidebar/CategoryPanelContent';
import EditorSaveBar from './EditorSaveBar';
import SettingsCommandPaletteLazy from '../schema/SettingsCommandPaletteLazy';

export default function SettingsEditorShell({ galleryId }) {
	const { form } = useGallerySettingsFormBundle();
	const FormSubscribe = form.Subscribe;

	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [tabPanelNonce, setTabPanelNonce] = useState(0);
	const [paletteInitialTab, setPaletteInitialTab] = useState(
		/** @type {string | null} */ (null)
	);

	const openCommandPalette = useCallback(() => {
		setCommandPaletteOpen(true);
	}, []);

	const closeCommandPalette = useCallback(() => {
		setCommandPaletteOpen(false);
	}, []);

	useCommandPaletteHotkey({
		isOpen: commandPaletteOpen,
		setOpen: setCommandPaletteOpen,
		isInScope: isModulaSettingsCommandPaletteKeyScope,
	});

	return (
		<div className="modula-settings-editor__shell">
			<AppHeader
				galleryId={galleryId}
				onOpenCommandPalette={openCommandPalette}
			/>
			<EditorSaveBar />
			<FormSubscribe
				selector={(s) => ({
					general: {
						type: s.values?.general?.type,
					},
				})}
			>
				{(values) => (
					<SettingsEditorShellFormBridge
						values={values}
						tabPanelNonce={tabPanelNonce}
						paletteInitialTab={paletteInitialTab}
						onTabSelect={() => setPaletteInitialTab(null)}
						commandPaletteOpen={commandPaletteOpen}
						closeCommandPalette={closeCommandPalette}
						setPaletteInitialTab={setPaletteInitialTab}
						setTabPanelNonce={setTabPanelNonce}
					/>
				)}
			</FormSubscribe>
			<p className="modula-settings-editor__footer-hint">
				{__(
					'Form state is managed by TanStack Form; the server sanitizes on save.',
					'modula-best-grid-gallery'
				)}
			</p>
		</div>
	);
}

/**
 * @param {Object}                                  props
 * @param {Record<string, Record<string, unknown>>} props.values
 * @param {number}                                  props.tabPanelNonce
 * @param {string | null}                           props.paletteInitialTab
 * @param {() => void}                              props.onTabSelect
 * @param {boolean}                                 props.commandPaletteOpen
 * @param {() => void}                              props.closeCommandPalette
 * @param {Function}                                props.setPaletteInitialTab
 * @param {Function}                                props.setTabPanelNonce
 */
function SettingsEditorShellFormBridge({
	values,
	tabPanelNonce,
	paletteInitialTab,
	onTabSelect,
	commandPaletteOpen,
	closeCommandPalette,
	setPaletteInitialTab,
	setTabPanelNonce,
}) {
	const { clearStack, pushFrame } = useTakeoverSidebarStack();
	const onPaletteNavigate = useCallback(
		(target, formValues) => {
			setPaletteInitialTab(target.categoryName);
			setTabPanelNonce((n) => n + 1);
			const openedHubDrill = applyCommandPaletteHubNavigation(
				target,
				formValues,
				{ clearStack, pushFrame }
			);
			scrollSettingsEditorTargetIntoView(target, {
				settleMs: openedHubDrill ? 450 : 320,
			});
		},
		[clearStack, pushFrame, setPaletteInitialTab, setTabPanelNonce]
	);
	return (
		<>
			<SettingsEditorShellTabs
				values={values}
				tabPanelNonce={tabPanelNonce}
				paletteInitialTab={paletteInitialTab}
				onTabSelect={onTabSelect}
			/>
			<SettingsCommandPaletteLazy
				isOpen={commandPaletteOpen}
				onClose={closeCommandPalette}
				onNavigate={onPaletteNavigate}
			/>
		</>
	);
}

/**
 * @param {Object}                                  props
 * @param {Record<string, Record<string, unknown>>} props.values
 * @param {number}                                  props.tabPanelNonce
 * @param {string | null}                           props.paletteInitialTab
 * @param {() => void}                              props.onTabSelect
 */
function SettingsEditorShellTabs({
	values,
	tabPanelNonce,
	paletteInitialTab,
	onTabSelect,
}) {
	const visible = getVisibleCategories(SETTINGS_EDITOR_CATEGORIES, values);
	const tabs = visible.map((cat) => ({
		name: cat.name,
		title: cat.title,
		className: 'modula-settings-editor__primary-tab',
	}));
	const tabKey = tabs.map((t) => t.name).join('|');

	const initialTabName =
		paletteInitialTab && visible.some((c) => c.name === paletteInitialTab)
			? paletteInitialTab
			: (tabs[0]?.name ?? '');

	return (
		<TabPanel
			key={`${tabKey}-${tabPanelNonce}`}
			className="modula-settings-editor__tab-panel"
			activeClass="is-active"
			orientation="vertical"
			tabs={tabs}
			initialTabName={initialTabName}
			onSelect={onTabSelect}
		>
			{(tab) => <CategoryPanelContent categoryName={tab.name} />}
		</TabPanel>
	);
}
