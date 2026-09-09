/**
 * Scroll the takeover (or metabox) settings column to a field or group anchor.
 *
 * @param {object}                     params
 * @param {'category'|'group'|'field'} params.kind
 * @param {string}                     [params.groupKey]
 * @param {string}                     [params.groupedPath]
 * @param {{ settleMs?: number }}      [options]  Wait for sidebar/tab paint (takeover track transition ~180ms).
 */
export function scrollSettingsEditorTargetIntoView(
	{ kind, groupKey, groupedPath },
	options = {}
) {
	const settleMs =
		typeof options.settleMs === 'number' ? options.settleMs : 280;

	const getScrollContainer = () => {
		const takeoverInner = document.querySelector(
			'.modula-gallery-takeover__sidebar-settings-inner'
		);
		if (takeoverInner) {
			return takeoverInner;
		}
		const tabContent = document.querySelector(
			'.modula-settings-editor__tab-panel .components-tab-panel__tab-content'
		);
		return tabContent instanceof HTMLElement ? tabContent : null;
	};

	/**
	 * @param {HTMLElement} container
	 * @param {HTMLElement} el
	 */
	const scrollElementIntoContainer = (container, el) => {
		const cRect = container.getBoundingClientRect();
		const eRect = el.getBoundingClientRect();
		const padding = 12;
		const delta = eRect.top - cRect.top + container.scrollTop - padding;
		container.scrollTo({
			top: Math.max(0, delta),
			behavior: 'smooth',
		});
	};

	const run = () => {
		const container = getScrollContainer();

		if (kind === 'category') {
			container?.scrollTo?.({ top: 0, behavior: 'smooth' });
			return;
		}

		/** @type {HTMLElement | null} */
		let el = null;
		if (kind === 'field' && groupedPath) {
			el = document.getElementById(`modula-field-${groupedPath}`);
		}
		if (!el && groupKey) {
			el = document.getElementById(`modula-se-${groupKey}`);
		}

		if (container && el) {
			scrollElementIntoContainer(container, el);
		} else if (el) {
			el.scrollIntoView({ block: 'start', behavior: 'smooth' });
		}
	};

	window.setTimeout(() => {
		requestAnimationFrame(() => requestAnimationFrame(run));
	}, settleMs);
}
