<?php
/**
 * Pre-React boot shell shared by the takeover editors.
 *
 * The gallery editor (Lite) and the Albums editor (Pro) paint the same mount,
 * loading spinner and desktop-only notice before their React bundles load, and
 * resolve the shared editor appearance preference from localStorage first.
 * Each editor supplies its root id/classes, listing URL and notice copy.
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Class Takeover_Boot_Shell
 */
class Takeover_Boot_Shell {

	/**
	 * Stylesheet handle for `assets/css/admin/takeover-boot.css`.
	 */
	const STYLE_HANDLE = 'modula-takeover-boot';

	/**
	 * Shared editor appearance preference (ADR 0014).
	 */
	const APPEARANCE_STORAGE_KEY = 'modula-settings-editor-appearance';

	/**
	 * Former Albums editor key, copied into the shared key once when that is empty or invalid.
	 */
	const LEGACY_ALBUMS_APPEARANCE_STORAGE_KEY = 'modula-albums-editor-appearance';

	/**
	 * Resolved appearance mirrored on `<html>` for the boot CSS.
	 */
	const DOCUMENT_APPEARANCE_ATTR = 'data-modula-se-appearance';

	/**
	 * Enqueue the boot shell stylesheet.
	 *
	 * @return void
	 */
	public static function enqueue_styles() {
		wp_enqueue_style(
			self::STYLE_HANDLE,
			MODULA_URL . 'assets/css/admin/takeover-boot.css',
			array(),
			MODULA_LITE_VERSION
		);
	}

	/**
	 * Early paint: resolve the appearance preference before the React bundle loads.
	 *
	 * Writes resolved light/dark (never `system`) to `<html>`. Missing storage is
	 * treated as system and resolved with `prefers-color-scheme`. Mirrors
	 * `readStoredPreference()` in `apps/editor-shell/appearance/settingsEditorAppearance.js`.
	 *
	 * @return void
	 */
	public static function print_appearance_script() {
		$key    = wp_json_encode( self::APPEARANCE_STORAGE_KEY );
		$legacy = wp_json_encode( self::LEGACY_ALBUMS_APPEARANCE_STORAGE_KEY );
		$attr   = wp_json_encode( self::DOCUMENT_APPEARANCE_ATTR );
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded string constants.
		echo '<script>(function(){var attr=' . $attr . ';function r(){try{if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){return"dark";}}catch(e2){}return"light";}try{var k=' . $key . ';var a=localStorage.getItem(k);if(a!=="dark"&&a!=="light"&&a!=="system"){var old=localStorage.getItem(' . $legacy . ');if(old==="dark"||old==="light"){a=old;try{localStorage.setItem(k,a);}catch(e3){}}else{a="system";}}var v=a==="system"?r():a;document.documentElement.setAttribute(attr,v);}catch(e){document.documentElement.setAttribute(attr,r());}})();</script>' . "\n";
	}

	/**
	 * Fixed mount with the boot spinner and the desktop-only notice.
	 *
	 * React replaces the mount children when it renders. On phones and tablets the
	 * CSS shows the notice instead of the spinner.
	 *
	 * @param array{id: string, class: string, back_url: string, desktop_message: string} $args Root id, editor root classes,
	 *        listing URL for the notice's Back link, and the notice body (translated by the owning plugin).
	 * @return void
	 */
	public static function render_mount( $args ) {
		$root_id = $args['id'];

		echo '<div id="' . esc_attr( $root_id ) . '" class="' . esc_attr( $args['class'] . ' modula-takeover__mount' ) . '" data-appearance="light">';
		self::render_desktop_only_notice( $args['back_url'], $args['desktop_message'] );
		echo '<div class="modula-takeover__boot" role="status" aria-live="polite" aria-busy="true">';
		echo '<span class="modula-takeover__boot-spinner" aria-hidden="true"></span>';
		echo '<span class="modula-takeover__boot-label">' . esc_html__( 'Loading editor…', 'modula-best-grid-gallery' ) . '</span>';
		echo '</div>';
		echo '</div>';

		// Sync the mount attribute from the early <html> flag (set in admin_head).
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded strings.
		echo '<script>(function(){var r=document.getElementById(' . wp_json_encode( $root_id ) . ');var a=document.documentElement.getAttribute(' . wp_json_encode( self::DOCUMENT_APPEARANCE_ATTR ) . ');if(r&&(a==="dark"||a==="light")){r.setAttribute("data-appearance",a);}})();</script>' . "\n";
	}

	/**
	 * Pre-React desktop-only notice (phones / tablets). Hidden on desktop via CSS.
	 *
	 * @param string $back_url Listing the Back link returns to.
	 * @param string $message  Why the editor needs a desktop.
	 * @return void
	 */
	private static function render_desktop_only_notice( $back_url, $message ) {
		$title_id = 'modula-desktop-only-title';

		echo '<div class="modula-takeover__desktop-only" role="region" aria-labelledby="' . esc_attr( $title_id ) . '">';
		echo '<div class="modula-takeover__desktop-only-inner">';
		echo '<span class="modula-takeover__desktop-only-icon" aria-hidden="true">';
		echo '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M20.2 5.8H3.8c-.4 0-.8.4-.8.8v9.6c0 .4.4.8.8.8H11v1.2H8.5v1.2h7V18.2H13v-1.2h7.2c.4 0 .8-.4.8-.8V6.6c0-.4-.4-.8-.8-.8zm-.6 9.6H4.4V7.2h15.2v8.2z"/></svg>';
		echo '</span>';
		echo '<h1 id="' . esc_attr( $title_id ) . '" class="modula-takeover__desktop-only-title">';
		echo esc_html__( 'Desktop only', 'modula-best-grid-gallery' );
		echo '</h1>';
		echo '<p class="modula-takeover__desktop-only-body">' . esc_html( $message ) . '</p>';
		echo '<a class="modula-takeover__desktop-only-back" href="' . esc_url( $back_url ) . '">';
		echo esc_html__( 'Back', 'modula-best-grid-gallery' );
		echo '</a>';
		echo '</div>';
		echo '</div>';
	}
}
