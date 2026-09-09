/**
 * Pro extension runtime hooks for the React gallery host.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { isGalleryTypeWithoutImageGuardian } from '../constants/galleryLayoutDefaults';
import {
	installModulaProtectionNoticeGlobal,
	showModulaProtectionNotice,
} from '../utils/modulaProtectionNotice';

function truthy(val) {
	if (val === true || val === 1 || val === '1') {
		return true;
	}
	if (typeof val === 'string' && val.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {Object} config
 * @param {Object} settings Grouped v2 settings from store.
 * @param {Object} [options]
 * @param {boolean} [options.imageGuardian] Apply Image Guardian (right-click, blur). Off in settings-editor preview.
 * @param {boolean} [options.visitorChrome] Apply deeplink/zoom DOM hooks. Off in settings-editor preview.
 */
export function useGalleryProRuntime(hostRef, config, settings, options = {}) {
	const skipImageGuardian = isGalleryTypeWithoutImageGuardian(config?.type);
	const imageGuardianEnabled =
		options.imageGuardian !== false && !skipImageGuardian;
	const visitorChromeEnabled =
		options.visitorChrome !== false && !skipImageGuardian;
	const protection = settings?.protection || {};
	const deeplink = settings?.deeplink || {};
	const zoom = settings?.zoom || {};
	const rightClickMessage =
		typeof protection.rightClickMessage === 'string'
			? protection.rightClickMessage.trim()
			: '';
	const fallbackMessage = __(
		'This content is protected.',
		'modula-best-grid-gallery'
	);

	useEffect(() => {
		installModulaProtectionNoticeGlobal();
	}, []);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}

		const root =
			host.closest('.modula.modula-gallery') ||
			host.closest('.modula-gallery-modern') ||
			host.parentElement;
		if (!root) {
			return undefined;
		}

		const rightClickOn =
			imageGuardianEnabled && truthy(protection.protection);
		const blockDraggingOn =
			imageGuardianEnabled && truthy(protection.blockDragging);

		if (rightClickOn) {
			root.classList.add('modula-image-guardian');
			if (rightClickMessage !== '') {
				root.dataset.modulaProtectionMessage = rightClickMessage;
			}
		}
		if (imageGuardianEnabled && truthy(protection.blurProtection)) {
			root.classList.add('modula-blur-protection');
		}

		if (visitorChromeEnabled && truthy(deeplink.modulaDeeplink)) {
			root.dataset.modulaDeeplink = '1';
			if (deeplink.customLinkName) {
				root.dataset.modulaCustomLinkName = String(
					deeplink.customLinkName
				);
			}
		}

		if (
			visitorChromeEnabled &&
			truthy(zoom.enableZoom) &&
			truthy(zoom.zoomOnHover)
		) {
			root.classList.add('modula-zoom-on-hover');
		}

		const preventContext = (e) => {
			if (!rightClickOn) {
				return;
			}
			e.preventDefault();
			const fromData =
				typeof root.dataset.modulaProtectionMessage === 'string'
					? root.dataset.modulaProtectionMessage
					: '';
			showModulaProtectionNotice(
				fromData || rightClickMessage,
				fallbackMessage
			);
		};
		root.addEventListener('contextmenu', preventContext);

		const preventDrag = (e) => {
			if (!blockDraggingOn) {
				return;
			}
			const target = e.target;
			if (
				target instanceof HTMLElement &&
				(target.tagName === 'IMG' || target.closest('img'))
			) {
				e.preventDefault();
				showModulaProtectionNotice(rightClickMessage, fallbackMessage);
			}
		};
		root.addEventListener('dragstart', preventDrag);

		const onBlur = () => {
			if (imageGuardianEnabled && truthy(protection.blurProtection)) {
				root.classList.add('modula-tab-blurred');
			}
		};
		const onFocus = () => {
			root.classList.remove('modula-tab-blurred');
		};
		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', onFocus);

		return () => {
			root.removeEventListener('contextmenu', preventContext);
			root.removeEventListener('dragstart', preventDrag);
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
			root.classList.remove(
				'modula-image-guardian',
				'modula-blur-protection',
				'modula-tab-blurred',
				'modula-zoom-on-hover'
			);
			delete root.dataset.modulaDeeplink;
			delete root.dataset.modulaCustomLinkName;
			delete root.dataset.modulaProtectionMessage;
		};
	}, [
		hostRef,
		imageGuardianEnabled,
		visitorChromeEnabled,
		protection.protection,
		protection.blockDragging,
		protection.blurProtection,
		rightClickMessage,
		fallbackMessage,
		deeplink.modulaDeeplink,
		deeplink.customLinkName,
		zoom.enableZoom,
		zoom.zoomOnHover,
	]);
}
