import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { TextareaControl } from '@wordpress/components';
import { Button } from 'shared-ui';
import { isNil } from '../../../logic/isNil';
import ImageMetadataAiSparkleIcon from '../../image-metadata-modal/ImageMetadataAiSparkleIcon';
import CustomCssAiModal from '../../custom-css-ai/CustomCssAiModal';

/**
 * Custom CSS textarea with AI assist button.
 *
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderCustomCssTextareaKind({
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<CustomCssTextareaField
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}           props
 * @param {*}                props.value
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
function CustomCssTextareaField({ value, onChange, disabled, help }) {
	const [aiOpen, setAiOpen] = useState(false);
	const cssValue = isNil(value) ? '' : String(value);

	return (
		<div className="modula-custom-css-field">
			<TextareaControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				value={cssValue}
				onChange={onChange}
				disabled={disabled}
				rows={8}
				className="modula-custom-css-field__textarea"
				hideLabelFromVision
				label={__('Custom CSS', 'modula-best-grid-gallery')}
			/>
			<div className="modula-custom-css-field__toolbar">
				<Button
					variant="panel"
					disabled={disabled}
					onClick={() => setAiOpen(true)}
					className="modula-custom-css-field__ai-btn"
				>
					<ImageMetadataAiSparkleIcon />
					{__(
						'Describe the change instead',
						'modula-best-grid-gallery'
					)}
				</Button>
			</div>
			{help ? (
				<p className="modula-custom-css-field__help">{help}</p>
			) : null}
			<CustomCssAiModal
				isOpen={aiOpen}
				onClose={() => setAiOpen(false)}
				currentCss={cssValue}
				onApply={onChange}
			/>
		</div>
	);
}
