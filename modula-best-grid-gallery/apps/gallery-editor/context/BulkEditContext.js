import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';

const BulkEditContext = createContext(null);

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function BulkEditProvider({ children }) {
	const [isOpen, setIsOpen] = useState(false);

	const openBulkEdit = useCallback(() => {
		setIsOpen(true);
	}, []);

	const closeBulkEdit = useCallback(() => {
		setIsOpen(false);
	}, []);

	const value = useMemo(
		() => ({
			isOpen,
			openBulkEdit,
			closeBulkEdit,
		}),
		[isOpen, openBulkEdit, closeBulkEdit]
	);

	return (
		<BulkEditContext.Provider value={value}>
			{children}
		</BulkEditContext.Provider>
	);
}

/**
 * @return {{
 *   isOpen: boolean,
 *   openBulkEdit: () => void,
 *   closeBulkEdit: () => void,
 * }}
 */
export function useBulkEdit() {
	const ctx = useContext(BulkEditContext);
	if (!ctx) {
		throw new Error('useBulkEdit must be used within BulkEditProvider');
	}
	return ctx;
}
