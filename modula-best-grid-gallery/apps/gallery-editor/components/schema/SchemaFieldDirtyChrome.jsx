/**
 * A setting's label line plus its reset dot: the dot marks a value that
 * differs from the default and turns into a cross that resets it.
 */
import { __, sprintf } from '@wordpress/i18n';
import { ResetButton } from 'admin-ui';

/**
 * @param {string}  [label]
 * @param {boolean} [withDependents] The reset also covers the settings under the field.
 * @return {string} Reset button name.
 */
function resetLabel(label, withDependents) {
	if (typeof label !== 'string' || label.trim() === '') {
		return __('Reset to default', 'modula-best-grid-gallery');
	}
	if (withDependents) {
		return sprintf(
			/* translators: %s: setting name, e.g. "Enable download". */
			__('Reset %s settings to defaults', 'modula-best-grid-gallery'),
			label.trim()
		);
	}

	return sprintf(
		/* translators: %s: setting name, e.g. "Gutter". */
		__('Reset %s to default', 'modula-best-grid-gallery'),
		label.trim()
	);
}

/**
 * @param {Object}                    props
 * @param {boolean}                   props.dirty
 * @param {Function}                  props.onReset
 * @param {string}                    [props.label]          Setting name, for the reset button's name.
 * @param {boolean}                   [props.withDependents] The reset also covers the settings under the field (headless box).
 * @param {import('react').ReactNode} props.children         Label + optional help tip
 */
export default function SchemaFieldDirtyChrome({
	dirty,
	onReset,
	label,
	withDependents = false,
	children,
}) {
	const showReset = dirty && typeof onReset === 'function';

	return (
		<>
			{children}
			{showReset ? (
				<ResetButton
					className="modula-settings-editor__field-reset"
					label={resetLabel(label, withDependents)}
					onReset={onReset}
				/>
			) : null}
		</>
	);
}
