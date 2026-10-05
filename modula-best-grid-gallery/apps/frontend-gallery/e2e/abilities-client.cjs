const path = require('path');
const { expect } = require('./evidence.cjs');
async function native(page, name, input, method = 'GET') {
	return page.evaluate(
		async ({ name: abilityName, input: payload, method: httpMethod }) =>
			window.wp.apiFetch(
				httpMethod === 'POST'
					? {
							path: `/wp-abilities/v1/abilities/${abilityName}/run`,
							method: httpMethod,
							data: { input: payload },
						}
					: {
							path: `/wp-abilities/v1/abilities/${abilityName}/run?${new URLSearchParams(Object.entries(payload).map(([key, value]) => [`input[${key}]`, String(value)]))}`,
						}
			),
		{ name, input, method }
	);
}
async function mcp(page, method, params, session, mediaTrash = false) {
	return page.evaluate(
		async ({
			method: rpcMethod,
			params: rpcParams,
			session: sessionId,
			run,
			mediaTrash: enableTrash,
		}) => {
			const response = await fetch(
				'/wp-json/mcp/mcp-adapter-default-server',
				{
					method: 'POST',
					signal: AbortSignal.timeout(15000),
					headers: {
						'Content-Type': 'application/json',
						'MCP-Protocol-Version': '2025-06-18',
						'X-WP-Nonce': window.wpApiSettings.nonce,
						'X-Modula-E2E-Run': run,
						...(enableTrash
							? { 'X-Modula-E2E-Media-Trash': run }
							: {}),
						...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: rpcMethod,
						params: rpcParams,
					}),
				}
			);
			return {
				status: response.status,
				session: response.headers.get('Mcp-Session-Id'),
				body: await response.json(),
			};
		},
		{
			method,
			params,
			session,
			mediaTrash,
			run: path.basename(process.env.MODULA_E2E_RUN_DIR),
		}
	);
}
function toolData(response) {
	expect(response.status).toBe(200);
	expect(response.body.error).toBeUndefined();
	expect(response.body.result.isError).not.toBe(true);
	return (
		response.body.result.structuredContent ||
		JSON.parse(response.body.result.content[0].text)
	);
}

module.exports = { native, mcp, toolData };
