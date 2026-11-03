/**
 * An image's own hover effect (image edit panel, Bulk edit): "Gallery
 * default", then the Hover Effect Builder presets, locked as the gallery's
 * Hover effect row locks them.
 */
import { __ } from '@wordpress/i18n';
import { SelectMenuControl } from 'editor-shell';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { isHoverPresetLocked } from '../../utils/hoverBuilderEntitlements';
import { HOVER_BUILDER_PRESETS } from './hoverBuilderPresets';

/**
 * @param {Record<string, unknown>} editorConfig
 * @return {import('editor-shell/fields/SelectMenuControl').SelectMenuOption[]} Options; '' follows the gallery.
 */
function itemHoverPresetOptions(editorConfig) {
	return [
		{
			value: '',
			label: __('Gallery default', 'modula-best-grid-gallery'),
		},
		...HOVER_BUILDER_PRESETS.map((preset) => {
			const isLocked = isHoverPresetLocked(preset, editorConfig);
			return {
				value: preset.id,
				label: preset.label,
				disabled: isLocked,
				badge: isLocked
					? __('Pro', 'modula-best-grid-gallery')
					: undefined,
			};
		}),
	];
}

/**
 * @param {Object}               props
 * @param {string}               props.id
 * @param {string}               props.label    Names the menu and its button.
 * @param {string}               props.value    Preset id, or '' for the gallery's hover.
 * @param {(v: string) => void}  props.onChange
 * @param {string}               [props.className]
 */
export default function ItemHoverPresetSelect({
	id,
	label,
	value,
	onChange,
	className = '',
}) {
	const editorConfig = useModulaSettingsEditorConfig();
	return (
		<SelectMenuControl
			id={id}
			label={label}
			className={className}
			groups={[
				{
					id: 'default',
					options: itemHoverPresetOptions(editorConfig),
				},
			]}
			value={value || ''}
			onChange={onChange}
		/>
	);
}
