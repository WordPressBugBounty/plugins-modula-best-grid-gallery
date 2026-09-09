/**
 * Preview item mutations: flush pending debounced item persist before add/remove/replace.
 *
 * @package
 */

/**
 * @param {{
 *   isPersistPending: () => boolean,
 *   flushPersist: () => Promise<void>,
 *   runMutation: (task: () => void | Promise<unknown>) => Promise<unknown>,
 *   task: () => void | Promise<unknown>,
 * }} args
 * @return {Promise<unknown>}
 */
export async function runCustomGridPreviewItemMutation({
	isPersistPending,
	flushPersist,
	runMutation,
	task,
}) {
	if (isPersistPending()) {
		await flushPersist();
	}
	return runMutation(task);
}
