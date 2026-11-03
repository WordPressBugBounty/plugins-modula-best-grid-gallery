/**
 * Select settings render as the menu select, whatever their option count:
 * every select in the panel shares one look (canvas, ticket 21).
 */
import { __ } from '@wordpress/i18n';
import { PlanBadge } from 'admin-ui';
import { SelectMenuControl } from 'editor-shell';
import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';
import { useOpenLiteUpsell } from '../../../context/LiteUpsellContext';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import {
	resolveLiteUpsell,
	resolveLockedOptionUpsell,
} from '../../../logic/liteUpsell';
import { gateLockHint, resolveProGateLock } from '../../../logic/proGateLock';
import { isNil } from '../../../logic/isNil';
import { ControlHelp, describedByHelp } from './ControlHelp';

/**
 * @param {Object} [field]
 * @param {Object} control
 * @return {string} Name of the menu: the setting's label, the schema's aria label, or a generic one.
 */
function selectListLabel(field, control) {
	const names = [field?.editorLabel, control.ariaLabel];
	for (const name of names) {
		if (typeof name === 'string' && name.trim() !== '') {
			return name.trim();
		}
	}

	return __('Select option', 'modula-best-grid-gallery');
}

/**
 * Lite: the options its plan locks move to a "Needs PRO" group at the end,
 * marked PRO and choosable, so choosing one can open the upsell.
 *
 * @param {import('editor-shell/fields/SelectMenuControl').SelectMenuGroup[]} groups
 * @return {{ groups: import('editor-shell/fields/SelectMenuControl').SelectMenuGroup[], locked: Map<string, import('editor-shell/fields/SelectMenuControl').SelectMenuOption> }|null} The regrouped menu and its locked options; null when none is locked.
 */
function splitNeedsProOptions(groups) {
	const locked = new Map();
	const freeGroups = [];
	for (const group of groups) {
		const free = [];
		for (const option of group.options) {
			if (option.disabled === true) {
				locked.set(option.value, option);
			} else {
				free.push(option);
			}
		}
		if (free.length > 0) {
			freeGroups.push({ ...group, options: free });
		}
	}
	if (locked.size === 0) {
		return null;
	}
	const needsPro = {
		id: 'needs-pro',
		label: __('Needs PRO', 'modula-best-grid-gallery'),
		options: [...locked.values()].map((option) => ({
			...option,
			disabled: false,
			badge: (
				<PlanBadge
					tone="outline"
					lock
					plan={__('PRO', 'modula-best-grid-gallery')}
				/>
			),
		})),
	};
	return { groups: [...freeGroups, needsPro], locked };
}

/**
 * @param {Object}                                                 ctx
 * @param {Object}                                                 [ctx.field]
 * @param {Object}                                                 ctx.control
 * @param {string}                                                 ctx.controlId
 * @param {*}                                                      ctx.value
 * @param {Function}                                               ctx.onChange
 * @param {boolean}                                                ctx.disabled
 * @param {string|undefined}                                       ctx.help
 * @param {string|undefined}                                       ctx.galleryType
 * @param {((upsell: import('../../../logic/liteUpsell').LiteUpsell, anchor: HTMLElement|null) => void)|null} ctx.openLiteUpsell The takeover's upsell popover, opened next to the menu button; null in the metabox.
 */
function renderSelectControl({
	field,
	control,
	controlId,
	value,
	onChange,
	disabled,
	help,
	galleryType,
	openLiteUpsell,
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

	const groups = menuGroups ?? [{ id: 'default', options: opts }];
	const upsell = openLiteUpsell
		? resolveLiteUpsell(field?.schema, editor)
		: null;
	const liteLock = upsell ? splitNeedsProOptions(groups) : null;

	return (
		<>
			<SelectMenuControl
				id={controlId}
				label={selectListLabel(field, control)}
				value={v}
				groups={liteLock ? liteLock.groups : groups}
				onChange={
					liteLock
						? (next) => {
								const locked = liteLock.locked.get(next);
								if (!locked) {
									onChange(next);
									return;
								}
								openLiteUpsell(
									resolveLockedOptionUpsell(
										upsell,
										field,
										locked,
										editor
									),
									document.getElementById(controlId)
								);
							}
						: onChange
				}
				disabled={disabled}
				describedBy={describedByHelp(controlId, help)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</>
	);
}

/**
 * @param {Object} props
 */
function SelectFieldKind(props) {
	const { form } = useGallerySettingsFormBundle();
	const openLiteUpsell = useOpenLiteUpsell();
	return (
		<form.Subscribe selector={(s) => s.values.general?.type}>
			{(galleryType) =>
				renderSelectControl({ ...props, galleryType, openLiteUpsell })
			}
		</form.Subscribe>
	);
}

/**
 * @param {Object} props
 */
export function renderSelectKind(props) {
	return <SelectFieldKind {...props} />;
}
