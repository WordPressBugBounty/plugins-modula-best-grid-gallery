import { __ } from '@wordpress/i18n';
import { Flex, FlexItem, TextControl } from '@wordpress/components';
import { isNil } from '../../../logic/isNil';

/**
 * @param {Object}   ctx
 * @param {Object}   ctx.control
 * @param {*}        ctx.value
 * @param {Function} ctx.onChange
 * @param {boolean}  ctx.disabled
 */
export function renderDimensionsKind({ control, value, onChange, disabled }) {
	const fieldMin = Number.isFinite(control.fieldMin) ? control.fieldMin : null;
	const fieldMax = Number.isFinite(control.fieldMax) ? control.fieldMax : null;
	const fields = Array.isArray(control.fields)
		? control.fields
		: ['width', 'height'];
	const obj =
		value && typeof value === 'object' && !Array.isArray(value)
			? value
			: {};
	const dimLabel = (dk) => {
		if (dk === 'width') {
			return __('Width', 'modula-best-grid-gallery');
		}
		if (dk === 'height') {
			return __('Height', 'modula-best-grid-gallery');
		}
		return dk;
	};
	return (
		<Flex
			gap={3}
			justify="flex-start"
			className="modula-settings-editor__dimensions-flex"
		>
			{fields.map((dk) => (
				<FlexItem key={dk}>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={dimLabel(dk)}
						type="number"
						min={fieldMin !== null ? fieldMin : undefined}
						max={fieldMax !== null ? fieldMax : undefined}
						value={
							isNil(obj[dk]) || obj[dk] === ''
								? ''
								: String(obj[dk])
						}
						disabled={disabled}
						onChange={(v) => {
							if (fieldMin !== null && fieldMax !== null) {
								if (v === '') {
									onChange({ ...obj, [dk]: '' });
									return;
								}
								const parsed = parseInt(v, 10);
								const n = Number.isFinite(parsed)
									? Math.min(fieldMax, Math.max(fieldMin, parsed))
									: fieldMin;
								onChange({ ...obj, [dk]: n });
								return;
							}
							const parsed = v === '' ? '' : parseInt(v, 10);
							onChange({
								...obj,
								[dk]: Number.isFinite(parsed) ? parsed : 0,
							});
						}}
					/>
				</FlexItem>
			))}
		</Flex>
	);
}
