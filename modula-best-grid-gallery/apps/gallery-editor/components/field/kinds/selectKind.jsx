import { Select, MenuSelect } from 'shared-ui';
import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { gateLockHint, resolveProGateLock } from '../../../logic/proGateLock';
import { isNil } from '../../../logic/isNil';

/** Option count above which selects use MenuSelect (and panel rows stack the label). */
export const MENU_SELECT_OPTION_THRESHOLD = 4;

/**
 * Single policy: MenuSelect for gallery type and for long option lists.
 *
 * @param {Object} [field]
 * @return {boolean}
 */
export function shouldUseMenuSelect(field) {
	if (field?.groupedPath === 'general.type') {
		return true;
	}
	if (field?.groupedPath === 'template.templateLayout') {
		return true;
	}
	const options = field?.control?.options;
	return (
		Array.isArray(options) && options.length > MENU_SELECT_OPTION_THRESHOLD
	);
}

/**
 * @param {Object}           ctx
 * @param {Object}           [ctx.field]
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 * @param {string|undefined} ctx.galleryType
 */
function renderSelectControl({
	field,
	control,
	value,
	onChange,
	disabled,
	help,
	galleryType,
}) {
	const labels = control.optionLabels || {};
	const gates = control.optionGates || {};
	const editor = getModulaSettingsEditorConfig();
	let optionValues = Array.isArray(control.options)
		? [...control.options]
		: [];
	if (
		field?.groupedPath === 'layout.gridType' &&
		(galleryType === 'uniform-grid' || galleryType === 'fit-grid')
	) {
		optionValues = optionValues.filter((o) => String(o) !== '1');
	}
	const opts = optionValues.map((o, i) => {
		const raw = Array.isArray(labels)
			? labels[i]
			: (labels[o] ?? labels[String(o)]);
		const fallback =
			typeof o === 'string' || typeof o === 'number' ? String(o) : '';
		const label = typeof raw === 'string' && raw !== '' ? raw : fallback;
		const gate = gates[o];
		const { allowed, reason } = resolveProGateLock(gate, editor);
		const locked = Boolean(gate) && !allowed;
		const hint = locked && reason ? gateLockHint(reason) : '';
		return {
			value: String(o),
			label,
			disabled: locked,
			badge: hint || undefined,
		};
	});
	const optsByValue = new Map(opts.map((opt) => [opt.value, opt]));

	/**
	 * @type {{ id: string, label: string, options: typeof opts }[]|undefined}
	 */
	let menuGroups;
	const rawGroups = control.optionGroups;
	if (Array.isArray(rawGroups) && rawGroups.length > 0) {
		menuGroups = rawGroups
			.map((group, index) => {
				const values = Array.isArray(group?.values)
					? group.values.map(String)
					: Array.isArray(group?.options)
						? group.options.map((entry) =>
								typeof entry === 'string' ||
								typeof entry === 'number'
									? String(entry)
									: String(entry?.value ?? '')
							)
						: [];
				const groupOptions = values
					.map((key) => optsByValue.get(key))
					.filter(Boolean);
				if (!groupOptions.length) {
					return null;
				}
				return {
					id:
						typeof group?.id === 'string' && group.id
							? group.id
							: `group-${index}`,
					label: typeof group?.label === 'string' ? group.label : '',
					options: groupOptions,
				};
			})
			.filter(Boolean);
		if (!menuGroups.length) {
			menuGroups = undefined;
		}
	}

	let v = isNil(value) || value === '' ? '' : String(value);
	if (
		field?.groupedPath === 'layout.gridType' &&
		(galleryType === 'uniform-grid' || galleryType === 'fit-grid') &&
		v === '1'
	) {
		v = '2';
	}
	if (
		v === '' &&
		Array.isArray(control.options) &&
		control.options.includes('default')
	) {
		v = 'default';
	}
	if (
		v === '' &&
		field?.schema?.default !== undefined &&
		field?.schema?.default !== null &&
		field.schema.default !== ''
	) {
		const schemaDefault = String(field.schema.default);
		const defaults = Array.isArray(control.options) ? control.options : [];
		if (
			defaults.length === 0 ||
			defaults.some((o) => String(o) === schemaDefault)
		) {
			v = schemaDefault;
		}
	}

	const listLabel =
		typeof field?.editorLabel === 'string' && field.editorLabel.trim()
			? field.editorLabel.trim()
			: typeof control.ariaLabel === 'string' && control.ariaLabel.trim()
				? control.ariaLabel.trim()
				: 'Select option';

	if (shouldUseMenuSelect(field)) {
		return (
			<MenuSelect
				value={v}
				options={opts}
				groups={menuGroups}
				onChange={onChange}
				disabled={disabled}
				help={help}
				listLabel={listLabel}
			/>
		);
	}

	return (
		<Select
			value={v}
			options={opts.map((opt) => ({
				value: opt.value,
				label: opt.badge ? `${opt.label} — ${opt.badge}` : opt.label,
				disabled: opt.disabled,
			}))}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object} props
 */
function SelectFieldKind(props) {
	const { form } = useGallerySettingsFormBundle();
	return (
		<form.Subscribe selector={(s) => s.values.general?.type}>
			{(galleryType) => renderSelectControl({ ...props, galleryType })}
		</form.Subscribe>
	);
}

/**
 * @param {Object} props
 */
export function renderSelectKind(props) {
	return <SelectFieldKind {...props} />;
}
