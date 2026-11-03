/**
 * Settings panel body (canvas "1 · Editor"): the category's hub fields first,
 * then a "More settings" heading over accordion sections that expand in place.
 * A labelled hub submenu (Interact › Share) is a heading inside the hub.
 * A category Lite locks (Filters, Protect, Instagram, Proofing, Video) shows its upsell card instead.
 */
import { __ } from '@wordpress/i18n';
import { Accordion } from 'admin-ui';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { useLiveGalleryPhotoCount } from '../../../hooks/useLiveGalleryPhotoCount';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { shouldRenderHubSection } from '../../../logic/hubSectionVisibility';
import { resolveCategoryLiteLock } from '../../../logic/liteUpsell';
import { settingAnchorProps } from '../../../logic/settingAnchor';
import {
	buildSectionKey,
	isMoreSettingsSubmenu,
} from '../../../logic/settingsPanelSections';
import LiteUpsellCard from '../../upsell/LiteUpsellCard';
import SettingsPanelHubField from './SettingsPanelHubField';
import SettingsPanelLiteLock from './SettingsPanelLiteLock';
import SettingsPanelItems, {
	SettingsPanelAccordionSection,
} from './SettingsPanelItems';

/**
 * @type {import('./SettingsPanelItems').RenderField} The field's hub row.
 */
function renderHubField(field, dependentsReset) {
	return (
		<SettingsPanelLiteLock field={field}>
			<SettingsPanelHubField
				field={field}
				dependentsReset={dependentsReset}
			/>
		</SettingsPanelLiteLock>
	);
}

/**
 * @param {Object}                                  props
 * @param {Object}                                  props.submenu   Hub submenu.
 * @param {string}                                  props.parentKey Its open state key.
 * @param {Record<string, Record<string, unknown>>} props.values
 */
function SettingsPanelHub({ submenu, parentKey, values }) {
	const heading = typeof submenu.label === 'string' ? submenu.label : '';
	return (
		<div className="modula-settings-panel__hub">
			{heading !== '' ? (
				<h3 className="modula-settings-panel__hub-heading">
					{heading}
				</h3>
			) : null}
			<SettingsPanelItems
				items={submenu.items}
				parentKey={parentKey}
				values={values}
				headingLevel={heading !== '' ? 4 : 3}
				renderField={renderHubField}
			/>
		</div>
	);
}

/**
 * @param {Object}                                  props
 * @param {Object[]}                                props.submenus     "More settings" submenus.
 * @param {string}                                  props.categoryName
 * @param {Record<string, Record<string, unknown>>} props.values
 */
function SettingsPanelMoreSettings({ submenus, categoryName, values }) {
	const sections = submenus.flatMap((submenu) =>
		submenu.items
			.filter(
				(item) =>
					item?.type === 'drill' &&
					shouldRenderHubSection(item, values)
			)
			.map((item) => ({
				item,
				key: buildSectionKey(
					buildSectionKey(categoryName, submenu),
					item
				),
			}))
	);
	if (sections.length === 0) {
		return null;
	}
	return (
		<section
			className="modula-settings-panel__more"
			aria-labelledby="modula-settings-panel-more-title"
		>
			<h2
				id="modula-settings-panel-more-title"
				className="modula-settings-panel__more-title"
			>
				{__('More settings', 'modula-best-grid-gallery')}
			</h2>
			<Accordion className="modula-settings-panel__more-sections">
				{sections.map(({ item, key }) => (
					<SettingsPanelAccordionSection
						key={key}
						section={item}
						sectionKey={key}
						values={values}
						headingLevel={3}
					/>
				))}
			</Accordion>
		</section>
	);
}

/**
 * @param {Object} props
 * @param {Object} props.category Entry from `SETTINGS_EDITOR_CATEGORIES`.
 */
export default function SettingsPanelBody({ category }) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	// Re-renders when photos are added or removed, so rows gated on the photo count follow.
	useLiveGalleryPhotoCount();
	const submenus = category.hubSections.filter(
		(entry) => entry?.type === 'submenu' && Array.isArray(entry.items)
	);
	const hubSubmenus = submenus.filter(
		(submenu) => !isMoreSettingsSubmenu(submenu)
	);
	const moreSubmenus = submenus.filter(isMoreSettingsSubmenu);

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => {
				const lock = resolveCategoryLiteLock(category, values, editor);
				if (lock) {
					return (
						<div
							className="modula-settings-panel__body"
							{...settingAnchorProps(lock.anchors)}
						>
							<LiteUpsellCard
								upsell={lock.upsell}
								variant="tab"
								title={category.title}
							/>
						</div>
					);
				}
				return (
					<div className="modula-settings-panel__body">
						{hubSubmenus
							.filter((submenu) =>
								shouldRenderHubSection(submenu, values)
							)
							.map((submenu) => (
								<SettingsPanelHub
									key={submenu.id}
									submenu={submenu}
									parentKey={buildSectionKey(
										category.name,
										submenu
									)}
									values={values}
								/>
							))}
						<SettingsPanelMoreSettings
							submenus={moreSubmenus}
							categoryName={category.name}
							values={values}
						/>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
