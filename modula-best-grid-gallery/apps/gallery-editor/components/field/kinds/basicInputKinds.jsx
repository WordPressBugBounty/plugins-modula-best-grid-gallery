import { __ } from '@wordpress/i18n';
import { Button, TextInput, Textarea } from 'admin-ui';
import { isNil } from '../../../logic/isNil';
import MetadataFiltersAutocompleteControl from '../MetadataFiltersAutocompleteControl';
import WatermarkActionButtonSlot from '../WatermarkActionButtonSlot';
import InstagramManagePhotosButton from '../InstagramManagePhotosButton';
import ProofingManagerButton from '../../proofing/ProofingManagerButton';
import { ControlHelp, describedByHelp } from './ControlHelp';

/**
 * Text, number, textarea, string list, JSON object, metadata filters token field, action button.
 */

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderTextKind({ controlId, value, onChange, disabled, help }) {
	return (
		<>
			<TextInput
				id={controlId}
				width="full"
				value={isNil(value) ? '' : String(value)}
				onChange={onChange}
				disabled={disabled}
				aria-describedby={describedByHelp(controlId, help)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderMetadataFiltersAutocompleteKind({
	controlId,
	label,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<>
			<MetadataFiltersAutocompleteControl
				id={controlId}
				label={label}
				describedBy={describedByHelp(controlId, help)}
				value={isNil(value) ? '' : String(value)}
				onChange={onChange}
				disabled={disabled}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderNumberKind({
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const n = isNil(value) || value === '' ? '' : Number(value);
	return (
		<>
			<TextInput
				id={controlId}
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
				aria-describedby={describedByHelp(controlId, help)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}

/**
 * Action buttons whose work lives elsewhere (Pro or a modal), by
 * `control.action`. Each receives the action, its label and `disabled`.
 *
 * @type {Record<string, import('react').ComponentType<{ action: string, buttonLabel: string, disabled: boolean }>>}
 */
const ACTION_BUTTONS = {
	apply_watermark: WatermarkActionButtonSlot,
	remove_watermark: WatermarkActionButtonSlot,
	instagram_manage_photos: InstagramManagePhotosButton,
	proofing_manage: ProofingManagerButton,
};

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderActionButtonKind({ control, disabled }) {
	const btnLabel =
		typeof control.buttonLabel === 'string' && control.buttonLabel !== ''
			? control.buttonLabel
			: __('Action', 'modula-best-grid-gallery');
	const action = typeof control.action === 'string' ? control.action : '';
	if (Object.prototype.hasOwnProperty.call(ACTION_BUTTONS, action)) {
		const ActionButton = ACTION_BUTTONS[action];
		return (
			<ActionButton
				action={action}
				buttonLabel={btnLabel}
				disabled={disabled}
			/>
		);
	}
	const hint =
		typeof control.saveFirstMessage === 'string'
			? control.saveFirstMessage
			: '';
	return (
		<div className="modula-settings-editor__action-button-wrap">
			<Button
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
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderTextareaKind({
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<>
			<Textarea
				id={controlId}
				value={isNil(value) ? '' : String(value)}
				onChange={onChange}
				disabled={disabled}
				aria-describedby={describedByHelp(controlId, help)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderStringListKind({
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const lines = Array.isArray(value)
		? value.map((x) => String(x)).join('\n')
		: '';
	const lineHint = __('One value per line.', 'modula-best-grid-gallery');
	const listHelp = help ? `${help} ${lineHint}` : lineHint;
	return (
		<>
			<Textarea
				id={controlId}
				value={lines}
				onChange={(raw) => {
					const next = raw
						.split('\n')
						.map((s) => s.trim())
						.filter((s) => s !== '');
					onChange(next.length ? next : ['']);
				}}
				disabled={disabled}
				aria-describedby={describedByHelp(controlId, listHelp)}
			/>
			<ControlHelp help={listHelp} controlId={controlId} />
		</>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderObjectKind({ controlId, value, onChange, disabled }) {
	let text;
	try {
		text = isNil(value) ? '' : JSON.stringify(value, null, 2);
	} catch {
		text = '';
	}
	const objectHelp = __(
		'JSON object (invalid JSON is sent as-is; server may reject).',
		'modula-best-grid-gallery'
	);
	return (
		<>
			<Textarea
				id={controlId}
				className="modula-settings-editor__code-textarea"
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
				aria-describedby={describedByHelp(controlId, objectHelp)}
			/>
			<ControlHelp help={objectHelp} controlId={controlId} />
		</>
	);
}
