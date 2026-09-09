import { useCallback, useRef, useState } from '@wordpress/element';

/**
 * ZIP import UI state (hidden importer + modal) for takeover Add New.
 *
 * @param {{
 *   invalidateBootstrap: () => void,
 *   closeFlow: () => void,
 * }} args
 */
export function useTakeoverZipImportSession({
	invalidateBootstrap,
	closeFlow,
}) {
	const [zipStatus, setZipStatus] = useState('');
	const [zipError, setZipError] = useState('');
	const [zipDeleteAfter, setZipDeleteAfter] = useState(true);
	const zipImporterRef = useRef(null);

	const prepareOpen = useCallback(() => {
		setZipError('');
		setZipStatus('');
	}, []);

	const handleZipSuccess = useCallback(() => {
		invalidateBootstrap();
		closeFlow();
		setZipStatus('');
		setZipError('');
	}, [closeFlow, invalidateBootstrap]);

	return {
		zipImporterRef,
		zipStatus,
		setZipStatus,
		zipError,
		setZipError,
		zipDeleteAfter,
		setZipDeleteAfter,
		prepareOpen,
		handleZipSuccess,
	};
}
