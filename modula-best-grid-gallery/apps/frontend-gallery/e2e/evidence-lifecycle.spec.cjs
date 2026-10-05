const fs = require('fs');
const http = require('http');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

test('an unfinished document cannot block response evidence collection', async ({
	page,
	evidence,
}) => {
	// Keep real served-plugin verification while holding only a test-owned response.
	await page.goto(catalog.pages.visible);
	let unfinishedResponse;
	const server = http.createServer((_request, response) => {
		unfinishedResponse = response;
		response.writeHead(200, { 'Content-Type': 'text/html' });
		response.write(
			'<!doctype html><title>Unfinished owned document</title>'
		);
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const visitor = await evidence.anonymous();
	let deadline;
	try {
		const unfinished = await visitor.newPage();
		await unfinished.goto(`http://127.0.0.1:${server.address().port}/`, {
			waitUntil: 'commit',
		});
		const records = await Promise.race([
			evidence.flush(),
			new Promise((_, reject) => {
				deadline = setTimeout(
					() =>
						reject(
							new Error(
								'Evidence collection waited for an unfinished document'
							)
						),
					20000
				);
			}),
		]);
		expect(
			records.find((record) => record.url === unfinished.url())
				?.captureError
		).toBe('Response evidence did not settle within 15000ms');
	} finally {
		clearTimeout(deadline);
		// Finish normally after the assertion so tracing can consume the body.
		if (unfinishedResponse && !unfinishedResponse.destroyed) {
			await new Promise((resolve) =>
				unfinishedResponse.end('</html>', resolve)
			);
		}
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
		await evidence.closeVisitor(visitor);
	}
});
