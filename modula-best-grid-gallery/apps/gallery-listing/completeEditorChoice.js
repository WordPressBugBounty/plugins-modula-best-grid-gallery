/**
 * Finish an editor-choice control without leaving the modal stuck when a
 * View Transition aborts (InvalidStateError).
 */

import { buildCreateGalleryUrl } from './listingCreateGalleryUrl';

/**
 * @param {unknown} error Candidate error.
 * @return {boolean} True when a View Transition was aborted.
 */
export function isAbortedViewTransitionError(error) {
	if (!error || typeof error !== 'object') {
		return false;
	}
	const name = 'name' in error ? error.name : '';
	const message =
		'message' in error && typeof error.message === 'string'
			? error.message
			: '';
	if (name === 'AbortError' && /transition/i.test(message)) {
		return true;
	}
	return (
		name === 'InvalidStateError' && /transition was aborted/i.test(message)
	);
}

/**
 * Skip any in-flight View Transition and mark its promises handled.
 *
 * @param {Object} [doc] Document-like host with optional activeViewTransition.
 * @return {void} Nothing.
 */
export function skipActiveViewTransition(doc) {
	const active = doc?.activeViewTransition;
	if (!active) {
		return;
	}
	try {
		if (typeof active.skipTransition === 'function') {
			active.skipTransition();
		}
	} catch (error) {
		if (!isAbortedViewTransitionError(error)) {
			throw error;
		}
	}
	const swallow = () => {};
	if (active.ready && typeof active.ready.catch === 'function') {
		void active.ready.catch(swallow);
	}
	if (active.finished && typeof active.finished.catch === 'function') {
		void active.finished.catch(swallow);
	}
	if (
		active.updateCallbackDone &&
		typeof active.updateCallbackDone.catch === 'function'
	) {
		void active.updateCallbackDone.catch(swallow);
	}
}

/**
 * Navigate after skipping an aborted View Transition.
 *
 * @param {string} href    Destination URL.
 * @param {Object} options Optional document and location hosts.
 * @return {void}          Nothing.
 */
export function navigateAdminHref(href, options = {}) {
	if (!href) {
		return;
	}
	const doc =
		options.document ??
		(typeof document !== 'undefined' ? document : undefined);
	const location =
		options.location ??
		(typeof window !== 'undefined' ? window.location : undefined);
	if (!location) {
		return;
	}

	skipActiveViewTransition(doc);

	try {
		if (typeof location.assign === 'function') {
			location.assign(href);
			return;
		}
		location.href = href;
	} catch (error) {
		if (!isAbortedViewTransitionError(error)) {
			throw error;
		}
		try {
			if (typeof location.replace === 'function') {
				location.replace(href);
				return;
			}
			location.href = href;
		} catch (retryError) {
			if (!isAbortedViewTransitionError(retryError)) {
				throw retryError;
			}
			setTimeout(() => {
				location.href = href;
			}, 0);
		}
	}
}

/**
 * Close the editor-choice modal, then navigate when the control requires it.
 *
 * @param {Object} params Completion payload.
 * @return {void}         Nothing.
 */
export function completeEditorChoice(params = {}) {
	const action = params.action;
	const href = params.href || '';
	const listUrl = params.listUrl || '';
	const close = params.close;
	const location = params.location;
	const resolvedDoc =
		params.document ??
		(typeof document !== 'undefined' ? document : undefined);
	skipActiveViewTransition(resolvedDoc);
	if (typeof close === 'function') {
		try {
			close();
		} catch (error) {
			if (!isAbortedViewTransitionError(error)) {
				throw error;
			}
		}
	}
	if (action === 'dismiss') {
		if (listUrl) {
			navigateAdminHref(listUrl, {
				document: resolvedDoc,
				location,
			});
		}
		return;
	}
	if (href) {
		navigateAdminHref(href, { document: resolvedDoc, location });
	}
}

/**
 * Listing / empty-state create: Beta or classic post-new URL, then complete.
 *
 * @param {Object} params Create-choice payload.
 * @return {void}         Nothing.
 */
export function completeCreateEditorChoice(params) {
	const choice = params.choice;
	const mode = params.mode || 'create';
	const config = params.config;
	const creatingAlbum = mode === 'create-album';
	const href = buildCreateGalleryUrl({
		postNewUrl: creatingAlbum ? config.newAlbumUrl : config.postNewUrl,
		queryArg: config.editorChoiceQueryArg,
		createNonce: creatingAlbum
			? config.createAlbumNonce
			: config.createGalleryNonce,
		choice,
	});
	completeEditorChoice({
		action: choice,
		href,
		close: params.close,
		document: params.document,
		location: params.location,
	});
}

/**
 * Dismiss the modal. On blocked post-new, leave for the listing.
 *
 * @param {Object} params Dismiss payload.
 * @return {void}         Nothing.
 */
export function completeDismissEditorChoice(params = {}) {
	completeEditorChoice({
		action: 'dismiss',
		listUrl: params.blockedPostNewListUrl || '',
		close: params.close,
		document: params.document,
		location: params.location,
	});
}
