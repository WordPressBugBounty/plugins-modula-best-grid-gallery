/* Count and clean only run-owned messages in Local dev's SMTP sink. */
const assert = require('node:assert/strict');
module.exports = async (run, cleanup = false) => {
	assert.match(run, /^modula-e2e-[a-f0-9]{16}$/);
	const base = 'http://localhost:10000/api/v1';
	const response = await fetch(
		`${base}/search?query=${encodeURIComponent(run)}&limit=100`,
		{ signal: AbortSignal.timeout(10000) }
	);
	assert.equal(response.ok, true);
	const result = await response.json();
	assert.equal(
		result.messages_count,
		result.messages.length,
		'Owned mailbox search must be complete'
	);
	for (const message of result.messages) {
		assert.equal(message.To.length, 1);
		assert.ok(message.To[0].Address.startsWith(`${run}-`));
		assert.ok(message.To[0].Address.endsWith('@example.test'));
		if (cleanup) {
			const removed = await fetch(`${base}/messages`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ IDs: [message.ID] }),
				signal: AbortSignal.timeout(10000),
			});
			assert.equal(removed.ok, true, 'Remove only owned message');
		}
	}
	return result.messages.map((message) => ({
		id: message.ID,
		recipient: message.To[0].Address,
	}));
};
