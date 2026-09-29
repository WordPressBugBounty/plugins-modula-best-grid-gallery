/**
 * Cancel one gallery's wait without cancelling a shared chunk download.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {AbortSignal} [signal]
 * @returns {Promise<T>}
 */
export function waitForGalleryLoad(promise, signal) {
	if (!signal) {
		return promise;
	}
	return new Promise((resolve, reject) => {
		const onAbort = () => reject(signal.reason);
		if (signal.aborted) {
			onAbort();
		} else {
			signal.addEventListener('abort', onAbort, { once: true });
		}
		promise.then(
			(value) => {
				signal.removeEventListener('abort', onAbort);
				resolve(value);
			},
			(error) => {
				signal.removeEventListener('abort', onAbort);
				reject(error);
			}
		);
	});
}
