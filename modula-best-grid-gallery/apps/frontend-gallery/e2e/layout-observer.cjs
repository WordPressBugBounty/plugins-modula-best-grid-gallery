// Test-only observations of the public DOM, paint, resource and layout-shift APIs.
async function observeLayout(page, galleryId) {
	await page.addInitScript((id) => {
		const record = (window.layoutEvidence = {
			frames: [],
			shifts: [],
			paints: [],
			lcp: [],
			loads: [],
			fonts: [],
		});
		const rect = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
		new PerformanceObserver((list) => {
			record.shifts.push(
				...list.getEntries().map((entry) => ({
					time: entry.startTime,
					value: entry.value,
					recentInput: entry.hadRecentInput,
					sources: entry.sources.map((source) => {
						const node =
							source.node?.nodeType === 3
								? source.node.parentElement
								: source.node;
						return {
							node: node?.className || node?.nodeName,
							id: node?.id,
							gallery: !!node?.closest?.(`#modula-${id}`),
							before: source.previousRect,
							after: source.currentRect,
						};
					}),
				}))
			);
		}).observe({ type: 'layout-shift', buffered: true });
		for (const [type, key] of [
			['paint', 'paints'],
			['largest-contentful-paint', 'lcp'],
		]) {
			new PerformanceObserver((list) => {
				record[key].push(
					...list.getEntries().map((entry) => entry.toJSON())
				);
			}).observe({ type, buffered: true });
		}
		document.addEventListener(
			'load',
			(event) => {
				if (event.target.matches?.('img,link[rel="stylesheet"]')) {
					record.loads.push({
						time: performance.now(),
						url: event.target.currentSrc || event.target.href,
					});
				}
			},
			true
		);
		document.fonts.addEventListener('loadingdone', () =>
			record.fonts.push(performance.now())
		);
		function frame() {
			const root = document.getElementById(`modula-${id}`);
			if (root) {
				const box = root.getBoundingClientRect();
				const visibleImages = [...root.querySelectorAll('img.pic')]
					.filter((img) => {
						const imageBox = img.getBoundingClientRect();
						if (
							!img.complete ||
							!img.naturalWidth ||
							imageBox.width <= 0 ||
							imageBox.height <= 0 ||
							imageBox.bottom <= Math.max(box.top, 0) ||
							imageBox.top >= Math.min(box.bottom, innerHeight)
						)
							return false;
						for (let node = img; node; node = node.parentElement) {
							const style = getComputedStyle(node);
							if (
								style.display === 'none' ||
								style.visibility === 'hidden' ||
								Number(style.opacity) === 0
							)
								return false;
						}
						return true;
					})
					.map((img) =>
						img
							.closest('[data-modula-image-id]')
							?.getAttribute('data-modula-image-id')
					);
				record.frames.push({
					time: performance.now(),
					root: rect(root),
					after: rect(document.getElementById('e2e-layout-after')),
					mounted: !!root.querySelector('.modula-parallax-masonry'),
					pending: [
						...root.querySelectorAll(
							'.modula-gallery__chunk-loading'
						),
					].map(rect),
					items: [
						...root.querySelectorAll(
							'.modula-parallax-masonry-item'
						),
					].map((item) => ({
						id: item
							.querySelector('[data-modula-image-id]')
							?.getAttribute('data-modula-image-id'),
						rect: rect(item),
						top: item.offsetTop,
						height: item.offsetHeight,
						columnTransform: getComputedStyle(item.parentElement)
							.transform,
					})),
					visibleImages,
					loaded: [...root.querySelectorAll('img.pic')].filter(
						(img) => img.complete && img.naturalWidth
					).length,
				});
			}
			if (!record.stop) requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
	}, galleryId);
}

async function readLayout(page) {
	return page.evaluate(() => {
		window.layoutEvidence.stop = true;
		return {
			...window.layoutEvidence,
			resources: performance
				.getEntriesByType('resource')
				.filter((entry) =>
					/\.(css|woff2?|jpe?g|webp|png)(?:\?|$)/.test(entry.name)
				)
				.map((entry) => entry.toJSON()),
		};
	});
}

module.exports = { observeLayout, readLayout };
