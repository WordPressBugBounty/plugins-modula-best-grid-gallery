import {
	useEffect,
	useRef,
	useId,
	useState,
	useCallback,
} from '@wordpress/element';
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './CodeEditorField.module.scss';

/**
 * Extract inner HTML of <body>, or return the full string if no body tag.
 *
 * @param {string} html Full HTML document or fragment.
 * @return {string}
 */
function extractBodyInner(html) {
	const match = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i);
	return match ? match[1].trim() : String(html || '');
}

/**
 * Replace <body> contents while preserving the document shell.
 *
 * @param {string} fullHtml Full HTML document (or fragment).
 * @param {string} inner    New body inner HTML.
 * @return {string}
 */
function wrapInDocument(fullHtml, inner) {
	const source = String(fullHtml || '');
	if (/<body[^>]*>/i.test(source)) {
		return source.replace(
			/(<body[^>]*>)[\s\S]*(<\/body>)/i,
			`$1\n${inner}\n$2`
		);
	}
	return inner;
}

/**
 * HTML editor with Visual (TinyMCE) / Code (CodeMirror) toggle.
 *
 * @param {Object}   props
 * @param {Object}   props.fieldState
 * @param {Object}   props.field
 * @param {Function} props.handleChange
 */
export default function CodeEditorField({ fieldState, field, handleChange }) {
	const [viewMode, setViewMode] = useState(
		field.defaultView || (field.wysiwyg === false ? 'code' : 'visual')
	);
	const textareaRef = useRef(null);
	const codeEditorRef = useRef(null);
	const handleChangeRef = useRef(handleChange);
	const documentShellRef = useRef(fieldState.state.value || '');
	const reactId = useId().replace(/:/g, '');
	const textareaId = `modula-html-editor-${String(field.name || 'field').replace(/\./g, '-')}-${reactId}`;
	const enableWysiwyg = field.wysiwyg !== false;

	handleChangeRef.current = handleChange;

	const emitChange = useCallback((nextValue) => {
		documentShellRef.current = nextValue;
		handleChangeRef.current(nextValue);
	}, []);

	const destroyCodeEditor = useCallback(() => {
		if (codeEditorRef.current?.codemirror) {
			codeEditorRef.current.codemirror.toTextArea();
			codeEditorRef.current = null;
		}
	}, []);

	const destroyVisualEditor = useCallback(() => {
		if (window.wp?.editor?.remove) {
			window.wp.editor.remove(textareaId);
		}
	}, [textareaId]);

	const getVisualContent = useCallback(() => {
		if (window.tinymce) {
			const editor = window.tinymce.get(textareaId);
			if (editor) {
				return editor.getContent({ format: 'raw' });
			}
		}
		const textarea = document.getElementById(textareaId);
		return textarea
			? textarea.value
			: extractBodyInner(documentShellRef.current);
	}, [textareaId]);

	const getCodeContent = useCallback(() => {
		if (codeEditorRef.current?.codemirror) {
			return codeEditorRef.current.codemirror.getValue();
		}
		const textarea = textareaRef.current;
		return textarea ? textarea.value : documentShellRef.current;
	}, []);

	// Initialize the active editor when view mode changes.
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return undefined;
		}

		let changeHandler = null;
		let refreshTimer = null;

		if (
			viewMode === 'visual' &&
			enableWysiwyg &&
			window.wp?.editor?.initialize
		) {
			const shell =
				documentShellRef.current || fieldState.state.value || '';
			documentShellRef.current = shell;
			const bodyInner = extractBodyInner(shell);
			textarea.value = bodyInner;

			window.wp.editor.initialize(textareaId, {
				tinymce: {
					wpautop: false,
					forced_root_block: 'p',
					height: field.height || 320,
					toolbar1:
						field.toolbar ||
						'formatselect,bold,italic,underline,bullist,numlist,blockquote,alignleft,aligncenter,alignright,link,unlink,forecolor,undo,redo',
					setup(editor) {
						editor.on('change keyup SetContent', () => {
							const inner = editor.getContent({ format: 'raw' });
							emitChange(
								wrapInDocument(documentShellRef.current, inner)
							);
						});
					},
				},
				quicktags: false,
				mediaButtons: field.mediaButtons !== false,
			});

			refreshTimer = window.setTimeout(() => {
				const editor = window.tinymce?.get(textareaId);
				if (
					editor &&
					editor.getContent({ format: 'raw' }) !== bodyInner
				) {
					editor.setContent(bodyInner);
				}
			}, 100);

			return () => {
				window.clearTimeout(refreshTimer);
				destroyVisualEditor();
			};
		}

		// Code mode (CodeMirror), or fallback when TinyMCE is unavailable.
		destroyVisualEditor();
		textarea.value =
			documentShellRef.current || fieldState.state.value || '';

		if (window.wp?.codeEditor?.initialize) {
			const settings = window.wp.codeEditor.defaultSettings
				? { ...window.wp.codeEditor.defaultSettings }
				: {};

			settings.codemirror = {
				...(settings.codemirror || {}),
				mode: field.mode || 'htmlmixed',
				lineNumbers: true,
				lineWrapping: true,
				indentUnit: 2,
				tabSize: 2,
			};

			const editor = window.wp.codeEditor.initialize(textarea, settings);
			codeEditorRef.current = editor;

			changeHandler = () => {
				emitChange(editor.codemirror.getValue());
			};
			editor.codemirror.on('change', changeHandler);

			refreshTimer = window.setTimeout(() => {
				editor.codemirror.refresh();
			}, 50);

			return () => {
				window.clearTimeout(refreshTimer);
				if (codeEditorRef.current?.codemirror && changeHandler) {
					codeEditorRef.current.codemirror.off(
						'change',
						changeHandler
					);
				}
				destroyCodeEditor();
			};
		}

		return () => {
			destroyCodeEditor();
			destroyVisualEditor();
		};
		// Re-init when switching Visual/Code.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [viewMode, textareaId, enableWysiwyg, field.mode, field.name]);

	const switchMode = (nextMode) => {
		if (!nextMode || nextMode === viewMode) {
			return;
		}

		if (viewMode === 'visual') {
			const inner = getVisualContent();
			documentShellRef.current = wrapInDocument(
				documentShellRef.current,
				inner
			);
			emitChange(documentShellRef.current);
			destroyVisualEditor();
		} else {
			documentShellRef.current = getCodeContent();
			emitChange(documentShellRef.current);
			destroyCodeEditor();
		}

		setViewMode(nextMode);
	};

	const onTextareaChange = (event) => {
		if (viewMode === 'code' && !codeEditorRef.current) {
			emitChange(event.target.value);
		}
	};

	return (
		<div className={styles.codeEditor}>
			<div className={styles.header}>
				{field.label && field.label.trim() !== '' && (
					<span className="modula_input_label" htmlFor={textareaId}>
						{field.label}
					</span>
				)}
				{enableWysiwyg && (
					<ToggleGroupControl
						className={styles.modeToggle}
						label={__('Editor mode', 'modula-best-grid-gallery')}
						hideLabelFromVision
						value={viewMode}
						onChange={switchMode}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="visual"
							label={__('Visual', 'modula-best-grid-gallery')}
						/>
						<ToggleGroupControlOption
							value="code"
							label={__('Code', 'modula-best-grid-gallery')}
						/>
					</ToggleGroupControl>
				)}
			</div>
			<textarea
				ref={textareaRef}
				id={textareaId}
				className={`modula_code_editor_textarea ${styles.textarea}`}
				defaultValue={
					viewMode === 'visual'
						? extractBodyInner(fieldState.state.value || '')
						: fieldState.state.value || ''
				}
				onChange={onTextareaChange}
				rows={field.rows || 16}
			/>
			{field.description && (
				<p
					className="modula_input_description"
					dangerouslySetInnerHTML={{ __html: field.description }}
				/>
			)}
		</div>
	);
}
