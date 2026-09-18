/**
 * wp.media Select frame defaults to the Upload files tab (`content: 'upload'`).
 * Match classic metabox: persist browse, then switch the router to Media Library.
 *
 * @param {{ content?: { mode?: (name?: string) => string } }} [frame]
 * @param {(name: string, value: string) => void} [setUserSetting]
 */
export function preferWpMediaLibraryBrowseTab(frame, setUserSetting) {
	if (typeof setUserSetting === 'function') {
		setUserSetting('libraryContent', 'browse');
	}
	const mode = frame?.content?.mode;
	if (typeof mode !== 'function') {
		return;
	}
	if (mode.call(frame.content) !== 'browse') {
		mode.call(frame.content, 'browse');
	}
}
