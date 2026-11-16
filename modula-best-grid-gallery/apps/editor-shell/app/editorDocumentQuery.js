/**
 * Queries that load an editor's document (gallery or album settings, the
 * gallery bootstrap, album members and sorting).
 *
 * Once the editor has loaded, the working state belongs to the editor (ADR
 * 0059): a refetch can only replace it while nothing is unsaved. So the
 * document is fetched on open and when an editor action asks for it
 * (invalidation), never on window focus or reconnect.
 */
export const EDITOR_DOCUMENT_QUERY_OPTIONS = Object.freeze({
	staleTime: Infinity,
	refetchOnWindowFocus: false,
	refetchOnReconnect: false,
});

/**
 * What an editor shows for its document query.
 *
 * Once data has arrived the editor stays mounted: a failed or running
 * background refetch must not unmount it, because unmounting discards the
 * unsaved working state (TanStack Query keeps `data` and reports `isError`
 * after a failed refetch).
 *
 * @param {{ data?: unknown, isPending: boolean, isError: boolean }} query
 * @return {'loading'|'error'|'ready'} The phase to render.
 */
export function editorDocumentQueryPhase({ data, isPending, isError }) {
	if (data !== undefined) {
		return 'ready';
	}
	if (isError && !isPending) {
		return 'error';
	}
	return 'loading';
}
