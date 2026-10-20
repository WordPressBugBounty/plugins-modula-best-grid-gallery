import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { notificationItems, withoutNotification } from './notifications';

// As the WPChill notification bubble this replaces on redesigned screens:
// new notifications (an AI run, an import) show up within seconds, and
// polling stops after repeated failures.
const POLL_MS = 5000;
const MAX_POLL_FAILURES = 5;

/**
 * The WPChill notification center for the header bell: the notifications,
 * Dismiss (optionally for good) and Dismiss all. A dismissal shows at once
 * and the list is fetched again when the server answers, so a refused one
 * comes back, with a message. Needs the page's QueryClientProvider.
 *
 * @param {string} route REST path of the notification center.
 * @return {Object} `{ items, isPending, problem, dismiss(id, permanent), dismissAll, dismissLater(id, ms) }`;
 *                  `problem` is the latest failure to show, or ''.
 */
export function useNotifications(route) {
	const queryClient = useQueryClient();
	const timers = useRef(new Map());
	const [dismissFailed, setDismissFailed] = useState(false);
	const queryKey = ['wpchill-notifications', route];
	const {
		data: items = [],
		isPending,
		isError,
	} = useQuery({
		queryKey,
		retry: 1,
		queryFn: () => apiFetch({ path: route, method: 'GET' }),
		select: notificationItems,
		refetchInterval: (query) =>
			query.state.fetchFailureCount < MAX_POLL_FAILURES ? POLL_MS : false,
	});
	const refetch = () => queryClient.invalidateQueries({ queryKey });
	// A poll already under way would bring the dismissed notification back.
	const showAtOnce = async (update) => {
		setDismissFailed(false);
		await queryClient.cancelQueries({ queryKey });
		queryClient.setQueryData(queryKey, update);
	};
	const dismissOne = useMutation({
		mutationFn: ({ id, permanent }) =>
			apiFetch({
				path: `${route}/${encodeURIComponent(id)}`,
				method: 'DELETE',
				data: { permanent },
			}),
		onMutate: ({ id }) =>
			showAtOnce((response) => withoutNotification(response, id)),
		onError: () => setDismissFailed(true),
		onSettled: refetch,
	});
	const dismissEvery = useMutation({
		mutationFn: () => apiFetch({ path: route, method: 'DELETE' }),
		onMutate: () => showAtOnce([]),
		onError: () => setDismissFailed(true),
		onSettled: refetch,
	});

	// A timed notification still pending when the page goes away stays.
	useEffect(() => {
		const pending = timers.current;
		return () => pending.forEach((timer) => window.clearTimeout(timer));
	}, []);

	const dismiss = (id, permanent = false) =>
		dismissOne.mutate({ id, permanent });
	const loadFailed = isError && 0 === items.length;

	return {
		items,
		isPending,
		problem: problemMessage(loadFailed, dismissFailed),
		dismiss,
		dismissAll: () => dismissEvery.mutate(),
		// Opening a timed notification again does not schedule it twice.
		dismissLater: (id, ms) => {
			if (timers.current.has(id)) {
				return;
			}
			timers.current.set(
				id,
				window.setTimeout(() => dismiss(id), ms)
			);
		},
	};
}

/**
 * What went wrong, for the panel: the list could not be loaded, or a
 * dismissal was refused (the notification is back).
 *
 * @param {boolean} loadFailed    No list could be loaded.
 * @param {boolean} dismissFailed The latest dismissal failed.
 * @return {string} Message, or '' when nothing failed.
 */
function problemMessage(loadFailed, dismissFailed) {
	if (loadFailed) {
		return __(
			'Notifications could not be loaded. Reload the page to try again.',
			'modula-best-grid-gallery'
		);
	}
	if (dismissFailed) {
		return __(
			'The notification could not be dismissed. Try again.',
			'modula-best-grid-gallery'
		);
	}

	return '';
}
