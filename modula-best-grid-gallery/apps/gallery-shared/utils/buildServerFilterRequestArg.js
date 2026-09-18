/**
 * Build RTK Query getItems arg for server-side filter apply / clear.
 * When visitor pagination is off, request the full filtered catalog (`all`),
 * matching the lightbox catalog fetch contract.
 *
 * @param {Object} args
 * @param {Array<{ key: string, value?: unknown }>} [args.filters]
 * @param {number} [args.page]
 * @param {number} [args.perPage]
 * @param {boolean} args.paginationEnabled
 * @return {{ type: 'filter', page: number, perPage: number, filters: Array, all?: true }}
 */
export function buildServerFilterRequestArg({
	filters = [],
	page = 1,
	perPage = 12,
	paginationEnabled,
}) {
	/** @type {{ type: 'filter', page: number, perPage: number, filters: Array, all?: true }} */
	const arg = {
		type: 'filter',
		page,
		perPage,
		filters: Array.isArray(filters) ? filters : [],
	};
	if (!paginationEnabled) {
		arg.all = true;
	}
	return arg;
}
