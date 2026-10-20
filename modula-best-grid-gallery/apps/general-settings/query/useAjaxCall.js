import { useQueryClient } from '@tanstack/react-query';

/**
 * Adds one value as PHP-style form fields: an array of objects as
 * `key[i][prop]`, another array as `key[i]`, anything else as `key`.
 *
 * @param {FormData} formData
 * @param {string}   key
 * @param {*}        value
 */
const appendFormData = (formData, key, value) => {
	if (Array.isArray(value)) {
		if (typeof value[0] === 'object') {
			value.forEach((obj, index) => {
				Object.entries(obj).forEach(([propKey, propValue]) => {
					formData.append(`${key}[${index}][${propKey}]`, propValue);
				});
			});
		} else {
			value.forEach((item, index) => {
				formData.append(`${key}[${index}]`, item);
			});
		}
	} else {
		formData.append(key, value);
	}
};

/**
 * POSTs to admin-ajax with the data as form fields.
 *
 * @param {Object} data Request data.
 * @return {Promise<Response>} The response.
 */
const postAjax = (data) => {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		appendFormData(formData, key, value);
	});

	return fetch(window.ajaxurl, {
		method: 'POST',
		credentials: 'same-origin',
		body: formData,
	});
};

/**
 * Refetches the settings tabs after an action changed what they list.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @return {Promise<void>}
 */
const refetchTabs = (queryClient) =>
	queryClient.invalidateQueries({ queryKey: ['settings-tabs-query'] });

export const useAjaxCall = () => {
	const queryClient = useQueryClient();

	const doAjaxCall = async (data = {}, invalidate = false) => {
		try {
			const response = await postAjax(data);

			const result = await response.json();

			if (invalidate) {
				await refetchTabs(queryClient);
			}

			return result;
		} catch (error) {
			console.error('AJAX call failed:', error);
			throw error;
		}
	};

	return doAjaxCall;
};

/**
 * An admin-ajax POST whose answer is not read, for actions that answer
 * with plain text (the migrators' imported-galleries update echoes a URL).
 *
 * @return {Function} `(data, invalidate)`: resolves once the request
 *         succeeded (and the tabs refetched, with `invalidate`); rejects on
 *         a network failure or an HTTP error.
 */
export const useAjaxPost = () => {
	const queryClient = useQueryClient();

	return async (data = {}, invalidate = false) => {
		const response = await postAjax(data);
		if (!response.ok) {
			throw new Error(`admin-ajax answered HTTP ${response.status}`);
		}
		if (invalidate) {
			await refetchTabs(queryClient);
		}
	};
};
