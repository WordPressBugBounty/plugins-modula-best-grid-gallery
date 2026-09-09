<?php
/**
 * Settings editor presentation strings: group labels, Lite upsells.
 * English group labels come from the v2 document `editorNavigation.groupLabels` (see settings-v2-editor-navigation.php).
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Settings_Editor_Presenter
 */
class Settings_Editor_Presenter {

	/**
	 * English group card labels from the v2 settings document (`editorNavigation.groupLabels`).
	 *
	 * @return array<string, string>
	 */
	public static function get_group_labels_for_export() {
		$doc = Settings_Schema_Document::get_document();
		if ( isset( $doc['editorNavigation']['groupLabels'] ) && is_array( $doc['editorNavigation']['groupLabels'] ) ) {
			/** @var array<string, string> $labels */
			$labels = $doc['editorNavigation']['groupLabels'];
			return $labels;
		}
		return array();
	}

	/**
	 * Localized group labels for wp_localize_script (modulaSettingsEditor.formUi.groupLabels).
	 *
	 * @return array<string, string>
	 */
	public static function get_localized_group_labels() {
		$out = array();
		foreach ( self::get_group_labels_for_export() as $id => $text ) {
			$out[ $id ] = __( $text, 'modula-best-grid-gallery' );
		}
		/**
		 * Filter localized group title strings for the v2 settings editor sidebar.
		 *
		 * @param array<string, string> $out Group id => translated label.
		 */
		return apply_filters( 'modula_settings_editor_group_labels', $out );
	}

	/**
	 * Raw upsell strings (English) before i18n; keyed by group id.
	 * Reserved for future group-level CTAs; section notices are not rendered in the React editor.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function get_default_group_upsells() {
		return array();
	}

	/**
	 * Upsells for wp_localize_script after filter and translation.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function get_group_upsells_for_localize() {
		/**
		 * Filter upsell copy and optional per-group upgrade URL before translation.
		 * Pro may replace URLs/messaging or clear entries.
		 *
		 * @param array<string, array<string, mixed>> $upsells
		 */
		$raw = apply_filters( 'modula_settings_editor_upsells', self::get_default_group_upsells() );
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$out = array();
		foreach ( $raw as $gid => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$item = array();
			if ( ! empty( $row['notice'] ) ) {
				$item['notice'] = __( $row['notice'], 'modula-best-grid-gallery' );
			}
			if ( ! empty( $row['cta'] ) ) {
				$item['cta'] = __( $row['cta'], 'modula-best-grid-gallery' );
			}
			if ( ! empty( $row['upgradeUrl'] ) ) {
				$item['upgradeUrl'] = $row['upgradeUrl'];
			}
			if ( $item ) {
				$out[ $gid ] = $item;
			}
		}
		return $out;
	}

	/**
	 * Runtime form UI merged into modulaSettingsEditor (localized).
	 *
	 * @return array<string, mixed>
	 */
	public static function get_form_ui_for_localize() {
		$base = array(
			'groupLabels' => self::get_localized_group_labels(),
		);
		/**
		 * Filter presentation payload for the React settings editor (localized strings, optional future keys).
		 *
		 * @param array<string, mixed> $base
		 */
		return apply_filters( 'modula_settings_editor_form_ui', $base );
	}
}
