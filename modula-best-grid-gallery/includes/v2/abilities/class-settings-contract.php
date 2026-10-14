<?php
/** Strict mutation schema derived from the editor's canonical constraints and gates. */
namespace Modula\V2\Abilities;

use Modula\V2\Settings\Registry;
use Modula\V2\Settings\Settings_Schema_Document;
defined( 'ABSPATH' ) || exit;
final class Settings_Contract {
	/** @var array<string,array> */
	private static $compiled = array();


	/** Currently writable subset. Preset contracts keep using this projection. */
	public static function schema( bool $album = false ): array {
		$compiled = self::compile( $album );
		$groups   = array();
		foreach ( $compiled['recognized']['properties'] as $group => $definition ) {
			$fields = array();
			foreach ( $definition['properties'] as $key => $shape ) {
				$rule = $compiled['rules'][ $group . '.' . $key ] ?? array();
				if ( ! empty( $rule['read_only'] ) ) {
					continue;
				}
				if ( ! empty( $rule['field'] ) && ! Field_Requirements::satisfied( $rule['field'] ) ) {
					continue;
				}
				if ( isset( $shape['enum'] ) && ! empty( $rule['values'] ) ) {
					$shape['enum'] = array_values(
						array_filter(
							$shape['enum'],
							static function ( $value ) use ( $rule ) {
								return ! isset( $rule['values'][ $value ] ) || Field_Requirements::all_satisfied( $rule['values'][ $value ] );
							}
						)
					);
					if ( ! $shape['enum'] ) {
						continue;
					}
				}
				$fields[ $key ] = $shape;
			}
			if ( $fields ) {
				$groups[ $group ] = Contract::object( $fields ) + array( 'minProperties' => 1 );
			}
		}
		return Contract::object( $groups ) + array( 'minProperties' => 1 );
	}

	/** Full safe vocabulary, including known locked fields and values. */
	public static function recognized( bool $album = false ): array {
		return self::compile( $album )['recognized'];
	}

	/** Detect supplied authored fields from the owning document, including explicit reset. */
	public static function has_authored_settings( array $settings ): bool {
		$rules = self::compile( false )['rules'];
		foreach ( $settings as $group => $fields ) {
			if ( ! is_array( $fields ) ) {
				continue;
			}
			foreach ( $fields as $key => $value ) {
				if ( $rules[ $group . '.' . $key ]['authored'] ?? false ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Prepare provider-owned setting values after protected feature admission.
	 * Authors are pure: common persistence remains in the gallery transaction.
	 *
	 * @return array|\WP_Error Prepared patch, or an explicit authoring failure.
	 */
	public static function prepare( int $id, array $settings ) {
		$rules = self::compile( false )['rules'];
		foreach ( $settings as $group => &$fields ) {
			foreach ( $fields as $key => &$value ) {
				$author = $rules[ $group . '.' . $key ]['author'] ?? null;
				if ( ! is_callable( $author ) ) {
					continue;
				}
				$value = call_user_func( $author, $id, $value );
				if ( is_wp_error( $value ) ) {
					return $value;
				}
			}
			unset( $value );
		}
		unset( $fields );
		return $settings;
	}

	/**
	 * Explicit requirements derived from the same document the editor reads.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function requirements( bool $album = false ): array {
		return self::compile( $album )['requirements'];
	}

	/**
	 * @return array{recognized:array,usable:array,requirements:array<int,array<string,mixed>>}
	 */
	public static function projection( bool $album = false ): array {
		return array(
			'recognized'   => self::recognized( $album ),
			'usable'       => self::schema( $album ),
			'requirements' => self::requirements( $album ),
		);
	}

	/**
	 * Structured blockers for requested locked fields or values. Unknown input is not given a feature explanation.
	 *
	 * @param array<string,mixed> $settings Requested settings patch.
	 * @return array<int,array<string,mixed>>
	 */
	public static function blockers( array $settings, bool $album = false ): array {
		$rules    = self::compile( $album )['rules'];
		$blockers = array();
		foreach ( $settings as $group => $fields ) {
			if ( ! is_string( $group ) || ! is_array( $fields ) ) {
				continue;
			}
			foreach ( $fields as $key => $value ) {
				$path = $group . '.' . $key;
				$rule = $rules[ $path ] ?? null;
				if ( ! is_array( $rule ) ) {
					continue;
				}
				$blockers = array_merge( $blockers, self::setting_blockers( $rule, $path, $value ) );
				$blockers = Field_Requirements::nested( $blockers, $path, $value );
			}
		}
		return self::unique( $blockers );
	}

	/**
	 * Combine feature admission and a recognized setting's unavailable write service.
	 *
	 * @param array<string,mixed> $rule Compiled field, value and write-availability metadata.
	 * @param mixed              $value Requested setting value.
	 * @return array<int,array<string,mixed>>
	 */
	private static function setting_blockers( array $rule, string $path, $value ): array {
		$requirements = Field_Requirements::for_requested_value( $rule, $value );
		$blockers     = self::requirement_blockers( $requirements, $path, $value );
		if ( $blockers || empty( $rule['read_only'] ) ) {
			return $blockers;
		}
		$blocker         = Availability::blocker( 'needs_service_update', $rule['field']['feature'] ?? 'gallery-settings', 'update_package', __( 'This setting is readable, but safe ability authoring is not available in this package. No requested changes were saved.', 'modula-best-grid-gallery' ) );
		$blocker['path'] = $path;
		return array( $blocker );
	}

	/**
	 * @param array<int,array{feature:string,scope:string}> $requirements Field and value restrictions.
	 * @param mixed                                      $value Requested field value.
	 * @return array<int,array<string,mixed>>
	 */
	private static function requirement_blockers( array $requirements, string $path, $value ): array {
		$blockers = array();
		foreach ( $requirements as $requirement ) {
			if ( Field_Requirements::satisfied( $requirement ) ) {
				continue;
			}
			$blockers = array_merge( $blockers, Availability::for_requirement( $requirement, $path, $value ) );
		}
		return $blockers;
	}

	/**
	 * @return array{recognized:array,rules:array<string,array>,requirements:array<int,array<string,mixed>>}
	 */
	private static function compile( bool $album ): array {
		$key = $album ? 'album' : 'gallery';
		if ( isset( self::$compiled[ $key ] ) ) {
			return self::$compiled[ $key ];
		}
		$schema  = $album ? \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() : Registry::get_schema();
		$read    = Contract::settings_schema( $schema );
		$raw     = $album ? \Modula_Pro\Extensions\Albums\V2\Settings_Schema_Document::get_settings_tree_raw() : Settings_Schema_Document::get_settings_tree_raw();
		$authors = apply_filters( 'modula_ability_setting_authors', array() );
		$authors = is_array( $authors ) ? $authors : array();
		$groups  = array();
		$rules   = array();
		$rows    = array();
		foreach ( $read['properties'] as $group => $definition ) {
			// Dedicated effects and credential configuration belong to their own operations.
			if ( in_array( $group, array( 'proofing', 'instagram', 'exportImport' ), true ) ) {
				continue;
			}
			$fields = array();
			foreach ( $definition['properties'] as $field => $shape ) {
				$source       = $schema[ $group ][ $field ];
				$presentation = $raw[ $group ][ $field ] ?? array();
				$shape        = self::constraints( $shape, $source );
				$field_rule   = Field_Requirements::for_field( $presentation );
				$value_rules  = Field_Requirements::for_values( $presentation );
				$path         = $group . '.' . $field;
				$authored     = ! empty( $presentation['abilityAuthor'] );
				$author       = $authored ? ( $authors[ $path ] ?? null ) : null;
				$read_only    = ! empty( $presentation['abilityReadOnly'] ) || ( $authored && ! is_callable( $author ) );
				if ( $read_only ) {
					$shape['readOnly'] = true;
				}
				$rules[ $path ] = array(
					'field'     => $field_rule,
					'values'    => $value_rules,
					'read_only' => $read_only,
					'author'    => is_callable( $author ) ? $author : null,
					'authored'  => $authored,
				);
				if ( $field_rule || $value_rules || $read_only ) {
					$row = array( 'path' => $path );
					if ( $read_only ) {
						$row['writable'] = false;
					}
					if ( $field_rule ) {
						$row['feature'] = $field_rule['feature'];
						$row['scope']   = $field_rule['scope'];
					}
					if ( $value_rules ) {
						$row['values'] = self::value_requirement_rows( $value_rules );
					}
					$rows[] = $row;
				}
				$fields[ $field ] = $shape;
			}
			if ( $fields ) {
				$groups[ $group ] = Contract::object( $fields ) + array( 'minProperties' => 1 );
			}
		}
		self::$compiled[ $key ] = array(
			'recognized'   => Contract::object( $groups ) + array( 'minProperties' => 1 ),
			'rules'        => $rules,
			'requirements' => $rows,
		);
		return self::$compiled[ $key ];
	}

	/**
	 * @param array<string,array<int,array{feature:string,scope:string}>> $value_rules Value requirements.
	 * @return array<int,array{value:string,feature:string,scope:string}>
	 */
	private static function value_requirement_rows( array $value_rules ): array {
		$rows = array();
		foreach ( $value_rules as $value => $requirements ) {
			foreach ( $requirements as $requirement ) {
				$rows[] = array( 'value' => $value ) + $requirement;
			}
		}
		return $rows;
	}

	public static function extension( string $slug ): bool {
		$status = Pro_Dependency::extensions();
		return ! empty( $status[ $slug ]['available'] ) && ! empty( $status[ $slug ]['enabled'] ) && Pro_Dependency::extension_contract( $slug );
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
			$shape['items']    = self::constraints( $shape['items'], $source['items'] ?? array() );
		}
		if ( 'object' === $shape['type'] ) {
			$shape['required'] = array_keys( $shape['properties'] );
			foreach ( $shape['properties'] as $key => $child ) {
				$shape['properties'][ $key ] = self::constraints( $child, $source['properties'][ $key ] ?? array() );
			}
		}
		return $shape;
	}

	/**
	 * @param array<int,array<string,mixed>> $blockers Collected blockers.
	 * @return array<int,array<string,mixed>>
	 */
	private static function unique( array $blockers ): array {
		$out  = array();
		$seen = array();
		foreach ( $blockers as $blocker ) {
			if ( ! is_array( $blocker ) || ! isset( $blocker['reason'], $blocker['feature'], $blocker['remedy'] ) || ! is_array( $blocker['remedy'] ) ) {
				continue;
			}
			$key = $blocker['reason'] . '|' . $blocker['feature'] . '|' . ( $blocker['path'] ?? '' ) . '|' . wp_json_encode( $blocker['value'] ?? null );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$out[]        = $blocker;
		}
		return $out;
	}

	/** Core accepts numeric strings; mutations require actual JSON types recursively. */
	public static function strict_types( $value, array $schema ): bool {
		$type = $schema['type'];
		if ( is_array( $type ) ) {
			foreach ( $type as $candidate ) {
				if ( self::strict_types( $value, array_replace( $schema, array( 'type' => $candidate ) ) ) ) {
					return true;
				}
			}
			return false;
		}
		if ( 'object' === $type ) {
			if ( ! is_array( $value ) || ( $value && array_values( $value ) === $value ) ) {
				return false;
			}
			// No property map means the document is not loaded. Let the explanation judge the request.
			if ( ! array_key_exists( 'properties', $schema ) ) {
				return true;
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
