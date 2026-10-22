import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Segmented } from 'admin-ui';
import {
	htmlFromVisual,
	insertPlaceholder,
	visualPlaceholder,
	visualText,
} from './emailTemplate';

/**
 * An email template's message: a Visual/Code switch, the text, and Insert
 * chips for the template's placeholders. Visual shows the body as
 * paragraphs with links as `[label](url)` (see emailTemplate.js), and its
 * link chips insert a whole link token; Code the stored HTML; both edit the
 * same stored HTML. A body Visual cannot show opens in Code, with Visual
 * unavailable.
 *
 * @param {Object}   props
 * @param {string}   props.id           Textarea id.
 * @param {string}   props.label
 * @param {string}   props.value        Stored template (HTML).
 * @param {Function} props.onChange     Receives the new HTML.
 * @param {string[]} props.placeholders The template's tokens.
 */
export function TemplateEditor({ id, label, value, onChange, placeholders }) {
	const html = 'string' === typeof value ? value : '';
	const [mode, setMode] = useState(() =>
		null === visualText(html) ? 'code' : 'visual'
	);
	// The Visual text as typed. Rebuilding it from the HTML on each key would
	// drop the blank line of a paragraph that has no words yet; it is rebuilt
	// only when the HTML changes elsewhere (Code, Reset).
	const [draft, setDraft] = useState(() => ({
		html,
		text: visualText(html),
	}));
	if (draft.html !== html) {
		// React's way to adjust state to a changed prop: rendering again now.
		const text = visualText(html);
		setDraft({ html, text });
		if (null === text) {
			setMode('code');
		}
	}
	const textareaRef = useRef(null);
	// The text the user's cursor was placed in. A chip uses that cursor only
	// while the text is unchanged since: after Reset or a mode switch, the
	// browser's selection points elsewhere, so the token goes at the end.
	const caretText = useRef(null);
	const pendingCaret = useRef(null);
	const isVisual = 'visual' === mode;
	const shown = isVisual ? draft.text : html;
	const insertId = `${id}-insert`;

	// After a chip, put the cursor back after the token it inserted. It runs
	// after every render, since the textarea's value is only in the DOM then;
	// the pending caret makes it a no-op otherwise.
	useEffect(() => {
		const caret = pendingCaret.current;
		if (null === caret || !textareaRef.current) {
			return;
		}
		pendingCaret.current = null;
		textareaRef.current.focus();
		textareaRef.current.setSelectionRange(caret, caret);
	});

	const editText = (nextText) => {
		caretText.current = nextText;
		if (!isVisual) {
			onChange(nextText);
			return;
		}
		const nextHtml = htmlFromVisual(nextText, html);
		setDraft({ html: nextHtml, text: nextText });
		// Spacing the HTML does not keep (a trailing blank line) is no edit.
		if (nextHtml !== html) {
			onChange(nextHtml);
		}
	};

	const insertToken = (token) => {
		const textarea = textareaRef.current;
		const selection =
			textarea && shown === caretText.current
				? { start: textarea.selectionStart, end: textarea.selectionEnd }
				: null;
		const inserted = insertPlaceholder(
			shown,
			isVisual ? visualPlaceholder(token, placeholders) : token,
			selection
		);
		pendingCaret.current = inserted.caret;
		editText(inserted.value);
	};

	const rememberCaret = (event) => {
		caretText.current = event.target.value;
	};

	return (
		<div className="modula-admin-row is-stacked modula-settings-email__editor">
			<div className="modula-settings-email__editor-head">
				<label
					htmlFor={id}
					className="modula-settings-email__editor-label"
				>
					{label}
				</label>
				<Segmented
					aria-label={__('Editor mode', 'modula-best-grid-gallery')}
					value={isVisual ? 'visual' : 'code'}
					onChange={setMode}
					options={[
						{
							value: 'visual',
							label: __('Visual', 'modula-best-grid-gallery'),
							disabled: null === draft.text,
						},
						{
							value: 'code',
							label: __('Code', 'modula-best-grid-gallery'),
						},
					]}
				/>
			</div>
			<textarea
				ref={textareaRef}
				id={id}
				className={[
					'modula-admin-textarea',
					'modula-settings-email__body',
					isVisual ? '' : 'is-code',
				]
					.filter(Boolean)
					.join(' ')}
				rows={10}
				value={shown}
				spellCheck={isVisual}
				onFocus={rememberCaret}
				onSelect={rememberCaret}
				onChange={(event) => editText(event.target.value)}
			/>
			{null === draft.text ? (
				<p className="modula-settings-email__note">
					{__(
						'This message uses HTML that Visual cannot show, so it opens in Code.',
						'modula-best-grid-gallery'
					)}
				</p>
			) : null}
			{placeholders.length > 0 ? (
				<div
					className="modula-settings-email__insert"
					role="group"
					aria-labelledby={insertId}
				>
					<span
						id={insertId}
						className="modula-settings-email__insert-label"
					>
						{__('Insert', 'modula-best-grid-gallery')}
					</span>
					{placeholders.map((token) => (
						<button
							key={token}
							type="button"
							className="modula-settings-email__chip"
							onClick={() => insertToken(token)}
						>
							{token}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
