/**
 * The gallery's post fields (title and status, the shell's
 * `createEditorPostFields`), created once per editor by `GalleryTakeoverMount`
 * so the editor save session can ask whether the gallery was never saved, and
 * read by the shell's top bar.
 */
import { createContext, useContext } from '@wordpress/element';

export const GalleryPostFieldsContext = createContext(null);

/**
 * @return {ReturnType<typeof import('editor-shell/logic').createEditorPostFields>} The editor's post fields.
 * @throws {Error} Outside `GalleryPostFieldsContext`.
 */
export function useGalleryPostFields() {
	const postFields = useContext(GalleryPostFieldsContext);
	if (!postFields) {
		throw new Error(
			'useGalleryPostFields must be used within GalleryPostFieldsContext'
		);
	}
	return postFields;
}
