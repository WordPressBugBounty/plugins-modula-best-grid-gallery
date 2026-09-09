/**
 * Zip / pattern field with insertable %%token%% chips and a live .zip preview.
 */

import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { TextInput } from 'shared-ui';
import { isNil } from '../../logic/isNil';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';

/**
 * @param {string} raw
 * @return {string}
 */
function sanitizeZipPreviewBase(raw) {
	const cleaned = String(raw || '')
		.trim()
		.replace(/[\\/]+/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	return cleaned || 'gallery';
}

/**
 * @param {Array<{ token?: string, label?: string, sample?: string }>} tokens
 * @param {string} pattern
 * @param {Record<string, string>} samples
 * @return {string}
 */
function resolveZipPreview(tokens, pattern, samples) {
	let out = String(pattern || '');
	for (const t of tokens) {
		const token = typeof t?.token === 'string' ? t.token : '';
		if (!token) {
			continue;
		}
		const sample =
			(typeof t.sample === 'string' && t.sample.trim() !== ''
				? t.sample.trim()
				: samples[token]) || token.replace(/%/g, '');
		out = out.split(token).join(sample);
	}
	return `${sanitizeZipPreviewBase(out)}.zip`;
}

/**
 * @param {Object}           props
 * @param {Object}           props.control
 * @param {*}                props.value
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
export default function PlaceholderPatternControl({
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const editor = useModulaSettingsEditorConfig();
	const galleryId = Number(editor?.galleryId) || 0;
	const postTitle = useSelect((select) => {
		try {
			const title =
				select('core/editor')?.getEditedPostAttribute?.('title');
			return typeof title === 'string' ? title.trim() : '';
		} catch {
			return '';
		}
	}, []);

	const tokens = Array.isArray(control?.tokens) ? control.tokens : [];
	const displayValue = isNil(value) ? '' : String(value);
	const titleSlug = sanitizeZipPreviewBase(
		postTitle || __('gallery', 'modula-best-grid-gallery')
	);
	const today = new Date().toISOString().slice(0, 10);
	const samples = {
		'%%gallery_title%%': titleSlug,
		'%%gallery_date%%': today,
		'%%gallery_id%%': String(galleryId || '0'),
		'%%gallery_author%%': __('author', 'modula-best-grid-gallery'),
		'%%archive_generated_time%%': today,
	};
	const previewName = resolveZipPreview(tokens, displayValue, samples);
	const helpText =
		typeof help === 'string' && help.trim() !== ''
			? help.trim()
			: __(
					'Type anything you like between the tokens — dashes, underscores, plain words.',
					'modula-best-grid-gallery'
				);

	/**
	 * @param {string} token
	 */
	function insertToken(token) {
		if (disabled || !token) {
			return;
		}
		onChange(`${displayValue}${token}`);
	}

	return (
		<div className="modula-settings-editor__placeholder-pattern">
			<TextInput
				value={displayValue}
				onChange={onChange}
				disabled={disabled}
			/>
			{tokens.length > 0 ? (
				<div
					className="modula-settings-editor__placeholder-pattern-tokens"
					role="group"
					aria-label={__(
						'Insert placeholder',
						'modula-best-grid-gallery'
					)}
				>
					{tokens.map((t) => {
						const token =
							typeof t?.token === 'string' ? t.token : '';
						const label =
							typeof t?.label === 'string' &&
							t.label.trim() !== ''
								? t.label.trim()
								: token.replace(/%/g, '');
						if (!token) {
							return null;
						}
						return (
							<button
								key={token}
								type="button"
								className="modula-settings-editor__placeholder-pattern-token"
								disabled={disabled}
								onClick={() => insertToken(token)}
							>
								{`+ ${label}`}
							</button>
						);
					})}
				</div>
			) : null}
			<div
				className="modula-settings-editor__placeholder-pattern-preview"
				aria-live="polite"
			>
				<span className="modula-settings-editor__placeholder-pattern-preview-name">
					{previewName}
				</span>
			</div>
			{helpText ? (
				<p className="modula-settings-editor__placeholder-pattern-help">
					{helpText}
				</p>
			) : null}
		</div>
	);
}
