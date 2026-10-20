import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

const BASE = '/modula/v2/mcp-connections';
const STATUS_KEY = ['mcp-connections-status'];
const CONNECTIONS_KEY = ['mcp-connections-list'];
const ACTIVITY_KEY = ['mcp-connections-activity'];

/** Error code Oauth::unmet() reports when the site is neither HTTPS nor local. */
export const OAUTH_HTTPS_REQUIRED = 'modula_mcp_oauth_https_required';

/** Requirements for a Direct MCP connection, from the panel's status route. */
export function useMcpStatus() {
	return useQuery({
		queryKey: STATUS_KEY,
		retry: 1,
		queryFn: () => apiFetch({ path: `${BASE}/status` }),
	});
}

/**
 * Creates a connection. The response holds the connection's password, so the
 * mutation keeps nothing once the panel stops using it (gcTime 0).
 */
export function useCreateConnection() {
	const refreshConnections = useRefreshConnections();
	return useMutation({
		gcTime: 0,
		mutationFn: (client) =>
			apiFetch({
				path: `${BASE}/connections`,
				method: 'POST',
				data: { client },
			}),
		onSuccess: refreshConnections,
	});
}

/** Marks the connections list and the activity stale, so both reload after a change, which the activity logs. */
function useRefreshConnections() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
			queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY }),
		]);
}

/** Recent tool calls and connection events, newest first. No row carries arguments or secrets. */
export function useActivity() {
	return useQuery({
		queryKey: ACTIVITY_KEY,
		retry: 1,
		queryFn: () => apiFetch({ path: `${BASE}/activity` }),
	});
}

/** Empties the activity log. */
export function useClearActivity() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiFetch({ path: `${BASE}/activity`, method: 'DELETE' }),
		onSuccess: () => queryClient.setQueryData(ACTIVITY_KEY, []),
	});
}

/** The site's connections, of every kind. No row carries a secret. */
export function useConnections() {
	return useQuery({
		queryKey: CONNECTIONS_KEY,
		retry: 1,
		queryFn: () => apiFetch({ path: `${BASE}/connections` }),
	});
}

/** Ends one connection; the list refreshes, also when the connection was already gone. */
export function useDisconnect() {
	const refreshConnections = useRefreshConnections();
	return useMutation({
		mutationFn: (id) =>
			apiFetch({
				path: `${BASE}/connections/${encodeURIComponent(id)}`,
				method: 'DELETE',
			}),
		onSettled: refreshConnections,
	});
}

/**
 * Replaces a Password connection's password. Like create, the response holds the
 * new password, so the mutation keeps nothing once the panel stops using it.
 * The list refreshes even on failure: the old password may already be revoked.
 */
export function useRegenerate() {
	const refreshConnections = useRefreshConnections();
	return useMutation({
		gcTime: 0,
		mutationFn: (id) =>
			apiFetch({
				path: `${BASE}/connections/${encodeURIComponent(id)}/regenerate`,
				method: 'POST',
			}),
		onSettled: refreshConnections,
	});
}

/**
 * Turns Allow AI clients to connect on or off. The route answers with the fresh status,
 * since OAuth availability follows the switch; the change also appears in the activity.
 */
export function useConnectionSwitch() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (enabled) =>
			apiFetch({
				path: `${BASE}/switch`,
				method: 'POST',
				data: { enabled },
			}),
		onSuccess: (status) => {
			queryClient.setQueryData(STATUS_KEY, status);
			return queryClient.invalidateQueries({ queryKey: ACTIVITY_KEY });
		},
	});
}

/**
 * Installs and activates, or only activates, the MCP Adapter.
 * Both routes answer with the fresh status, which replaces the cached one.
 *
 * @param {'install'|'activate'} action Adapter route to call.
 */
export function useAdapterAction(action) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiFetch({ path: `${BASE}/adapter/${action}`, method: 'POST' }),
		onSuccess: (status) => queryClient.setQueryData(STATUS_KEY, status),
	});
}
