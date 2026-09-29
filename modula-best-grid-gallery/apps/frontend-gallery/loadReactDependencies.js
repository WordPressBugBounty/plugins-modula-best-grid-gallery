let dependenciesPromise;

/**
 * Select one React 18 pair before evaluating any visitor component. Pro comments
 * already use WordPress's pair. Older hosts (or pages without WordPress React)
 * retain our deferred standalone runtime, without replacing the host globals.
 */
export function loadReactDependencies() {
	if (!dependenciesPromise) {
		dependenciesPromise = prepareDependencies().catch((error) => {
			dependenciesPromise = null;
			throw error;
		});
	}
	return dependenciesPromise;
}

async function prepareDependencies() {
	const { React, ReactDOM } = window;
	if (
		/^18\./.test(React?.version) &&
		React.version === ReactDOM?.version &&
		typeof React.useSyncExternalStore === 'function' &&
		typeof ReactDOM.createRoot === 'function'
	) {
		window.ModulaGalleryReact = { React, ReactDOM };
		return;
	}

	// The standalone renderer itself imports the selected React external.
	const react = await import(
		/* webpackChunkName: "modula-react" */ 'modula-private-react'
	);
	window.ModulaGalleryReact = { React: react.default };
	const dom = await import(
		/* webpackChunkName: "modula-react-dom" */ 'modula-private-react-dom'
	);
	window.ModulaGalleryReact.ReactDOM = dom.default;
}
