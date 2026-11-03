import { CAPTION_EDITOR_CONTENT_STYLE } from '../field/captionEditorContentStyle';

/** Single-line inputs in the bulk-edit sheet row. */
export const BULK_EDIT_INLINE_FIELD_HEIGHT_PX = 36;

/** Matches WYSIWYG toolbar + body when description row is expanded. */
export const BULK_EDIT_FIELD_HEIGHT_PX = 120;

/**
 * Compact TinyMCE profile for bulk-edit caption cells: the canvas's
 * Bold, Italic and Link, with the image panel's caption text.
 */
export const BULK_EDIT_DESCRIPTION_TINYMCE = {
	height: 84,
	min_height: 84,
	max_height: 200,
	toolbar1: 'bold italic link',
	content_style: CAPTION_EDITOR_CONTENT_STYLE,
	// Bulk edit is a modal `<dialog>`: the page behind it is inert and below
	// the top layer. TinyMCE opens its windows (Link) in `<body>`, so move
	// each one into the dialog, where it can be seen and used.
	setup: (editor) => {
		editor.on('OpenWindow', (event) => {
			const windowElement = event.win?.getEl?.();
			const dialog = editor.getContainer()?.closest('dialog');
			if (windowElement && dialog) {
				dialog.appendChild(windowElement);
			}
		});
	},
};
