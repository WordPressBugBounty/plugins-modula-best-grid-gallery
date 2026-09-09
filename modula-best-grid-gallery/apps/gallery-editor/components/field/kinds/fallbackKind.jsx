import { __, sprintf } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';
import { isNil } from '../../../logic/isNil';

/**
 * @param {Object}           ctx
 * @param {string}           ctx.kind
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderFallbackKind({ kind, value, onChange, disabled, help }) {
	let fallbackDisplay = '';
	if (!isNil(value)) {
		fallbackDisplay =
			typeof value === 'object' ? JSON.stringify(value) : String(value);
	}
	return (
		<TextControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			value={fallbackDisplay}
			onChange={onChange}
			disabled={disabled}
			help={
				help ||
				sprintf(
					/* translators: %s: control kind */
					__(
						'Fallback text control (kind: %s).',
						'modula-best-grid-gallery'
					),
					kind
				)
			}
		/>
	);
}
