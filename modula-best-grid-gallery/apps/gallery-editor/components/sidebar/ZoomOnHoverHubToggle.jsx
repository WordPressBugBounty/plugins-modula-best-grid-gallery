/**
 * Motion → Cursor and zoom: Zoom on hover projects the card treatment `zoom`
 * of the hover that plays (the Motion hover choice's preset, or the own
 * builder).
 */

import { __ } from '@wordpress/i18n';
import { Toggle } from 'admin-ui';
import { AdminUiScope, FIELD_ROW_LAYOUTS } from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import {
	isZoomOnHoverEnabled,
	nextCardTreatmentForZoomOnHoverToggle,
} from '../../logic/zoomOnHoverToggle';
import {
	hoverBuilderToPlay,
	hoverBuilderWithCardTreatment,
} from '../../logic/motionChoice';

const BUILDER_PATH = 'hover.builder';
const CARD_TREATMENT_KEY = 'cardTreatment';

/**
 * @param {unknown} builder
 * @return {unknown}
 */
function readCardTreatment(builder) {
	if (!builder || typeof builder !== 'object') {
		return 'none';
	}
	const treatment = builder[CARD_TREATMENT_KEY];
	return typeof treatment === 'string' && treatment !== ''
		? treatment
		: 'none';
}

/**
 * @param {Object|undefined} values Grouped form values.
 * @return {{ choice: string, builder: unknown, galleryType: string }} What decides the hover that plays.
 */
function readHoverInputs(values) {
	return {
		choice: String(values?.motion?.hover ?? ''),
		builder: values?.hover?.builder,
		galleryType: String(values?.general?.type ?? ''),
	};
}

/**
 * @param {Object|undefined} values Grouped form values.
 * @return {unknown} Card treatment of the hover that plays.
 */
function readPlayedCardTreatment(values) {
	const { choice, builder, galleryType } = readHoverInputs(values);
	return readCardTreatment(hoverBuilderToPlay(choice, builder, galleryType));
}

/**
 * Hub / panel toggle for Zoom on hover (no persisted boolean — writes cardTreatment).
 *
 * @param {Object}  props
 * @param {boolean} [props.disabled]
 */
export default function ZoomOnHoverHubToggle({ disabled = false }) {
	const { form } = useGallerySettingsFormBundle();
	const switchId = 'modula-field-hover-zoom-on-hover';

	const writeZoomOnHover = (on) => {
		const values = form.state.values;
		const { choice, builder, galleryType } = readHoverInputs(values);
		form.setFieldValue(
			BUILDER_PATH,
			hoverBuilderWithCardTreatment(
				choice,
				builder,
				galleryType,
				nextCardTreatmentForZoomOnHoverToggle(
					readPlayedCardTreatment(values),
					on
				)
			)
		);
	};

	return (
		<AdminUiScope>
			<form.Subscribe
				selector={(state) => readPlayedCardTreatment(state.values)}
			>
				{(cardTreatment) => (
					// The panel's toggle row (as SchemaFieldRow draws one).
					<div
						className={`modula-settings-editor__field-row modula-settings-editor__field-row--stacked modula-settings-editor__field-row--layout-${FIELD_ROW_LAYOUTS.toggle} modula-settings-editor__field-row--toggle`}
					>
						<div className="modula-settings-editor__field-label-col">
							<label
								className="modula-settings-editor__field-label"
								htmlFor={switchId}
							>
								{__(
									'Zoom on hover',
									'modula-best-grid-gallery'
								)}
							</label>
						</div>
						<div className="modula-settings-editor__field-control-col modula-settings-editor__field-control-col--toggle-inline">
							<Toggle
								id={switchId}
								checked={isZoomOnHoverEnabled(cardTreatment)}
								disabled={disabled}
								onChange={writeZoomOnHover}
							/>
						</div>
					</div>
				)}
			</form.Subscribe>
		</AdminUiScope>
	);
}
