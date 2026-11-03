import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';

const SettingsPanelSectionsContext = createContext(null);

/**
 * Which settings panel sections the user opened or closed, by section key
 * (`logic/settingsPanelSections`). It sits above the takeover shell, so the
 * open sections survive switching tabs, image edit and Sort, and the shell can
 * read them (the pagination preview).
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function SettingsPanelSectionsProvider({ children }) {
	const [openSections, setOpenSections] = useState(
		/** @type {Record<string, boolean>} */ ({})
	);

	const setSectionOpen = useCallback(
		/**
		 * @param {string}  key
		 * @param {boolean} open
		 */
		(key, open) => {
			setOpenSections((prev) => ({ ...prev, [key]: open }));
		},
		[]
	);

	const value = useMemo(
		() => ({ openSections, setSectionOpen }),
		[openSections, setSectionOpen]
	);

	return (
		<SettingsPanelSectionsContext.Provider value={value}>
			{children}
		</SettingsPanelSectionsContext.Provider>
	);
}

/**
 * @return {{
 *   openSections: Record<string, boolean>,
 *   setSectionOpen: (key: string, open: boolean) => void,
 * }} The open state and its setter.
 */
export function useSettingsPanelSections() {
	const ctx = useContext(SettingsPanelSectionsContext);
	if (!ctx) {
		throw new Error(
			'useSettingsPanelSections must be used within SettingsPanelSectionsProvider'
		);
	}
	return ctx;
}
