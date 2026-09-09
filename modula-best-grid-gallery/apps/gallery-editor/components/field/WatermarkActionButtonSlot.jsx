/**
 * Renders Pro-registered watermark action button (or nothing until registered).
 */
import { useWatermarkRegistration } from '../../hooks/useWatermarkRegistration';

/**
 * @param {{
 *   action: 'apply_watermark' | 'remove_watermark',
 *   buttonLabel: string,
 *   disabled?: boolean,
 *   imageId?: number,
 *   imageIds?: number[],
 *   mini?: boolean,
 * }} props
 */
export default function WatermarkActionButtonSlot({
	action,
	buttonLabel,
	disabled = false,
	imageId,
	imageIds,
	mini = false,
}) {
	const registration = useWatermarkRegistration();
	const ActionButton = registration?.ActionButton;
	if (!ActionButton) {
		return null;
	}
	return (
		<ActionButton
			action={action}
			buttonLabel={buttonLabel}
			disabled={disabled}
			imageId={imageId}
			imageIds={imageIds}
			mini={mini}
		/>
	);
}
