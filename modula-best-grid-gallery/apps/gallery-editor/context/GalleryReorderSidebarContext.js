/**
 * Settings-editor: Sort & order takeover in the settings column (not aux).
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { useTakeoverSidebarStack } from './TakeoverSidebarStackContext';

/** @type {import('react').Context<{
 *   isOpen: boolean,
 *   open: () => void,
 *   close: () => void,
 * } | null>} */
export const GalleryReorderSidebarContext = createContext(null);

/**
 * @return {{
 *   isOpen: boolean,
 *   open: () => void,
 *   close: () => void,
 * } | null}
 */
export function useGalleryReorderSidebar() {
	return useContext(GalleryReorderSidebarContext);
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function GalleryReorderSidebarProvider({ children }) {
	const { clearStack } = useTakeoverSidebarStack();
	const [isOpen, setIsOpen] = useState(false);

	const open = useCallback(() => {
		clearStack();
		setIsOpen(true);
	}, [clearStack]);

	const close = useCallback(() => {
		setIsOpen(false);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}
		const onKey = (e) => {
			if (e.key !== 'Escape') {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			setIsOpen(false);
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [isOpen]);

	const value = useMemo(
		() => ({
			isOpen,
			open,
			close,
		}),
		[isOpen, open, close]
	);

	return (
		<GalleryReorderSidebarContext.Provider value={value}>
			{children}
		</GalleryReorderSidebarContext.Provider>
	);
}
