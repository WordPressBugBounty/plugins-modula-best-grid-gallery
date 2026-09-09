import { useCallback, useState } from '@wordpress/element';
import { useTakeoverZipImportSession } from './useTakeoverZipImportSession';

/** @typedef {'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist'} PreviewImportReactFlow */

/**
 * Single open-flow state for takeover Add New import modals (folder, zip, Pro extensions).
 *
 * @param {{ invalidateBootstrap: () => void }} args
 */
export function useTakeoverPreviewImportFlows({ invalidateBootstrap }) {
	const [openFlow, setOpenFlow] = useState(
		/** @type {PreviewImportReactFlow | null} */ (null)
	);

	const closePreviewImport = useCallback(() => {
		setOpenFlow(null);
	}, []);

	const zipSession = useTakeoverZipImportSession({
		invalidateBootstrap,
		closeFlow: closePreviewImport,
	});

	const openPreviewImport = useCallback(
		/** @param {PreviewImportReactFlow} reactFlow */
		(reactFlow) => {
			if (reactFlow === 'zip') {
				zipSession.prepareOpen();
			}
			setOpenFlow(reactFlow);
		},
		[zipSession.prepareOpen]
	);

	return {
		openFlow,
		openPreviewImport,
		closePreviewImport,
		zipSession,
	};
}
