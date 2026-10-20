import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { isLicense } from './licenseCardModel';

/** Cache key of the license; a key action writes its answer there. */
export const LICENSE_QUERY_KEY = ['modula-license'];

/**
 * Sends a key action to Lite's license route, which answers with the
 * license projected for the browser. Deactivate and check act on the key
 * saved on the site, so only activate sends one.
 *
 * @param {'activate' | 'deactivate' | 'check'} action
 * @param {string}                              [licenseKey] Key to activate.
 * @return {Promise<import('./licenseCardModel').License>} The license; rejects with the route's error.
 */
async function sendLicenseAction(action, licenseKey = '') {
	const license = await apiFetch({
		path: '/modula-best-grid-gallery/v1/license',
		method: 'POST',
		data: { action, license_key: licenseKey },
	});

	if (!isLicense(license)) {
		throw new Error('The license route answered with an unknown shape.');
	}

	return license;
}

/**
 * The site's license. Pro answers a check from its cache, so loading the
 * card does not reach the license server each time.
 */
export const useLicenseQuery = () =>
	useQuery({
		queryKey: LICENSE_QUERY_KEY,
		retry: 1,
		queryFn: () => sendLicenseAction('check'),
	});

/**
 * Mutation for activate (`{ action, licenseKey }`) and deactivate
 * (`{ action }`). Its answer becomes the card's license; after a failure the
 * license is read again, in case the server stored part of the action.
 */
export const useLicenseAction = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ action, licenseKey }) =>
			sendLicenseAction(action, licenseKey),
		onSuccess: (license) => {
			queryClient.setQueryData(LICENSE_QUERY_KEY, license);
		},
		onError: () => {
			queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEY });
		},
	});
};
