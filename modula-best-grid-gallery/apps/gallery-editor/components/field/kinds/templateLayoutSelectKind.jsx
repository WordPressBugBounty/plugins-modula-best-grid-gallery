import {
	TEMPLATE_DEFINITIONS,
} from 'gallery-shared/preview';
import { __ } from '@wordpress/i18n';
import { MenuSelect } from 'shared-ui';
import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';
import { gateLockHint, resolveProGateLock } from '../../../logic/proGateLock';
import { TemplateLayoutPreviewIcon } from '../TemplateLayoutPreviewIcon';

/**
 * @param {Object}           ctx
 * @param {Object}           ctx.field
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderTemplateLayoutSelectKind({
	field,
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels = control.optionLabels || {};
	const gates = control.optionGates || {};
	const editor = getModulaSettingsEditorConfig();
	const optionValues = Array.isArray(control.options)
		? control.options.map(String).filter(Boolean)
		: [];

	const liteOptions = [];
	const proOptions = [];

	for (const slug of optionValues) {
		const def = TEMPLATE_DEFINITIONS[slug];
		const raw = labels[slug] ?? labels[String(slug)];
		const label =
			typeof raw === 'string' && raw !== '' ? raw : (def?.label ?? slug);
		const gate = gates[slug];
		const { allowed, reason } = resolveProGateLock(gate, editor);
		const locked = Boolean(gate) && !allowed;
		const hint = locked && reason ? gateLockHint(reason) : '';
		const opt = {
			value: slug,
			label,
			icon: <TemplateLayoutPreviewIcon slug={slug} />,
			disabled: locked,
			badge: hint || undefined,
		};
		if (def?.tier === 'pro') {
			proOptions.push(opt);
		} else {
			liteOptions.push(opt);
		}
	}

	/** @type {import('shared-ui').MenuSelectGroup[]} */
	const groups = [];
	if (liteOptions.length) {
		groups.push({
			id: 'lite',
			label: __('Free layouts', 'modula-best-grid-gallery'),
			options: liteOptions,
		});
	}
	if (proOptions.length) {
		groups.push({
			id: 'pro',
			label: __('Pro layouts', 'modula-best-grid-gallery'),
			options: proOptions,
		});
	}

	return (
		<MenuSelect
			value={value === null || value === undefined ? '' : String(value)}
			onChange={onChange}
			disabled={disabled}
			help={help}
			groups={groups}
			listLabel={__('Select template layout', 'modula-best-grid-gallery')}
			placeholder={__(
				'Select template layout…',
				'modula-best-grid-gallery'
			)}
			className="modula-template-layout-select"
		/>
	);
}
