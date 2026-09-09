/**
 * Safari: <picture> + srcset can leave img.complete true while naturalWidth is still 0,
 * and the load event may not fire again — LQIP placeholder never hides.
 *
 * @param {HTMLImageElement} img
 * @param {() => void}       onReveal
 * @return {() => void}
 */
export function bindSafariGalleryItemImageReveal(img, onReveal) {
	let cancelled = false;
	let revealed = false;

	const reveal = () => {
		if (cancelled || revealed) {
			return;
		}
		revealed = true;
		onReveal();
	};

	const tryReveal = () => {
		if (cancelled || revealed) {
			return true;
		}
		if (img.naturalWidth > 0) {
			reveal();
			return true;
		}
		return false;
	};

	if (tryReveal()) {
		return () => {
			cancelled = true;
		};
	}

	const onLoad = () => {
		tryReveal();
	};
	img.addEventListener('load', onLoad);

	let rafId = 0;
	let attempts = 0;
	const maxAttempts = 120;

	const poll = () => {
		if (cancelled || revealed) {
			return;
		}
		if (tryReveal()) {
			return;
		}
		if (attempts >= maxAttempts) {
			if (img.complete) {
				reveal();
			}
			return;
		}
		attempts += 1;
		rafId = requestAnimationFrame(poll);
	};

	const startPollIfNeeded = () => {
		if (cancelled || revealed || tryReveal()) {
			return;
		}
		if (img.complete) {
			poll();
		}
	};

	if (typeof img.decode === 'function') {
		img.decode().then(startPollIfNeeded).catch(startPollIfNeeded);
	} else {
		startPollIfNeeded();
	}

	return () => {
		cancelled = true;
		img.removeEventListener('load', onLoad);
		if (rafId) {
			cancelAnimationFrame(rafId);
		}
	};
}
