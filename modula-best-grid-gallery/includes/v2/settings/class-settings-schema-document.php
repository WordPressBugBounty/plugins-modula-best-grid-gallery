<?php
/**
 * Loads the canonical v2 settings schema document from PHP (types, defaults, items, metadata).
 * The array lives in includes/v2/settings/data/settings-v2-document.php.
 * Optional default tooltips: settings-v2-editor-field-help.php (merged when editorDescription is empty).
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Settings_Schema_Document
 */
class Settings_Schema_Document {

	/**
	 * @var array<string, mixed>|null
	 */
	private static $document = null;

	/**
	 * Full document: $schema, $id, title, description, version, settings, items, flatToGroupedMapping*, etc.
	 *
	 * @return array<string, mixed>
	 */
	public static function get_document() {
		if ( null !== self::$document ) {
			return self::$document;
		}
		$data_file = __DIR__ . '/data/settings-v2-document.php';
		if ( ! is_readable( $data_file ) ) {
			self::$document = array();
			return self::$document;
		}
		/** @var array<string, mixed> $loaded */
		$loaded         = require $data_file;
		self::$document = is_array( $loaded ) ? self::merge_editor_field_help_strings( $loaded ) : array();
		return self::$document;
	}

	/**
	 * Fill editorDescription from settings-v2-editor-field-help.php when the main document omits it.
	 *
	 * @param array<string, mixed> $doc Full v2 document.
	 * @return array<string, mixed>
	 */
	private static function merge_editor_field_help_strings( array $doc ) {
		$help_file = __DIR__ . '/data/settings-v2-editor-field-help.php';
		if ( ! is_readable( $help_file ) ) {
			return $doc;
		}
		/** @var array<string, string> $flat */
		$flat = require $help_file;
		if ( ! is_array( $flat ) || empty( $flat ) ) {
			return $doc;
		}
		if ( ! isset( $doc['settings'] ) || ! is_array( $doc['settings'] ) ) {
			return $doc;
		}
		foreach ( $flat as $path => $text ) {
			if ( ! is_string( $path ) || '' === $path || ! is_string( $text ) || '' === $text ) {
				continue;
			}
			$dot = strpos( $path, '.' );
			if ( false === $dot ) {
				continue;
			}
			$group = substr( $path, 0, $dot );
			$key   = substr( $path, $dot + 1 );
			if ( '' === $group || '' === $key ) {
				continue;
			}
			if ( ! isset( $doc['settings'][ $group ][ $key ] ) || ! is_array( $doc['settings'][ $group ][ $key ] ) ) {
				continue;
			}
			$field = &$doc['settings'][ $group ][ $key ];
			if ( ! empty( $field['editorDescription'] ) && is_string( $field['editorDescription'] ) ) {
				unset( $field );
				continue;
			}
			$field['editorDescription'] = $text;
			unset( $field );
		}
		return $doc;
	}

	/**
	 * Uncached tree under `settings` (not filtered — use Registry::get_schema() for filtered settings).
	 *
	 * @return array<string, array<string, array<string, mixed>>>
	 */
	public static function get_settings_tree_raw() {
		$doc = self::get_document();
		return isset( $doc['settings'] ) && is_array( $doc['settings'] ) ? $doc['settings'] : array();
	}

	/**
	 * English option labels for an enum field (`enumOptionLabels`).
	 *
	 * @param string $group Group id (e.g. `general`).
	 * @param string $key   Field key (e.g. `type`).
	 * @return array<string, string> Stored value => product name.
	 */
	public static function get_enum_option_labels( $group, $key ) {
		if ( ! is_string( $group ) || '' === $group || ! is_string( $key ) || '' === $key ) {
			return array();
		}
		$tree = self::get_settings_tree_raw();
		if ( ! isset( $tree[ $group ][ $key ] ) || ! is_array( $tree[ $group ][ $key ] ) ) {
			return array();
		}
		$map = isset( $tree[ $group ][ $key ]['enumOptionLabels'] ) && is_array( $tree[ $group ][ $key ]['enumOptionLabels'] )
			? $tree[ $group ][ $key ]['enumOptionLabels']
			: array();
		$out = array();
		foreach ( $map as $slug => $label ) {
			if ( ! is_string( $slug ) || '' === $slug || ! is_string( $label ) || '' === $label ) {
				continue;
			}
			$out[ $slug ] = $label;
		}
		return $out;
	}

	/**
	 * Remove keys used only by the settings editor export (labels, select option text, product gates). Keeps runtime / REST schema lean.
	 *
	 * @param array<string, array<string, mixed>> $settings Group => field key => definition.
	 * @return array<string, array<string, mixed>>
	 */
	public static function strip_editor_presentation_keys_from_settings( array $settings ) {
		$out = array();
		foreach ( $settings as $group => $fields ) {
			if ( ! is_array( $fields ) ) {
				$out[ $group ] = $fields;
				continue;
			}
			$out[ $group ] = array();
			foreach ( $fields as $key => $def ) {
				if ( is_array( $def ) && ! empty( $def['editorPresentationOnly'] ) ) {
					continue;
				}
				if ( ! is_array( $def ) ) {
					$out[ $group ][ $key ] = $def;
					continue;
				}
				$clean = $def;
				unset(
					$clean['editorLabel'],
					$clean['enumOptionLabels'],
					$clean['editorControl'],
					$clean['editorDescription'],
					$clean['editorTooltip'],
					$clean['proEnhancements'],
					$clean['editorOptionGroups'],
					$clean['editorGalleryTypeUpsell'],
					$clean['editorLightboxLiteUpsell'],
					$clean['editorShowInLite'],
					$clean['editorDisabledInLite'],
					$clean['editorOmitControlInLite'],
					$clean['editorOmitFromSettingsSidebar'],
					$clean['editorRequiresExtensionEnabled'],
					$clean['editorPresentationOnly'],
					$clean['editorAdvancedOnly'],
					$clean['editorSidebarNestedPanel'],
					$clean['editorSidebarNestedOnly'],
					$clean['editorDisabledWhen']
				);
				$out[ $group ][ $key ] = $clean;
			}
		}
		return $out;
	}

	/**
	 * Reset cached document (tests / late-loaded overrides).
	 */
	public static function reset() {
		self::$document = null;
	}
}
