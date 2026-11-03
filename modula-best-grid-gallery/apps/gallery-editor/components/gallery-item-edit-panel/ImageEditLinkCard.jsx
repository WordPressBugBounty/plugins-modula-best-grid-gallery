/**
 * Image edit panel — what a click does (the gallery setting or this tile's
 * own link) and the tile's lightbox and title toggles.
 */
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	rowLabelId,
	Segmented,
	SettingsRow,
	TextInput,
	Toggle,
} from 'admin-ui';
import { ItemEditCard } from 'editor-shell';
import { isWpTruthy } from '../../logic/wpTruthy';

const CLICK_INHERIT = 'inherit';
const CLICK_CUSTOM = 'custom';

const CLICK_OPTIONS = [
	{
		value: CLICK_INHERIT,
		label: __('Gallery setting', 'modula-best-grid-gallery'),
	},
	{
		value: CLICK_CUSTOM,
		label: __('Custom link', 'modula-best-grid-gallery'),
	},
];

/** Per-tile switches stored as '1' / '0'. */
const DISPLAY_TOGGLES = [
	{
		name: 'togglelightbox',
		label: __('Hide in lightbox', 'modula-best-grid-gallery'),
	},
	{ name: 'hide_title', label: __('Hide title', 'modula-best-grid-gallery') },
];

/**
 * A tile has its own link while `link` holds an address; clearing it falls
 * back to the gallery setting.
 *
 * @param {unknown} link
 * @return {'inherit'|'custom'} The On click choice.
 */
function clickModeFromLink(link) {
	return String(link || '').trim() !== '' ? CLICK_CUSTOM : CLICK_INHERIT;
}

const linkIcon = (
	<svg
		width="15"
		height="15"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.7"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M5 3v8a4 4 0 004 4h11M16 11l4 4-4 4" />
	</svg>
);

/**
 * @param {Object} props
 * @param {string} props.name   Form field ('1' / '0').
 * @param {string} props.label
 * @param {Object} props.form   Image metadata form.
 */
function ItemEditToggleRow({ name, label, form }) {
	const controlId = `modula-item-${name}-${useId()}`;
	return (
		<form.Field name={name}>
			{(field) => (
				<SettingsRow label={label} controlId={controlId}>
					<Toggle
						id={controlId}
						checked={isWpTruthy(field.state.value)}
						onChange={(on) => field.handleChange(on ? '1' : '0')}
					/>
				</SettingsRow>
			)}
		</form.Field>
	);
}

/**
 * @param {Object} props
 * @param {Object} props.form Image metadata form.
 */
export default function ImageEditLinkCard({ form }) {
	const clickId = `modula-item-click-${useId()}`;

	/** @param {string} mode */
	const onClickModeChange = (mode) => {
		if (mode === CLICK_INHERIT) {
			form.setFieldValue('link', '');
			return;
		}
		if (clickModeFromLink(form.state.values.link) === CLICK_INHERIT) {
			form.setFieldValue('link', 'https://');
		}
	};

	return (
		<ItemEditCard className="modula-gallery-item-edit-panel__link">
			<form.Subscribe selector={(s) => clickModeFromLink(s.values.link)}>
				{(clickMode) => (
					<>
						<SettingsRow
							label={__('On click', 'modula-best-grid-gallery')}
							controlId={clickId}
							labelElement="span"
						>
							<Segmented
								className="modula-gallery-item-edit-panel__click-mode"
								aria-labelledby={rowLabelId(clickId)}
								options={CLICK_OPTIONS}
								value={clickMode}
								onChange={onClickModeChange}
							/>
						</SettingsRow>
						{clickMode === CLICK_CUSTOM ? (
							<>
								<form.Field name="link">
									{(field) => (
										<div className="modula-gallery-item-edit-panel__link-address">
											<span className="modula-gallery-item-edit-panel__link-icon">
												{linkIcon}
											</span>
											<TextInput
												type="url"
												aria-label={__(
													'Link address',
													'modula-best-grid-gallery'
												)}
												placeholder="https://"
												value={field.state.value ?? ''}
												onChange={(v) =>
													field.handleChange(v)
												}
											/>
										</div>
									)}
								</form.Field>
								<ItemEditToggleRow
									name="target"
									label={__(
										'Open link in a new browser tab',
										'modula-best-grid-gallery'
									)}
									form={form}
								/>
							</>
						) : null}
					</>
				)}
			</form.Subscribe>
			{DISPLAY_TOGGLES.map(({ name, label }) => (
				<ItemEditToggleRow
					key={name}
					name={name}
					label={label}
					form={form}
				/>
			))}
		</ItemEditCard>
	);
}
