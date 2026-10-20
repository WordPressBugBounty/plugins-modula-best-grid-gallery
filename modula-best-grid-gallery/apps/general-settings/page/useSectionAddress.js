import { useEffect, useState } from '@wordpress/element';
import { resolveSectionId } from '../model/settingsPageModel';

function readAddress() {
	const params = new URL(window.location.href).searchParams;

	return { section: params.get('section'), tab: params.get('tab') };
}

/**
 * The open section, from `?section=` (or a legacy `?tab=`), kept in the
 * address so it survives a reload.
 *
 * @param {string[]} sectionIds Sections in display order.
 * @return {[string|null, Function]} Open section id, and a function that opens a section.
 */
export function useSectionAddress(sectionIds) {
	const [address, setAddress] = useState(readAddress);
	const sectionId = resolveSectionId(address, sectionIds);

	// Rewrite legacy and unknown addresses to the section that opened.
	useEffect(() => {
		if (null === sectionId) {
			return;
		}
		const url = new URL(window.location.href);
		if (
			sectionId === url.searchParams.get('section') &&
			!url.searchParams.has('tab')
		) {
			return;
		}
		url.searchParams.set('section', sectionId);
		url.searchParams.delete('tab');
		window.history.replaceState(window.history.state, '', url);
	}, [sectionId]);

	const openSection = (id) => setAddress({ section: id, tab: null });

	return [sectionId, openSection];
}
