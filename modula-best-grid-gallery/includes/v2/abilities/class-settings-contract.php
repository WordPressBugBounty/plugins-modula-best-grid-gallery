<?php
/** Strict mutation schema derived from the editor's canonical constraints and gates. */
namespace Modula\V2\Abilities;
use Modula\V2\Settings\Registry;
use Modula\V2\Settings\Settings_Schema_Document;
defined( 'ABSPATH' ) || exit;
final class Settings_Contract {
	public static function schema( bool $album = false ): array {
		$schema = $album ? \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() : Registry::get_schema();
		$read = Contract::settings_schema( $schema );
		$raw = $album ? \Modula_Pro\Extensions\Albums\V2\Settings_Schema_Document::get_settings_tree_raw() : Settings_Schema_Document::get_settings_tree_raw();
		$groups = array();
		foreach ( $read['properties'] as $group => $definition ) {
			// Dedicated effects and credential configuration belong to their own operations.
			if ( in_array( $group, array( 'proofing', 'instagram', 'exportImport' ), true ) ) {
				continue;
			}
			$fields = array();
			foreach ( $definition['properties'] as $key => $shape ) {
				$source = $schema[ $group ][ $key ];
				$presentation = $raw[ $group ][ $key ] ?? array();
				if ( ! self::available( $group, $presentation, $raw ) ) {
					continue;
				}
				$shape = self::constraints( $shape, $source );
				if ( ! empty( $presentation['proEnhancements'] ) && isset( $source['enum'] ) ) {
					$shape['enum'] = array_values( array_filter( $source['enum'], static function ( $value ) use ( $presentation ) {
						return self::value_available( $presentation, $value );
					}
					) );
				}
				$fields[ $key ] = $shape;
			}
			if ( $fields ) {
				$groups[ $group ] = Contract::object( $fields ) + array( 'minProperties' => 1 );
			}
		}
		return Contract::object( $groups ) + array( 'minProperties' => 1 );
	}
	private static function constraints( array $shape, array $source ): array {
		foreach ( array( 'enum', 'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern' ) as $key ) {
			if ( array_key_exists( $key, $source ) ) {
				$shape[ $key ] = $source[ $key ];
			}
		}
		if ( 'string' === $shape['type'] && ! isset( $shape['maxLength'] ) ) {
			$shape['maxLength'] = 65536;
		}
		if ( 'array' === $shape['type'] ) {
			$shape['maxItems'] = $shape['maxItems'] ?? 1000;
			$shape['items'] = self::constraints( $shape['items'], $source['items'] ?? array() );
		}
		if ( 'object' === $shape['type'] ) {
			$shape['required'] = array_keys( $shape['properties'] );
			foreach ( $shape['properties'] as $key => $child ) {
				$shape['properties'][ $key ] = self::constraints( $child, $source['properties'][ $key ] ?? array() );
			}
		}
		return $shape;
	}
	private static function pro(): bool {
		return Pro_Dependency::available();
	}
	public static function extension( string $slug ): bool {
		$status = Pro_Dependency::extensions();
		return ! empty( $status[ $slug ]['available'] ) && ! empty( $status[ $slug ]['enabled'] ) && Pro_Dependency::extension_contract( $slug );
	}
	private static function available( string $group, array $field, array $raw ): bool {
		if ( ! self::pro() && ! empty( $field['editorOmitControlInLite'] ) ) {
			return false;
		}
		if ( ! self::pro() && isset( $field['editorShowInLite'] ) && ! $field['editorShowInLite'] ) {
			return false;
		}
		$slug = $field['editorRequiresExtensionEnabled'] ?? '';
		if ( 'performance' === $group && '' === $slug ) {
			return true;
		}
		foreach ( $raw[ $group ] ?? array() as $definition ) {
			$slug = $slug ?: ( $definition['editorLightboxLiteUpsell']['extensionSlug'] ?? '' );
		}
		return '' === $slug || self::extension( $slug );
	}
	private static function value_available( array $definition, $value ): bool {
		$gates = $definition['proEnhancements'];
		if ( in_array( $value, $gates['base'] ?? array(), true ) && ! self::pro() ) {
			return false;
		}
		foreach ( $gates['extensionBased'] ?? array() as $slug => $values ) {
			if ( in_array( $value, $values, true ) && ! self::extension( $slug ) ) {
				return false;
			}
		}
		return true;
	}
	/** Core accepts numeric strings; mutations require actual JSON types recursively. */
	public static function strict_types( $value, array $schema ): bool {
		$type = $schema['type'];
		if ( is_array( $type ) ) {
			foreach ( $type as $candidate ) {
				if ( self::strict_types( $value, array_replace( $schema, array( 'type' => $candidate ) ) ) ) { return true; }
			}
			return false;
		}
		if ( 'object' === $type ) {
			if ( ! is_array( $value ) || ( $value && array_values( $value ) === $value ) ) {
				return false;
			}
			foreach ( $value as $key => $child ) {
				if ( ! isset( $schema['properties'][ $key ] ) || ! self::strict_types( $child, $schema['properties'][ $key ] ) ) {
					return false;
				}
			}
			return true;
		}
		if ( 'array' === $type ) {
			if ( ! is_array( $value ) || array_values( $value ) !== $value ) {
				return false;
			}
			foreach ( $value as $child ) {
				if ( ! self::strict_types( $child, $schema['items'] ) ) {
					return false;
				}
			}
			return true;
		}
		return ( 'integer' === $type && is_int( $value ) ) || ( 'number' === $type && ( is_int( $value ) || is_float( $value ) ) ) || ( 'boolean' === $type && is_bool( $value ) ) || ( 'string' === $type && is_string( $value ) );
	}
}
