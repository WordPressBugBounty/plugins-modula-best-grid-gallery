/**
 * TinyMCE `content_style` for caption editors on admin-ui (image edit panel,
 * Bulk edit): the editor's sans 14px text on a transparent page, so the
 * field's surface shows through in both appearances.
 */
export const CAPTION_EDITOR_CONTENT_STYLE = [
	'html,body{background:transparent!important;}',
	'body{margin:8px 12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;font-size:14px;line-height:1.4;}',
	'a[data-mce-selected]{box-shadow:none!important;background-color:transparent!important;}',
].join('');
