<?php
/**
 * Modula v2 settings registry.
 * Loads schema (grouped settings definition) and allows extensions to register extra groups/keys.
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Registry
 */
class Registry {

	/**
	 * Cached schema (settings groups + key definitions with type/default).
	 *
	 * @var array<string, array<string, array>>|null
	 */
	private static $schema = null;

	/**
	 * Path to generated schema JSON (tooling / React / docs — not the PHP runtime source).
	 * Created by `npm run generate:settings-schemas`; not tracked in git.
	 *
	 * @return string
	 */
	public static function get_schema_path() {
		return defined( 'MODULA_PATH' )
			? MODULA_PATH . 'apps/gallery-editor/generated/modula-settings-schema-v2.json'
			: '';
	}

	/**
	 * Get full schema: [ 'settings' => [ group => [ key => [ 'type' => ..., 'default' => ..., 'enum' => ... ] ] ], 'items' => ... ].
	 * Merged with extensions via filter modula_v2_settings_schema.
	 *
	 * @return array
	 */
	public static function get_schema() {
		if ( null !== self::$schema ) {
			return self::$schema;
		}
		$raw = Settings_Schema_Document::strip_editor_presentation_keys_from_settings(
			Settings_Schema_Document::get_settings_tree_raw()
		);
		/**
		 * Filter: extend or override v2 settings schema (e.g. from Pro extensions).
		 *
		 * @param array $schema Associative array: group => [ key => [ 'type' => 'string'|'integer'|'boolean'|'array'|'object', 'default' => ..., 'enum' => [...] ] ]
		 */
		self::$schema = apply_filters( 'modula_v2_settings_schema', $raw );
		return self::$schema;
	}

	/**
	 * Get definition for one key in a group (type, default, enum).
	 *
	 * @param string $group Group name.
	 * @param string $key   Key name (camelCase).
	 * @return array{type?: string, default?: mixed, enum?: array}|null
	 */
	public static function get_key_definition( $group, $key ) {
		$schema = self::get_schema();
		if ( ! isset( $schema[ $group ][ $key ] ) || ! is_array( $schema[ $group ][ $key ] ) ) {
			return null;
		}
		$def = $schema[ $group ][ $key ];
		$out = array();
		if ( isset( $def['type'] ) ) {
			$out['type'] = $def['type'];
		}
		if ( array_key_exists( 'default', $def ) ) {
			$out['default'] = $def['default'];
		}
		if ( ! empty( $def['enum'] ) && is_array( $def['enum'] ) ) {
			$out['enum'] = $def['enum'];
		}
		if ( ! empty( $def['minimum'] ) ) {
			$out['minimum'] = $def['minimum'];
		}
		if ( ! empty( $def['maximum'] ) ) {
			$out['maximum'] = $def['maximum'];
		}
		return $out;
	}

	/**
	 * Reset cached schema (e.g. after tests or when extensions load late).
	 */
	public static function reset() {
		self::$schema = null;
		Settings_Schema_Document::reset();
	}
}
