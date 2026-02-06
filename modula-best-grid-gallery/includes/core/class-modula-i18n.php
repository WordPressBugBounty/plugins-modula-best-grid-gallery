<?php

/**
 * Internationalization handler for Modula plugin.
 *
 * Responsible for setting up locale and text domain.
 *
 * @since 2.0.0
 */
class Modula_I18n {

	/**
	 * Set up plugin locale and text domain.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function set_locale(): void {
		$modula_lang = dirname( MODULA_FILE ) . '/languages/';

		if ( get_user_locale() !== get_locale() ) {
			unload_textdomain( 'modula-best-grid-gallery' );
			$locale = apply_filters( 'plugin_locale', get_user_locale(), 'modula-best-grid-gallery' );

			$lang_ext  = sprintf( '%1$s-%2$s.mo', 'modula-best-grid-gallery', $locale );
			$lang_ext1 = WP_LANG_DIR . "/modula-best-grid-gallery/modula-best-grid-gallery-{$locale}.mo";
			$lang_ext2 = WP_LANG_DIR . "/plugins/modula-best-grid-gallery/{$lang_ext}";

			if ( file_exists( $lang_ext1 ) ) {
				load_textdomain( 'modula-best-grid-gallery', $lang_ext1 );
			} elseif ( file_exists( $lang_ext2 ) ) {
				load_textdomain( 'modula-best-grid-gallery', $lang_ext2 );
			} else {
				load_plugin_textdomain( 'modula-best-grid-gallery', false, $modula_lang );
			}
		} else {
			load_plugin_textdomain( 'modula-best-grid-gallery', false, $modula_lang );
		}
	}
}
