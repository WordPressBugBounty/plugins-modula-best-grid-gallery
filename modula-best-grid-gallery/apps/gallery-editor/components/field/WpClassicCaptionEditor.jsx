/**
 * WordPress classic editor (TinyMCE + Quicktags) for image caption HTML — same pattern as Pro bulk editor.
 */
/* eslint-disable no-undef */
import { useEffect, useMemo, useRef } from '@wordpress/element';

const TINYMCE_OPTIONS = {
	wpautop: false,
	forced_root_block: false,
	forced_br_newlines: true,
	force_p_newlines: false,
	plugins: 'lists link textcolor colorpicker',
	toolbar1:
		'bold italic underline strikethrough | bullist numlist | link unlink | forecolor backcolor',
	content_style:
		'a[data-mce-selected]{box-shadow:none!important;background-color:transparent!important;}',
};

/** Stable fallback — never use `tinymceOptions = {}` in props (new object every render). */
const EMPTY_TINYMCE_OPTIONS = Object.freeze({});

/**
 * @param {() => void} releaseSuppress
 */
function scheduleReleaseEditorChangeSuppress(releaseSuppress) {
	window.setTimeout(releaseSuppress, 0);
}

/** @param {() => void} fn */
function scheduleOnNextTick(fn) {
	window.setTimeout(fn, 0);
}

/**
 * @param {{ removed?: boolean, iframeElement?: HTMLElement, getBody?: () => { blur?: () => void }, getWin?: () => { blur?: () => void } }} editor
 */
function blurTinyMceEditor(editor) {
	if (!editor || editor.removed) {
		return;
	}
	try {
		const iframe = editor.iframeElement;
		if (iframe instanceof HTMLElement) {
			iframe.blur();
		}
		const body = editor.getBody?.();
		if (body && typeof body.blur === 'function') {
			body.blur();
		}
		const win = editor.getWin?.();
		if (win && typeof win.blur === 'function') {
			win.blur();
		}
	} catch {
		// Non-fatal: focus may already be outside the editor.
	}
}

/**
 * TinyMCE API differs by bundled version: WP may ship editors with `mode.set` (v5+) or only `setMode` (v4).
 *
 * @param {{ removed?: boolean, mode?: { set?: (m: string) => void }, setMode?: (m: string) => void } | null | undefined} editor
 * @param {boolean} readOnly
 */
function setTinyMceReadOnly(editor, readOnly) {
	if (!editor || editor.removed) {
		return;
	}
	const mode = readOnly ? 'readonly' : 'design';
	try {
		if (editor.mode && typeof editor.mode.set === 'function') {
			editor.mode.set(mode);
			return;
		}
		if (typeof editor.setMode === 'function') {
			editor.setMode(mode);
		}
	} catch {
		// Non-fatal: caption remains editable if mode API is missing.
	}
}

/**
 * @param {Object}              props
 * @param {string}              props.editorInstanceKey Stable key per image row (e.g. `${storeIndex}-${attachmentId}`).
 * @param {string}              props.value             HTML caption.
 * @param {(v: string) => void} props.onChange
 * @param {boolean}             props.disabled
 * @param {string}              props.accessibleLabel   Same as visible field label (textarea aria-label).
 * @param {string}              [props.className]       Textarea class (bulk edit uses a compact skin).
 * @param {number}              [props.rows]            Native textarea rows before TinyMCE mounts.
 * @param {Record<string, unknown>} [props.tinymceOptions] Merged into default TinyMCE config.
 * @param {boolean}             [props.preventInitFocus] When true, blur TinyMCE after init and call `onAfterInit` (modal keeps focus on another field).
 * @param {boolean}             [props.autoFocusOnInit]  When true, focus TinyMCE after init (bulk-edit inline description).
 * @param {() => void}          [props.onAfterInit]      Run after init when `preventInitFocus` is set.
 * @param {() => void}          [props.onEscape]         Called when Escape is pressed in the caption field (textarea or TinyMCE).
 */
export default function WpClassicCaptionEditor({
	editorInstanceKey,
	value,
	onChange,
	disabled,
	accessibleLabel,
	className = 'modula-image-metadata-modal__wp-caption-editor',
	rows = 6,
	tinymceOptions,
	preventInitFocus = false,
	autoFocusOnInit = false,
	onAfterInit,
	onEscape,
}) {
	const editorId = `modula-img-meta-caption-${editorInstanceKey}`;
	const mergedTinymceOptions = tinymceOptions ?? EMPTY_TINYMCE_OPTIONS;
	const tinymceOptionsKey = useMemo(
		() => JSON.stringify(mergedTinymceOptions),
		[mergedTinymceOptions]
	);

	const onChangeRef = useRef(onChange);
	const disabledRef = useRef(disabled);
	const valueRef = useRef(value);
	const onEscapeRef = useRef(onEscape);
	const onAfterInitRef = useRef(onAfterInit);
	const preventInitFocusRef = useRef(preventInitFocus);
	const autoFocusOnInitRef = useRef(autoFocusOnInit);
	const suppressChangeRef = useRef(false);
	const tinymceOptionsRef = useRef(mergedTinymceOptions);
	onChangeRef.current = onChange;
	disabledRef.current = disabled;
	valueRef.current = value;
	onEscapeRef.current = onEscape;
	onAfterInitRef.current = onAfterInit;
	preventInitFocusRef.current = preventInitFocus;
	autoFocusOnInitRef.current = autoFocusOnInit;
	tinymceOptionsRef.current = mergedTinymceOptions;

	const setEditorContentSilently = (editor, html) => {
		suppressChangeRef.current = true;
		editor.setContent(html);
		scheduleReleaseEditorChangeSuppress(() => {
			suppressChangeRef.current = false;
		});
	};

	useEffect(() => {
		if (!window.wp?.oldEditor) {
			return undefined;
		}

		const textarea = document.getElementById(editorId);
		if (!textarea) {
			return undefined;
		}

		const initial =
			typeof valueRef.current === 'string' ? valueRef.current : '';
		textarea.value = initial;

		const onTextareaEscape = (event) => {
			if (event.key !== 'Escape' || !onEscapeRef.current) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			onEscapeRef.current();
		};

		const onQuickTagsInput = () => {
			if (suppressChangeRef.current || disabledRef.current) {
				return;
			}
			const ta = document.getElementById(editorId);
			if (ta) {
				onChangeRef.current(ta.value);
			}
		};

		textarea.addEventListener('input', onQuickTagsInput);
		textarea.addEventListener('keydown', onTextareaEscape);

		const extraOptions = { ...tinymceOptionsRef.current };
		const parentSetup =
			typeof extraOptions.setup === 'function'
				? extraOptions.setup
				: null;
		delete extraOptions.setup;

		window.wp.oldEditor.initialize(editorId, {
				tinymce: {
					...TINYMCE_OPTIONS,
					...extraOptions,
					auto_focus: false,
					setup: (editor) => {
						parentSetup?.(editor);
						editor.on('init', () => {
							const html =
								typeof valueRef.current === 'string'
									? valueRef.current
									: '';
							setEditorContentSilently(editor, html);
							if (disabledRef.current) {
								setTinyMceReadOnly(editor, true);
							}
							if (autoFocusOnInitRef.current) {
								scheduleOnNextTick(() => {
									try {
										editor.focus();
									} catch {
										// Non-fatal when the iframe is not ready yet.
									}
									onAfterInitRef.current?.();
								});
							} else if (preventInitFocusRef.current) {
								scheduleOnNextTick(() => {
									blurTinyMceEditor(editor);
									onAfterInitRef.current?.();
								});
							}
						});
						editor.on('change keyup paste input NodeChange', () => {
							if (
								suppressChangeRef.current ||
								disabledRef.current
							) {
								return;
							}
							onChangeRef.current(editor.getContent());
						});
						editor.on('keydown', (event) => {
							if (
								event.key !== 'Escape' ||
								!onEscapeRef.current
							) {
								return;
							}
							event.preventDefault();
							event.stopPropagation();
							onEscapeRef.current();
						});
					},
				},
				// Quicktags assumes a visible editor canvas; TabPanel keeps inactive tabs hidden, which
				// breaks QTags._init (undefined 'canvas'). Visual mode (TinyMCE) is enough for captions here.
				quicktags: false,
				mediaButtons: false,
			});

		return () => {
			textarea.removeEventListener('input', onQuickTagsInput);
			textarea.removeEventListener('keydown', onTextareaEscape);
			if (window.wp?.oldEditor) {
				window.wp.oldEditor.remove(editorId);
			}
		};
	}, [editorId, tinymceOptionsKey]);

	useEffect(() => {
		const ed = window.tinymce?.get(editorId);
		if (!ed || ed.removed) {
			const ta = document.getElementById(editorId);
			const next = typeof value === 'string' ? value : '';
			if (ta && ta.value !== next) {
				suppressChangeRef.current = true;
				ta.value = next;
				scheduleReleaseEditorChangeSuppress(() => {
					suppressChangeRef.current = false;
				});
			}
			return;
		}
		const next = typeof value === 'string' ? value : '';
		if (ed.getContent() !== next) {
			setEditorContentSilently(ed, next);
		}
		setTinyMceReadOnly(ed, disabled);
	}, [value, disabled, editorId]);

	return (
		<textarea
			id={editorId}
			className={className}
			aria-label={accessibleLabel}
			rows={rows}
			style={{ width: '100%' }}
		/>
	);
}
