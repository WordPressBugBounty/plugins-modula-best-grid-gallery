import { useEffect } from '@wordpress/element';
import { Notice, TextInput } from 'admin-ui';
import { isNil } from '../../../logic/isNil';
import {
	describeUnknownFieldKind,
	unknownFieldKindPresentation,
} from '../unknownFieldKind';
import { ControlHelp, describedByHelp } from './ControlHelp';

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderUnknownKind(ctx) {
	return <UnknownFieldKind {...ctx} />;
}

/**
 * A kind with no renderer: the error in development, the plain text field
 * production has always shown (see `unknownFieldKind.js`).
 *
 * @param {import('../fieldControlKinds').FieldControlContext} props
 */
function UnknownFieldKind({
	field,
	kind,
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const message = describeUnknownFieldKind(kind, field?.groupedPath ?? '');
	const presentation = unknownFieldKindPresentation();

	useEffect(() => {
		if (presentation !== 'error') {
			return;
		}
		// The console is where a developer looks for it; development builds only.
		// eslint-disable-next-line no-console
		console.error(`[modula] ${message}`);
	}, [presentation, message]);

	if (presentation === 'error') {
		return (
			<Notice tone="error" role="alert">
				{message}
			</Notice>
		);
	}

	let text = '';
	if (!isNil(value)) {
		text =
			typeof value === 'object' ? JSON.stringify(value) : String(value);
	}

	return (
		<>
			<TextInput
				id={controlId}
				width="full"
				value={text}
				onChange={onChange}
				disabled={disabled}
				aria-describedby={describedByHelp(controlId, help)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}
