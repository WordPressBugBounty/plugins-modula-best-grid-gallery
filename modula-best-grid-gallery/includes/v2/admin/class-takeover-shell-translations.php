<?php
/**
 * Script translations for the shared editor shell outside the gallery editor bundle.
 *
 * The shell (`apps/editor-shell`) is compiled into the gallery editor bundle and
 * into the Albums editor bundle (Pro). Its strings use the Lite text domain, but
 * WordPress loads one text domain per script handle and keys JSON translation files
 * by the requesting script's path, so the Albums bundle (which loads `modula-pro`)
 * would otherwise show the shell untranslated. The gallery editor bundle carries
 * the same shell strings, so its Lite translations are attached to the other bundle.
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Class Takeover_Shell_Translations
 */
class Takeover_Shell_Translations {

	/**
	 * Text domain of the shared shell strings.
	 */
	const DOMAIN = 'modula-best-grid-gallery';

	/**
	 * Registered-only handle naming the gallery editor bundle for translation lookup.
	 */
	const SOURCE_HANDLE = 'modula-takeover-shell-i18n';

	/**
	 * Gallery editor bundle, relative to the plugin root (language packs key its JSON by this path).
	 */
	const SOURCE_SCRIPT = 'assets/js/admin/gallery-editor/index.js';

	/**
	 * Add the Lite shell translations to an editor bundle that loads another text domain.
	 *
	 * Call after enqueueing `$handle`; it must depend on `wp-i18n`.
	 *
	 * @param string $handle Enqueued editor bundle handle.
	 * @return bool Whether translations for the current locale were found and attached.
	 */
	public static function attach( $handle ) {
		if ( ! wp_script_is( self::SOURCE_HANDLE, 'registered' ) ) {
			// Never enqueued: `load_script_textdomain()` only needs its source path.
			wp_register_script( self::SOURCE_HANDLE, MODULA_URL . self::SOURCE_SCRIPT, array(), MODULA_LITE_VERSION, true );
		}

		$translations = load_script_textdomain( self::SOURCE_HANDLE, self::DOMAIN, MODULA_PATH . 'languages' );
		if ( ! is_string( $translations ) || '' === $translations ) {
			return false;
		}

		// Same registration WordPress prints for a handle's own text domain.
		return wp_add_inline_script(
			$handle,
			sprintf(
				'( function( domain, translations ) { var localeData = translations.locale_data[ domain ] || translations.locale_data.messages; localeData[""].domain = domain; wp.i18n.setLocaleData( localeData, domain ); } )( %s, %s );',
				wp_json_encode( self::DOMAIN ),
				$translations
			),
			'before'
		);
	}
}
