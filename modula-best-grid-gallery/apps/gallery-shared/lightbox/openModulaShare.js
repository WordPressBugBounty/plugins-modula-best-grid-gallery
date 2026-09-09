/**
 * Share dialog for Modula Fancybox (vanilla, no jQuery).
 *
 * @package
 */
import { Fancybox } from '@fancyapps/ui/dist/fancybox/fancybox.js';

/**
 * @param {string} string
 * @returns {string}
 */
function escapeHtml(string) {
	const entityMap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
		'/': '&#x2F;',
		'`': '&#x60;',
		'=': '&#x3D;',
	};

	return String(string).replace(/[&<>"'`=/]/g, (s) => entityMap[s] || s);
}

/**
 * @param {string} template
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
function applyTemplate(template, data) {
	return template.replace(/\{([^}]+)\}/g, (match, keyPath) => {
		let value = data;
		const parts = keyPath.split('|')[0].split('.');

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			value =
				typeof value?.[part] === 'function'
					? value[part]()
					: value?.[part];
			if (value === undefined || value === null) {
				return keyPath.indexOf('|') !== -1
					? keyPath.split('|')[1]
					: match;
			}
		}

		return String(value);
	});
}

/**
 * Open the share Fancybox modal for the active Modula lightbox instance.
 *
 * @param {{ shareButtonsJson?: string }} [context]
 */
export function openModulaShare(context = {}) {
	const instance = Fancybox.getInstance();
	const current = instance?.getSlide?.();
	if (!instance || !current) {
		return;
	}

	const shareButtonsJson =
		context.shareButtonsJson ||
		(typeof window !== 'undefined' && window.ModulaShareButtons
			? window.ModulaShareButtons
			: '');

	if (!shareButtonsJson) {
		return;
	}

	const options = instance.getOptions();

	const url =
		typeof current.opts?.image_src !== 'undefined'
			? current.opts.image_src
			: current.src || '';
	const l10n = options.l10n || {};
	let tpl = `<div class='modula-fancybox-share'><h1>${l10n.SHARE || 'Share'}</h1><p>`;

	let shareBtnTpl;
	try {
		shareBtnTpl = JSON.parse(shareButtonsJson);
	} catch {
		return;
	}

	const modulaShare = Array.isArray(options.modulaShare)
		? options.modulaShare
		: [];

	modulaShare.forEach((value) => {
		const rawEmailMessage = options.lightboxEmailMessage?.length
			? options.lightboxEmailMessage
			: l10n.EMAIL || '';

		const emailMessage = String(rawEmailMessage)
			.replace(/%%gallery_link%%/g, window.location.href)
			.replace(/%%image_link%%/g, url);

		let text = current.opts?.alt !== undefined ? current.opts.alt : '';

		if (text === '' && current.caption) {
			text = current.caption;
		}

		if (shareBtnTpl[value]) {
			tpl += applyTemplate(String(shareBtnTpl[value]), {
				media: current.type === 'image' ? encodeURIComponent(url) : '',
				modulaShareUrl: encodeURIComponent(url),
				descr: encodeURIComponent(text),
				subject: encodeURIComponent(options.lightboxEmailSubject || ''),
				emailMessage: encodeURIComponent(emailMessage),
			});
		}
	});

	tpl += `</p><p><input class='modula-fancybox-share__input' type='text' value='${escapeHtml(url)}' /></p></div>`;
	tpl = applyTemplate(tpl, { url_raw: escapeHtml(url) });

	/*
	 * Fancybox v6 virtual HTML slides use `html` (not v5 `src` + type:'html').
	 * Wrong shape → empty dark slide with no share buttons/icons.
	 */
	Fancybox.show(
		[
			{
				html: tpl,
				width: 640,
				height: 360,
			},
		],
		{
			mainClass: 'modula-fancybox-container modula-fancybox-share-dialog',
			Carousel: {
				Toolbar: {
					display: {
						left: [],
						middle: [],
						right: ['close'],
					},
				},
				Thumbs: false,
			},
		}
	);
}
