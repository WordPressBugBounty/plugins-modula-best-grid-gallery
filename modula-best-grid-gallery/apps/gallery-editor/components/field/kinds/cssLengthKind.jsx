import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Segmented, TextInput, UnitInput } from 'admin-ui';
import {
	CSS_LENGTH_TOGGLE_UNITS,
	cssLengthDisplayUnit,
	formatCssLength,
	isCssLengthNumberDraft,
	isCssLengthToggleUnit,
	parseCssLength,
	switchCssLengthUnit,
} from '../cssLength';
import { renderTextKind } from './basicInputKinds';
import { ControlHelp, describedByHelp } from './ControlHelp';

const TOGGLE_OPTIONS = CSS_LENGTH_TOGGLE_UNITS.map((unit) => ({
	value: unit,
	label: unit,
}));

/**
 * A CSS length (Gallery width): the number with a px / % toggle. A width
 * stored in another unit (em, rem, vw, vh) shows it as fixed text, so the
 * number is edited and the unit kept.
 *
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderCssLengthKind(ctx) {
	return <CssLengthField ctx={ctx} />;
}

/**
 * A stored value the box cannot read ("auto", "calc(…)") keeps the plain
 * text field for as long as the field is shown, so nothing is lost and the
 * field does not swap controls while the user types.
 *
 * @param {Object}                                             props
 * @param {import('../fieldControlKinds').FieldControlContext} props.ctx
 */
function CssLengthField({ ctx }) {
	const { controlId, label, value, onChange, disabled, help } = ctx;
	const [isFreeText] = useState(() => parseCssLength(value) === null);
	const parts = parseCssLength(value);
	// Free text never shows a unit, so it needs no starting one.
	const [lastShownUnit, setLastShownUnit] = useState(parts?.unit);

	if (isFreeText || !parts) {
		return renderTextKind(ctx);
	}

	const unit = cssLengthDisplayUnit(parts, lastShownUnit);
	const numberProps = {
		id: controlId,
		className: 'modula-settings-editor__css-length',
		value: parts.number,
		onChange: (number) => {
			if (isCssLengthNumberDraft(number)) {
				setLastShownUnit(unit);
				onChange(formatCssLength(number, unit));
			}
		},
		disabled,
		'aria-describedby': describedByHelp(controlId, help),
	};

	return (
		<>
			{isCssLengthToggleUnit(unit) ? (
				<div className="modula-settings-editor__css-length-toggle">
					<TextInput {...numberProps} inputMode="decimal" />
					<Segmented
						aria-label={sprintf(
							/* translators: %s: setting name, such as "Gallery width". */
							__('%s unit', 'modula-best-grid-gallery'),
							label
						)}
						options={TOGGLE_OPTIONS}
						value={unit}
						onChange={(nextUnit) => {
							setLastShownUnit(nextUnit);
							// An empty width stores no unit; the next typed number takes it.
							if (parts.number !== '') {
								onChange(switchCssLengthUnit(parts, nextUnit));
							}
						}}
						disabled={disabled}
					/>
				</div>
			) : (
				<UnitInput {...numberProps} unit={unit} />
			)}
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}
