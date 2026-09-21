/**
 * Interact → On Hover: Zoom on hover projects Hover card treatment `zoom`.
 */

import { __ } from '@wordpress/i18n';
import { Switch } from 'shared-ui';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import {
	isZoomOnHoverEnabled,
	nextCardTreatmentForZoomOnHoverToggle,
} from '../../logic/zoomOnHoverToggle';

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
 * Hub / panel toggle for Zoom on hover (no persisted boolean — writes cardTreatment).
 *
 * @param {Object}  props
 * @param {boolean} [props.disabled]
 */
export default function ZoomOnHoverHubToggle({ disabled = false }) {
	const { form } = useGallerySettingsFormBundle();
	const switchId = 'modula-field-hover-zoom-on-hover';

	return (
		<form.Subscribe
			selector={(state) =>
				readCardTreatment(state.values?.hover?.builder)
			}
		>
			{(cardTreatment) => {
				const checked = isZoomOnHoverEnabled(cardTreatment);
				return (
					<div className="modula-settings-editor__field-row modula-settings-editor__field-row--toggle">
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
							<Switch
								id={switchId}
								checked={checked}
								disabled={disabled}
								showStatus
								onChange={(next) => {
									const builder =
										form.getFieldValue(BUILDER_PATH);
									const current = readCardTreatment(builder);
									const nextTreatment =
										nextCardTreatmentForZoomOnHoverToggle(
											current,
											Boolean(next)
										);
									const base =
										builder && typeof builder === 'object'
											? builder
											: {};
									form.setFieldValue(BUILDER_PATH, {
										...base,
										[CARD_TREATMENT_KEY]: nextTreatment,
									});
								}}
							/>
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
