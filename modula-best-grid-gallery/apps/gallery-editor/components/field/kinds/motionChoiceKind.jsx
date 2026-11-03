/**
 * The Motion tab's Entrance and Hover menus (`motion.entrance`,
 * `motion.hover`): editor-shell's Motion picker with the catalog's choices
 * for the gallery type, the recommendation first. The Entrance menu's replay
 * button and its peek play on the canvas (`useGalleryEntrance` in the
 * preview).
 */
import { __, sprintf } from '@wordpress/i18n';
import { MotionChoicePicker } from 'editor-shell';
import { requestEntranceReplay } from 'gallery-shared/preview';
import { getMotionChoiceLabel } from '../../../data/animationCatalog';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import {
	entranceToReplay,
	getMotionChoiceOptions,
} from '../../../logic/motionChoice';
import { ControlHelp, describedByHelp } from './ControlHelp';

/**
 * @param {string} choice      Stored `motion.entrance`.
 * @param {string} galleryType `general.type`.
 * @return {import('editor-shell/fields/MotionChoicePicker').MotionChoicePickerReplay|null} The replay button, while the choice animates.
 */
function entranceReplay(choice, galleryType) {
	const replayable = entranceToReplay(choice, galleryType);
	if (replayable === '') {
		return null;
	}
	const label = sprintf(
		/* translators: %s: name of the entrance animation. */
		__('Replay %s', 'modula-best-grid-gallery'),
		getMotionChoiceLabel('entrance', replayable)
	);
	return { label, onReplay: () => requestEntranceReplay() };
}

/**
 * The menu of a Motion kind (`control.motionKind`). The Hover menu has no
 * Customize for now (maintainer, Motion ticket 05): the hover builder stays,
 * unreachable from the Motion tab, and a gallery on its own effect keeps
 * showing Custom. A new Entrance choice plays by itself
 * (`useGalleryEntrance` in the preview).
 *
 * @param {Object}           props
 * @param {Object}           props.control     `field.control` (`motionKind`: `entrance` or `hover`).
 * @param {string}           props.controlId
 * @param {string}           props.label
 * @param {string}           props.value       Stored choice.
 * @param {string}           props.galleryType `general.type`.
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
function MotionChoiceMenu({
	control,
	controlId,
	label,
	value,
	galleryType,
	onChange,
	disabled,
	help,
}) {
	const editor = useModulaSettingsEditorConfig();
	const isEntrance = control.motionKind === 'entrance';

	return (
		<>
			<MotionChoicePicker
				id={controlId}
				label={label}
				value={value}
				options={getMotionChoiceOptions(control.motionKind, {
					value,
					galleryType,
					editor,
				})}
				onChange={onChange}
				disabled={disabled}
				describedBy={describedByHelp(controlId, help)}
				replay={isEntrance ? entranceReplay(value, galleryType) : null}
				onPeek={isEntrance ? requestEntranceReplay : undefined}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}

/** The Motion kinds that have a menu; an unknown kind renders nothing. */
const MOTION_KINDS = ['entrance', 'hover'];

/**
 * @param {Object} props See `MotionChoiceMenu`, without `galleryType`.
 */
function MotionChoiceKind(props) {
	const { form } = useGallerySettingsFormBundle();
	if (!MOTION_KINDS.includes(props.control.motionKind)) {
		return null;
	}
	return (
		<form.Subscribe selector={(s) => String(s.values.general?.type ?? '')}>
			{(galleryType) => (
				<MotionChoiceMenu
					{...props}
					value={String(props.value ?? '')}
					galleryType={galleryType}
				/>
			)}
		</form.Subscribe>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderMotionChoiceKind({
	control,
	controlId,
	label,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<MotionChoiceKind
			control={control}
			controlId={controlId}
			label={label}
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}
