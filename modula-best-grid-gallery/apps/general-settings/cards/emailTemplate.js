/**
 * An email template body: Pro stores a whole HTML document, and the
 * Visual editor shows the inside of its `<body>` as plain text.
 */

const BODY = /(<body[^>]*>)([\s\S]*)(<\/body>)/i;
const PARAGRAPH = /<p>([\s\S]*?)<\/p>/gi;
// Structure a paragraph cannot hold (a styled `<p>` is caught as a stray
// `<p`), and comments, which the text would show as content.
const NOT_PARAGRAPH_CONTENT =
	/<\/?(?:p|div|table|thead|tbody|tfoot|tr|td|th|ul|ol|li|dl|dt|dd|h[1-6]|blockquote|pre|hr|section|article|header|footer|aside|nav|figure|figcaption|center|address|form|fieldset|style|script)\b|<!--/i;

/**
 * The template's parts: the document around the body, and the body.
 *
 * @param {string} html Stored template.
 * @return {{ before: string, inner: string, after: string }} Parts; a
 *         fragment without `<body>` is all inner.
 */
function documentParts(html) {
	const match = html.match(BODY);
	if (null === match) {
		return { before: '', inner: html, after: '' };
	}

	return {
		before: html.slice(0, match.index) + match[1],
		inner: match[2],
		after: match[3] + html.slice(match.index + match[0].length),
	};
}

/**
 * The body's top-level blocks: each `<p>` element, and each run of content
 * between them (like a bare `{{logo}}`).
 *
 * @param {string} inner Body HTML.
 * @return {{ html: string, content: string }[]} Blocks, with their own HTML
 *         and the HTML inside them.
 */
function bodyBlocks(inner) {
	const blocks = [];
	const addRun = (run) => {
		const html = run.trim();
		if ('' !== html) {
			blocks.push({ html, content: html });
		}
	};
	let end = 0;
	for (const match of inner.matchAll(PARAGRAPH)) {
		addRun(inner.slice(end, match.index));
		blocks.push({ html: match[0], content: match[1] });
		end = match.index + match[0].length;
	}
	addRun(inner.slice(end));

	return blocks;
}

/**
 * A block's text: source whitespace collapsed, `<br>` as a new line.
 *
 * @param {string} content HTML inside the block.
 * @return {string} Text.
 */
function blockText(content) {
	return content
		.replace(/\s+/g, ' ')
		.replace(/\s*<br\s*\/?>\s*/gi, '\n')
		.trim();
}

/**
 * Where a token goes without a cursor: the end of the body's content,
 * inside its last paragraph when it ends with one.
 *
 * @param {string} value Visual text or template.
 * @return {number} Offset.
 */
function endOfBody(value) {
	const { before, inner } = documentParts(value);
	const content = inner.trimEnd();
	const closing = content.toLowerCase().endsWith('</p>') ? 4 : 0;

	return before.length + content.length - closing;
}

/**
 * The Visual editor's paragraphs, as blockText() gives them: spacing
 * collapsed, empty lines and paragraphs dropped.
 *
 * @param {string} text Visual text.
 * @return {string[]} Paragraphs, lines joined by `\n`.
 */
function textParagraphs(text) {
	return text
		.split(/\n[ \t]*\n/)
		.map((paragraph) =>
			paragraph
				.split('\n')
				.map((line) => line.replace(/[ \t]+/g, ' ').trim())
				.filter((line) => '' !== line)
				.join('\n')
		)
		.filter((paragraph) => '' !== paragraph);
}

/**
 * The template as the Visual editor shows it.
 *
 * @param {string} html Stored template.
 * @return {string|null} Paragraphs separated by blank lines; null when the
 *         body has HTML the text cannot keep (tables, lists, styled or
 *         empty paragraphs, comments), so it is edited as Code only.
 */
export function visualText(html) {
	const paragraphs = bodyBlocks(documentParts(html).inner).map((block) => ({
		text: blockText(block.content),
		fits: !NOT_PARAGRAPH_CONTENT.test(block.content),
	}));
	if (paragraphs.some(({ text, fits }) => !fits || '' === text)) {
		return null;
	}

	return paragraphs.map(({ text }) => text).join('\n\n');
}

/**
 * The template with its body rebuilt from the Visual text. A paragraph the
 * text leaves unchanged keeps its HTML (a bare `{{logo}}` stays bare, a
 * `<strong>` stays); an edited or new one becomes `<p>`, its lines joined by
 * `<br>`. The document around the body and its indentation are kept.
 *
 * @param {string} text Visual text.
 * @param {string} html The stored template the text was made from.
 * @return {string} Template.
 */
export function htmlFromVisual(text, html) {
	// Switching modes without an edit must not reformat the stored HTML.
	const paragraphs = textParagraphs(text);
	if (visualText(html) === paragraphs.join('\n\n')) {
		return html;
	}
	const { before, inner, after } = documentParts(html);
	const sources = bodyBlocks(inner);
	const blocks = [];
	// Kept paragraphs are matched in order, after the last one matched.
	let unmatched = 0;
	for (const paragraph of paragraphs) {
		const found = sources.findIndex(
			(block, index) =>
				unmatched <= index && blockText(block.content) === paragraph
		);
		if (-1 === found) {
			blocks.push(`<p>${paragraph.replace(/\n/g, '<br>')}</p>`);
			continue;
		}
		unmatched = found + 1;
		blocks.push(sources[found].html);
	}
	const lead = inner.match(/^\s*/)[0];
	const trail = inner.match(/\s*$/)[0];
	const indent = lead.slice(lead.lastIndexOf('\n') + 1);

	return before + lead + blocks.join(`\n${indent}`) + trail + after;
}

/**
 * The template's placeholders. Pro lists them only in the body's help
 * ("Available placeholders: <code>{{logo}}</code>, …"), so that help is
 * their source.
 *
 * @param {string|undefined} help The body field's description.
 * @return {string[]} Tokens, once each, in the help's order.
 */
export function placeholdersIn(help) {
	return [...new Set(String(help ?? '').match(/\{\{[a-z_]+\}\}/g))];
}

/**
 * Inserts a placeholder token into the editor's value: over the selection,
 * or, without one, after the body's last words (a space apart).
 *
 * @param {string}                              value     Visual text or template.
 * @param {string}                              token     Placeholder, like `{{logo}}`.
 * @param {{ start: number, end: number }|null} selection The editor's selection,
 *                                                        or null when unplaced.
 * @return {{ value: string, caret: number }} New value, and the offset after the token.
 */
export function insertPlaceholder(value, token, selection) {
	const start = selection?.start ?? endOfBody(value);
	const end = selection?.end ?? start;
	const spaced =
		null === selection && /\S/.test(value.charAt(start - 1))
			? ` ${token}`
			: token;

	return {
		value: value.slice(0, start) + spaced + value.slice(end),
		caret: start + spaced.length,
	};
}
