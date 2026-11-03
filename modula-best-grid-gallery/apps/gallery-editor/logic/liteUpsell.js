/**
 * Lite lock presentation: the copy and link a locked setting's upsell shows,
 * and the rail categories Lite locks. Both read the existing sources (the
 * schema's `editorLightboxLiteUpsell` / `editorGalleryTypeUpsell`, the
 * `editorShowInLite` / `editorOmitControlInLite` flags, a category's
 * `requiresExtension` gate and `liteUpsell`), never a lock list of their own.
 * Plans, extension names and the guarantee come from the editor config's
 * `litePaywall` (`Modula_Extension_Catalog::paywall()`).
 */
import { __, sprintf } from '@wordpress/i18n';
import { appendQuery, withV3Utm } from 'gallery-shared/utils/withV3Utm';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';
import { getGroupedPathsForHubDrillSection } from '../utils/getGroupedPathsForHubDrillSection';
import {
	passesCategoryVisibleWhen,
	resolveCategoryExtensionGate,
} from './categoryVisibility';
import { isFieldVisible } from './fieldVisibility';
import { shouldRenderHubSection } from './hubSectionVisibility';
import { resolveOmitControlInLite } from './proGateLock';
import { isPresentationOnlyField } from './settingsFieldDefault';
import { isFieldEntryShown } from './settingsPanelSections';

/**
 * @typedef {Object} LitePlan
 * @property {string} slug  Catalog plan, e.g. `trio`.
 * @property {string} label Plan name, e.g. Trio.
 */

/**
 * @typedef {Object} LiteUpsellPoint
 * @property {string} label A feature the plan brings.
 * @property {string} tag   The dearer plan that adds it, '' when the card's plan has it.
 */

/**
 * @typedef {Object} LiteUpsell
 * @property {string}            title         Upsell heading, '' when the schema has none.
 * @property {string}            pitch         One-line pitch, '' when the upsell has none.
 * @property {string}            message       Why to upgrade, '' when the upsell has a pitch only.
 * @property {LitePlan|null}     plan          The plan that brings it, null without catalog data.
 * @property {LiteUpsellPoint[]} points        A locked tab's checklist.
 * @property {string}            ctaLabel      "Get <Plan>", or the upsell's own label without a plan.
 * @property {string}            href          Pricing link with the v3 UTM.
 * @property {string}            guarantee     Money-back line, '' without catalog data.
 * @property {string}            licenseKeyUrl "I already have a license key", '' without catalog data.
 * @property {string}            [feature]     What a popover says is locked, e.g. Zoom.
 */

/**
 * @param {unknown} value
 * @return {string} The trimmed string, '' for anything else.
 */
const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * @param {Object} editor Editor config (`upgradeUrl`).
 * @return {string} The pricing page.
 */
function pricingBase(editor) {
	return text(editor.upgradeUrl) || 'https://wp-modula.com/pricing/';
}

/**
 * @param {Object} editor Editor config.
 * @return {Object|null} `litePaywall`, or null when the config has none.
 */
function paywallOf(editor) {
	const paywall = editor.litePaywall;
	return paywall && typeof paywall === 'object' ? paywall : null;
}

/**
 * The plan that brings an extension, or Pro core's plan without one.
 *
 * @param {string} extensionSlug Catalog extension, '' for a Pro feature outside one.
 * @param {Object} editor        Editor config.
 * @return {LitePlan|null} Null without catalog data or for an extension the catalog does not list.
 */
function planOf(extensionSlug, editor) {
	const paywall = paywallOf(editor);
	if (!paywall) {
		return null;
	}
	const slug =
		extensionSlug === ''
			? text(paywall.corePlan)
			: text(paywall.extensionPlans?.[extensionSlug]);
	const label = text(paywall.plans?.[slug]);
	return label === '' ? null : { slug, label };
}

/**
 * @param {LitePlan|null} plan
 * @param {Object}        editor Editor config.
 * @return {number} The plan's place from the cheapest, -1 for none.
 */
function planRank(plan, editor) {
	const plans = paywallOf(editor)?.plans;
	return plan && plans ? Object.keys(plans).indexOf(plan.slug) : -1;
}

/**
 * A locked tab's checklist: catalog extensions by name, and the features
 * outside an extension by their label. Each point a dearer plan adds names
 * that plan.
 *
 * @param {unknown}       points The category `liteUpsell.points`.
 * @param {LitePlan|null} plan   The card's plan.
 * @param {Object}        editor Editor config.
 * @return {LiteUpsellPoint[]} Without catalog data, none.
 */
function resolvePoints(points, plan, editor) {
	const paywall = paywallOf(editor);
	if (!paywall || !plan || !Array.isArray(points)) {
		return [];
	}
	return points.flatMap((point) => {
		const extensionSlug = text(point?.extension);
		const label =
			extensionSlug === ''
				? text(point?.label)
				: text(paywall.extensionNames?.[extensionSlug]);
		const pointPlan = planOf(extensionSlug, editor);
		if (label === '' || !pointPlan) {
			return [];
		}
		const tag =
			planRank(pointPlan, editor) > planRank(plan, editor)
				? pointPlan.label
				: '';
		return [{ label, tag }];
	});
}

/**
 * @param {LitePlan|null} plan
 * @param {string}        fallback The upsell's own CTA label.
 * @return {string} "Get <Plan>", or the fallback without a plan.
 */
function ctaLabelFor(plan, fallback) {
	return plan
		? sprintf(
				/* translators: %s: plan name, e.g. Trio. */
				__('Get %s', 'modula-best-grid-gallery'),
				plan.label
			)
		: fallback;
}

/**
 * @param {Object} setting       A setting's `editorLightboxLiteUpsell`, or a category's `liteUpsell`.
 * @param {string} extensionSlug The extension it sells, '' for Pro core.
 * @param {Object} editor        Editor config.
 * @return {LiteUpsell|null} The upsell, or null without a message or pitch.
 */
function settingUpsell(setting, extensionSlug, editor) {
	const message = text(setting.needsProMessage);
	const pitch = text(setting.pitch);
	if (message === '' && pitch === '') {
		return null;
	}
	const paywall = paywallOf(editor);
	const plan = planOf(extensionSlug, editor);
	return {
		title: text(setting.title),
		pitch,
		message,
		plan,
		points: resolvePoints(setting.points, plan, editor),
		ctaLabel: ctaLabelFor(
			plan,
			text(setting.getPremiumLabel) ||
				/* translators: primary CTA on a Lite setting or tab upsell */
				__('Get Premium!', 'modula-best-grid-gallery')
		),
		href: withV3Utm(
			text(setting.pricingUrl) ||
				appendQuery(
					pricingBase(editor),
					'utm_source=modula-lite&utm_medium=settings-editor-lightbox&utm_campaign=upsell'
				)
		),
		guarantee: text(paywall?.guarantee),
		licenseKeyUrl: text(paywall?.licenseKeyUrl),
	};
}

/**
 * The Lite upsell of a Pro core feature that has no schema field (the hover
 * builder's Customize): Pro core's plan from the catalog, on the pricing
 * page with the caller's UTM.
 *
 * @param {Object} feature
 * @param {string} feature.needsProMessage Why to upgrade.
 * @param {string} feature.ctaLabel        CTA without catalog data.
 * @param {string} feature.pricingQuery    UTM query for the pricing link.
 * @param {Object} editor                  Editor config.
 * @return {LiteUpsell|null} The upsell, or null without a message or in Pro.
 */
export function resolveProCoreUpsell(
	{ needsProMessage, ctaLabel, pricingQuery },
	editor
) {
	if (editor.isPro) {
		return null;
	}
	return settingUpsell(
		{
			needsProMessage,
			getPremiumLabel: ctaLabel,
			pricingUrl: appendQuery(pricingBase(editor), pricingQuery),
		},
		'',
		editor
	);
}

/**
 * The Lite upsell of a schema field: its `editorLightboxLiteUpsell` (a
 * setting) or `editorGalleryTypeUpsell` (gallery types, whose plan depends on
 * the type: `resolveLockedOptionUpsell`). Pro shows the extension upsells
 * (`EditorUpsellBlurb`) instead, so there is none.
 *
 * @param {Object|null|undefined} schema Field schema.
 * @param {Object}                editor Editor config.
 * @return {LiteUpsell|null} The upsell, or null without a message or in Pro.
 */
export function resolveLiteUpsell(schema, editor) {
	if (editor.isPro || !schema || typeof schema !== 'object') {
		return null;
	}
	const setting = schema.editorLightboxLiteUpsell;
	if (setting && typeof setting === 'object') {
		return settingUpsell(setting, text(setting.extensionSlug), editor);
	}
	const galleryType = schema.editorGalleryTypeUpsell;
	const message = text(galleryType?.needsProMessage);
	if (message === '') {
		return null;
	}
	const paywall = paywallOf(editor);
	return {
		title: '',
		pitch: '',
		message,
		plan: null,
		points: [],
		ctaLabel:
			/* translators: primary CTA on gallery type upsell */
			__('View plans', 'modula-best-grid-gallery'),
		href: withV3Utm(
			appendQuery(
				pricingBase(editor),
				'utm_source=modula-lite&utm_medium=settings-editor-gallery-type&utm_campaign=upsell'
			)
		),
		guarantee: text(paywall?.guarantee),
		licenseKeyUrl: text(paywall?.licenseKeyUrl),
	};
}

/**
 * The upsell a select's locked option opens, named after the option and on
 * the plan its gate needs (`control.optionGates`: an extension, or Pro core).
 * An option without a gate keeps the field upsell's plan.
 *
 * @param {LiteUpsell}                       upsell The field's upsell (`resolveLiteUpsell`).
 * @param {Object}                           field  Enriched schema field.
 * @param {{ value: string, label: string }} option The locked option.
 * @param {Object}                           editor Editor config.
 * @return {LiteUpsell} The option's upsell.
 */
export function resolveLockedOptionUpsell(upsell, field, option, editor) {
	const gate = field.control?.optionGates?.[option.value];
	let plan = upsell.plan;
	if (gate?.kind === 'requiresExtension') {
		plan = planOf(text(gate.extensionSlug), editor);
	} else if (gate?.kind === 'requiresPro') {
		plan = planOf('', editor);
	}
	return {
		...upsell,
		feature: option.label,
		plan,
		ctaLabel: ctaLabelFor(plan, upsell.ctaLabel),
	};
}

/**
 * @param {LitePlan|null} plan
 * @return {string} "Included in <Plan>", '' without a plan.
 */
export function litePlanLine(plan) {
	return plan
		? sprintf(
				/* translators: %s: plan name, e.g. Trio. */
				__('Included in %s', 'modula-best-grid-gallery'),
				plan.label
			)
		: '';
}

/**
 * What the upsell popover of a locked row or option says.
 *
 * @param {LiteUpsell} upsell With the locked `feature`.
 * @return {{ title: string, line: string }} Heading, and the plan line ('' without a plan).
 */
export function liteUpsellPopoverText(upsell) {
	const feature = text(upsell.feature);
	if (!upsell.plan || feature === '') {
		return {
			title: feature
				? sprintf(
						/* translators: %s: option name, e.g. Slider. */
						__('%s needs Modula PRO', 'modula-best-grid-gallery'),
						feature
					)
				: upsell.title ||
					__('This is a PRO feature', 'modula-best-grid-gallery'),
			line: litePlanLine(upsell.plan),
		};
	}
	return {
		title: sprintf(
			/* translators: 1: feature name, e.g. Zoom; 2: plan name, e.g. Business. */
			__('%1$s is part of Modula %2$s', 'modula-best-grid-gallery'),
			feature,
			upsell.plan.label
		),
		line: litePlanLine(upsell.plan),
	};
}

/**
 * @param {Object[]}                                items  Submenu or drill `items`.
 * @param {Record<string, Record<string, unknown>>} values Grouped form values.
 * @return {string[]} Paths of the fields the navigation shows, sections included.
 */
function shownFieldPaths(items, values) {
	return items.flatMap((entry) => {
		if (entry?.type === 'field') {
			return isFieldEntryShown(entry, values) ? [entry.groupedPath] : [];
		}
		if (entry?.type !== 'drill' || !shouldRenderHubSection(entry, values)) {
			return [];
		}
		return Array.isArray(entry.items)
			? shownFieldPaths(entry.items, values)
			: getGroupedPathsForHubDrillSection(entry, values);
	});
}

/**
 * A category is locked in Lite when every setting it shows there, in its hub
 * and its sections, is an upsell in place of its control (Filters, Protect,
 * Instagram, Proofing). Headings and notes do not count.
 *
 * @param {Object}                                  category Entry from `SETTINGS_EDITOR_CATEGORIES`.
 * @param {Record<string, Record<string, unknown>>} values   Grouped form values.
 * @param {Object}                                  editor   Editor config.
 * @return {Object|null} The field whose upsell stands for the category, or null when it is not locked.
 */
function findCategoryLockField(category, values, editor) {
	if (editor.isPro) {
		return null;
	}
	const items = (category.hubSections || [])
		.filter(
			(submenu) =>
				submenu?.type === 'submenu' &&
				Array.isArray(submenu.items) &&
				shouldRenderHubSection(submenu, values)
		)
		.flatMap((submenu) => submenu.items);
	const settings = shownFieldPaths(items, values)
		.map((path) => getEnrichedFieldByGroupedPath(path)?.field)
		.filter(
			(field) =>
				field &&
				!isPresentationOnlyField(field) &&
				isFieldVisible(field, values)
		);
	const locked = settings.filter((field) =>
		resolveOmitControlInLite(field.schema, editor)
	);
	if (locked.length === 0 || locked.length !== settings.length) {
		return null;
	}
	return locked[0];
}

/**
 * A category whose extension Lite lacks (Video) opens on the upsell its
 * navigation entry carries (`liteUpsell`).
 *
 * @param {Object} category Entry from `SETTINGS_EDITOR_CATEGORIES`.
 * @param {Object} editor   Editor config.
 * @return {LiteUpsell|null} The upsell, or null when the extension gate does not ask for PRO.
 */
function categoryExtensionUpsell(category, editor) {
	const setting = category.liteUpsell;
	if (!setting || typeof setting !== 'object') {
		return null;
	}
	const { reason } = resolveCategoryExtensionGate(category, editor);
	return reason === 'needs_pro'
		? settingUpsell(setting, text(category.requiresExtension), editor)
		: null;
}

/**
 * A locked tab's card: the short title, pitch and checklist of the category's
 * `liteUpsell` over the upsell it stands for, which keeps its plan and link.
 *
 * @param {LiteUpsell} upsell   The upsell of the setting the card stands for.
 * @param {Object}     category Entry from `SETTINGS_EDITOR_CATEGORIES`.
 * @param {Object}     editor   Editor config.
 * @return {LiteUpsell} The card.
 */
function categoryCard(upsell, category, editor) {
	const card = category.liteUpsell;
	if (!card || typeof card !== 'object') {
		return upsell;
	}
	return {
		...upsell,
		title: text(card.title) || upsell.title,
		pitch: text(card.pitch) || upsell.pitch,
		points: resolvePoints(card.points, upsell.plan, editor),
	};
}

/**
 * @typedef {Object} CategoryLiteLock
 * @property {LiteUpsell} upsell  The tab card.
 * @property {string[]}   anchors Settings the card stands for, where Setting search lands.
 */

/**
 * How Lite locks a rail category: behind the extension it needs (Video), or
 * because every setting it shows is an upsell (Filters, Protect, Instagram,
 * Proofing). A category its `visibleWhen` rule hides is never locked.
 *
 * @param {Object}                                  category Entry from `SETTINGS_EDITOR_CATEGORIES`.
 * @param {Record<string, Record<string, unknown>>} values   Grouped form values.
 * @param {Object}                                  editor   Editor config.
 * @return {CategoryLiteLock|null} The lock, or null when the category is not locked.
 */
export function resolveCategoryLiteLock(category, values, editor) {
	if (!passesCategoryVisibleWhen(category, values)) {
		return null;
	}
	const extensionUpsell = categoryExtensionUpsell(category, editor);
	if (extensionUpsell) {
		return { upsell: extensionUpsell, anchors: [] };
	}
	const field = findCategoryLockField(category, values, editor);
	const upsell = field ? resolveLiteUpsell(field.schema, editor) : null;
	return upsell
		? {
				upsell: categoryCard(upsell, category, editor),
				anchors: [field.groupedPath],
			}
		: null;
}
