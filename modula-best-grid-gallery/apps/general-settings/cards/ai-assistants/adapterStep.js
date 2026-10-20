/**
 * @typedef {'ready'|'unsupported-wp'|'install'|'activate'|'manual'} AdapterStep
 */

/**
 * What the MCP Adapter still needs, from the status route: nothing (`ready`),
 * a newer WordPress, Install (install and activate), Activate, or an
 * administrator who may do it (`manual`).
 *
 * @param {{ adapter: string, can_install: boolean, can_activate: boolean }} status Status route response.
 * @return {AdapterStep} The step to show.
 */
export function adapterStep(status) {
	if ('active' === status.adapter) {
		return 'ready';
	}
	if ('unsupported-wp' === status.adapter) {
		return 'unsupported-wp';
	}
	if ('missing' === status.adapter) {
		return status.can_install && status.can_activate ? 'install' : 'manual';
	}

	return status.can_activate ? 'activate' : 'manual';
}
