/**
 * Synced select for `filters.defaultActiveFilter` vs live `filters.filters`
 * rows: editor-shell's default filter menu, fed from the gallery form.
 */

import { DefaultActiveFilterSelect } from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { ControlHelp, describedByHelp } from './kinds/ControlHelp';

/**
 * @param {Object}   props
 * @param {string}   [props.id]
 * @param {string}   props.label    Setting name; names the menu.
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.help]
 */
export default function DefaultActiveFilterSelectControl({
	id,
	label,
	value,
	onChange,
	disabled,
	help,
}) {
	const { form } = useGallerySettingsFormBundle();
	return (
		<form.Subscribe
			selector={(s) => {
				const list = s.values.filters?.filters;
				return {
					list,
					// Ensures Subscribe updates even if the array reference is reused.
					_listSig: Array.isArray(list)
						? list
								.map((x, i) => `${i}\u001f${String(x)}`)
								.join('\u001e')
						: '',
					allLabel: s.values.filters?.allFilterLabel,
				};
			}}
		>
			{(snap) => (
				<>
					<DefaultActiveFilterSelect
						id={id}
						label={label}
						value={value}
						onChange={onChange}
						disabled={disabled}
						describedBy={describedByHelp(id, help)}
						list={snap.list}
						allLabel={snap.allLabel}
					/>
					<ControlHelp help={help} controlId={id} />
				</>
			)}
		</form.Subscribe>
	);
}
