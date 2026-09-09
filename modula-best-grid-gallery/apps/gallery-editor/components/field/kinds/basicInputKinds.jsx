import { __ } from '@wordpress/i18n';
import { Button, TextInput, Textarea } from 'shared-ui';
import { isNil } from '../../../logic/isNil';
import MetadataFiltersAutocompleteControl from '../MetadataFiltersAutocompleteControl';
import WatermarkActionButtonSlot from '../WatermarkActionButtonSlot';
import InstagramManagePhotosButton from '../InstagramManagePhotosButton';

/**
 * Text, number, textarea, string list, JSON object, metadata filters token field, action button.
 */

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderTextKind({ value, onChange, disabled, help }) {
	return (
		<TextInput
			value={isNil(value) ? '' : String(value)}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderMetadataFiltersAutocompleteKind({
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<MetadataFiltersAutocompleteControl
			value={isNil(value) ? '' : String(value)}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderNumberKind({ value, onChange, disabled, help }) {
	const n = isNil(value) || value === '' ? '' : Number(value);
	return (
		<TextInput
			type="number"
			value={Number.isFinite(n) ? String(n) : ''}
			onChange={(v) => {
				if (v === '') {
					onChange('');
					return;
				}
				const parsed = parseInt(v, 10);
				onChange(Number.isFinite(parsed) ? parsed : v);
			}}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}  ctx
 * @param {Object}  ctx.control
 * @param {boolean} ctx.disabled
 */
export function renderActionButtonKind({ control, disabled }) {
	const btnLabel =
		typeof control.buttonLabel === 'string' && control.buttonLabel !== ''
			? control.buttonLabel
			: __('Action', 'modula-best-grid-gallery');
	const action = typeof control.action === 'string' ? control.action : '';

	if (action === 'apply_watermark' || action === 'remove_watermark') {
		return (
			<WatermarkActionButtonSlot
				action={action}
				buttonLabel={btnLabel}
				disabled={disabled}
			/>
		);
	}

	if (action === 'instagram_manage_photos') {
		return (
			<InstagramManagePhotosButton
				buttonLabel={btnLabel}
				disabled={disabled}
			/>
		);
	}

	const hintRaw =
		typeof control.saveFirstMessage === 'string'
			? control.saveFirstMessage
			: '';
	const hint = hintRaw;
	return (
		<div className="modula-settings-editor__action-button-wrap">
			<Button
				variant="ghost"
				type="button"
				disabled={disabled}
				className="modula-settings-editor__action-button"
				data-modula-action={action || undefined}
			>
				{btnLabel}
			</Button>
			{hint ? (
				<p className="modula-settings-editor__action-button-hint">
					{hint}
				</p>
			) : null}
		</div>
	);
}

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderTextareaKind({ value, onChange, disabled, help }) {
	return (
		<Textarea
			value={isNil(value) ? '' : String(value)}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderStringListKind({ value, onChange, disabled, help }) {
	const lines = Array.isArray(value)
		? value.map((x) => String(x)).join('\n')
		: '';
	const lineHint = __('One value per line.', 'modula-best-grid-gallery');
	const listHelp = help ? `${help} ${lineHint}` : lineHint;
	return (
		<Textarea
			value={lines}
			onChange={(raw) => {
				const next = raw
					.split('\n')
					.map((s) => s.trim())
					.filter((s) => s !== '');
				onChange(next.length ? next : ['']);
			}}
			disabled={disabled}
			help={listHelp}
		/>
	);
}

/**
 * @param {Object}   ctx
 * @param {*}        ctx.value
 * @param {Function} ctx.onChange
 * @param {boolean}  ctx.disabled
 */
export function renderObjectKind({ value, onChange, disabled }) {
	let text;
	try {
		text = isNil(value) ? '' : JSON.stringify(value, null, 2);
	} catch {
		text = '';
	}
	return (
		<Textarea
			value={text}
			onChange={(raw) => {
				try {
					const parsed = JSON.parse(raw || '{}');
					onChange(parsed);
				} catch {
					onChange(raw);
				}
			}}
			disabled={disabled}
			help={__(
				'JSON object (invalid JSON is sent as-is; server may reject).',
				'modula-best-grid-gallery'
			)}
		/>
	);
}
