/**
 * admin-ui tokens exist only under `AdminUiRoot` (ADR 0050). The takeover
 * layout scopes its sidebar, canvas toolbar and device pill; settings fields
 * also render in the metabox editor, the auxiliary panel and modals, and Pro
 * surfaces (the proofing manager) take this scope from the settings-editor
 * host, so each surface wraps itself in this scope too: the outermost one
 * adds the root in the editor's appearance, nested ones add nothing.
 *
 * The root uses `display: contents`, so adding it never changes a row's
 * grid or flex layout; tokens and type still inherit through it.
 */
import { createContext, useContext } from '@wordpress/element';
import { AdminUiRoot } from 'admin-ui';
import { useSettingsEditorAppearance } from './SettingsEditorAppearanceContext';

const AdminUiScopeContext = createContext(false);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export default function AdminUiScope({ children }) {
	const isInsideScope = useContext(AdminUiScopeContext);
	if (isInsideScope) {
		return children;
	}

	return <AdminUiScopeRoot>{children}</AdminUiScopeRoot>;
}

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
function AdminUiScopeRoot({ children }) {
	const { appearance } = useSettingsEditorAppearance();

	return (
		<AdminUiScopeContext.Provider value>
			<AdminUiRoot
				appearance={appearance}
				className="modula-takeover__admin-ui-scope"
			>
				{children}
			</AdminUiRoot>
		</AdminUiScopeContext.Provider>
	);
}
