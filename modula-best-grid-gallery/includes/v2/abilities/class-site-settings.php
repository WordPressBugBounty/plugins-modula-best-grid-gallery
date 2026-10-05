<?php
/** Closed site settings projection and explicit, recoverable extension administration. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Site_Settings {
	public const READ = 'modula/read-site-settings';
	public const UPDATE = 'modula/update-site-settings';
	public const EXTENSION = 'modula/set-extension';
	public static function mutations(): array {
		return array( self::UPDATE, self::EXTENSION );
	}
	public static function callbacks(): array {
		return array( self::READ => array( self::class, 'read' ), self::UPDATE => array( self::class, 'update' ), self::EXTENSION => array( self::class, 'extension' ) );
	}
	private static function pro(): bool {
		return function_exists( 'modula_is_compatible_pro' ) && modula_is_compatible_pro();
	}
	public static function can_manage(): bool {
		return get_current_user_id() && current_user_can( 'manage_options' );
	}
	public static function can_extend(): bool {
		return self::can_manage() && current_user_can( 'activate_plugins' ) && Pro_Dependency::can_toggle();
	}
	/** Explicit allowlist: never derive it from secret-bearing admin defaults or plugin filters. */
	public static function schema(): array {
		$text = array( 'type' => 'string', 'maxLength' => 200 );
		$toggle = array( 'type' => 'string', 'enum' => array( 'enabled', 'disabled' ) );
		$standalone = Contract::object( array( 'enable_rewrite' => $toggle, 'slug' => array( 'type' => 'string', 'maxLength' => 100, 'pattern' => '^[a-z0-9]+(?:-[a-z0-9]+)*$' ) ) );
		$compression = array( 'type' => 'string', 'enum' => array( 'lossless', 'lossy', 'glossy', 'disabled' ) );
		return Contract::object( array(
		'modula_image_licensing_option' => Contract::object( array( 'image_licensing_author' => $text, 'image_licensing_company' => $text, 'image_licensing' => array( 'type' => 'string', 'enum' => array_keys( \Modula_Helper::get_image_licenses() ) ), 'display_with_description' => array( 'type' => 'boolean' ) ) ),
		'modula_standalone' => Contract::object( array( 'gallery' => $standalone, 'album' => $standalone ) ),
		'modula_speedup' => Contract::object( array( 'enable_optimization' => $toggle, 'thumbnail_optimization' => $compression, 'lightbox_optimization' => $compression ) ),
		'mas_gallery_link' => array( 'type' => 'string', 'maxLength' => 100, 'pattern' => '^[a-zA-Z][a-zA-Z0-9_-]*$' ),
		'modula_watermark' => Contract::object( array(
		'watermark_image' => array( 'type' => 'integer', 'minimum' => 0 ), 'watermark_position' => array( 'type' => 'string', 'enum' => array( 'top_left', 'top_right', 'bottom_right', 'bottom_left', 'center' ) ),
		'watermark_margin' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 50 ), 'watermark_image_dimension_width' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 10000 ), 'watermark_image_dimension_height' => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 10000 ), 'watermark_enable_backup' => array( 'type' => 'boolean' ),
		) ),
		) );
	}
	public static function definitions(): array {
		$base = array( 'request_id' => Contract::request_id_schema(), 'revision' => Contract::revision_schema() );
		$feature = Contract::object( array( 'available' => array( 'type' => 'boolean' ), 'enabled' => array( 'type' => 'boolean' ) ), array( 'available', 'enabled' ) );
		$output = Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'revision' => Contract::revision_schema(), 'settings' => self::read_schema( self::schema() ), 'compatible_pro' => array( 'type' => 'boolean' ), 'license_status' => array( 'type' => 'string' ), 'license_source' => array( 'type' => 'string', 'enum' => array( 'stored' ) ), 'extensions' => array( 'type' => 'object', 'additionalProperties' => $feature ) ), array( 'schema_version', 'revision', 'settings', 'compatible_pro', 'license_status', 'license_source', 'extensions' ) );
		return array(
		self::READ => array( 'label' => 'Read Modula Settings', 'description' => 'manage_options required. Read supported non-secret settings and stored license/extension status without provider refresh, repairs or side effects. Credentials, roles, AI/provider and Diagnostics controls remain outside this contract.', 'input_schema' => Contract::object( array() ) + array( 'default' => array() ), 'output_schema' => $output ),
		self::UPDATE => array( 'label' => 'Update Modula Settings', 'description' => 'Patch only allowlisted non-secret fields against the site revision; preserve omitted configuration. Requires manage_options and feature entitlement. Standalone changes schedule the existing rewrite refresh. Watermark configuration does not watermark files. 30-day recovery, no license/provider refresh.', 'input_schema' => Contract::object( $base + array( 'settings' => self::schema() + array( 'minProperties' => 1 ) ), array( 'request_id', 'revision', 'settings' ) ), 'output_schema' => Contract::outcome_schema() ),
		self::EXTENSION => array( 'label' => 'Set Modula extension state', 'description' => 'Explicit desired enabled state, manage_options plus activate_plugins and Compatible Pro required. Activation requires stored entitlement. Uses existing activation/deactivation hooks, with no implicit license refresh; subsequent requests load the new state. Revision and 30-day recovery prevent repeat hooks.', 'input_schema' => Contract::object( $base + array( 'extension' => array( 'type' => 'string', 'pattern' => '^modula-[a-z-]+$', 'maxLength' => 80 ), 'enabled' => array( 'type' => 'boolean' ) ), array( 'request_id', 'revision', 'extension', 'enabled' ) ), 'output_schema' => Contract::outcome_schema() ),
		);
	}
	private static function read_schema( array $schema ): array {
		foreach ( array( 'enum', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum' ) as $key ) {
			unset( $schema[ $key ] );
		}
		foreach ( $schema['properties'] ?? array() as $key => $child ) {
			$schema['properties'][ $key ] = self::read_schema( $child );
		}
		return $schema;
	}
	/** Normalize only known historical scalar encodings; never mutate stored options. */
	private static function normalize_stored( $value, array $schema ) {
		if ( 'object' === $schema['type'] && is_array( $value ) ) {
			foreach ( $schema['properties'] as $key => $child ) {
				if ( array_key_exists( $key, $value ) ) { $value[ $key ] = self::normalize_stored( $value[ $key ], $child ); }
			}
		} elseif ( 'boolean' === $schema['type'] && in_array( $value, array( '', 0, 1, '0', '1' ), true ) ) {
			$value = (bool) $value;
		} elseif ( 'integer' === $schema['type'] && is_string( $value ) && preg_match( '/^[0-9]{1,9}$/', $value ) ) {
			$value = (int) $value;
		}
		return $value;
	}
	private static function options(): array {
		return array_merge( array_keys( self::schema()['properties'] ), array( 'modula_pro_active_extensions', 'modula_pro_current_plan', 'modula_pro_license_data' ) );
	}
	/** Locks existing rows and missing-option gaps, so ordinary admin writes also conflict. */
	public static function revision( bool $lock = false ): string {
		global $wpdb;
		$names = self::options();
		sort( $names );
		$sql = $wpdb->prepare( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN (" . implode( ',', array_fill( 0, count( $names ), '%s' ) ) . ') ORDER BY option_name' . ( $lock ? ' FOR UPDATE' : '' ), $names );
		$rows = $wpdb->get_results( $sql, ARRAY_A );
		if ( null === $rows || $wpdb->last_error ) {
			throw new \RuntimeException( 'Settings revision unavailable.' );
		}
		self::clear_cache();
		return hash( 'sha256', wp_json_encode( $rows ) );
	}
	private static function clear_cache(): void {
		foreach ( self::options() as $name ) {
			wp_cache_delete( $name, 'options' );
		}
		wp_cache_delete( 'alloptions', 'options' );
		wp_cache_delete( 'notoptions', 'options' );
		if ( Pro_Dependency::available() && Pro_Dependency::methods( '\Modula_Pro\Extensions\Extensions', array( 'clear_active_extensions_cache' => 0 ), false ) ) {
			\Modula_Pro\Extensions\Extensions::get_instance()->clear_active_extensions_cache();
		}
	}
	public static function read( array $input ) {
		if ( ! self::can_manage() ) {
			return new \WP_Error( 'modula_forbidden', 'Current global settings permissions are required.' );
		}
		$revision = self::revision();
		$settings = array();
		foreach ( self::schema()['properties'] as $name => $schema ) {
			$value = get_option( $name, null );
			if ( null !== $value ) {
				$projected = Contract::project( self::normalize_stored( $value, $schema ), $schema );
				if ( null !== $projected ) {
					$settings[ $name ] = $projected;
				}
			}
		}
		$pro = self::pro();
		$extensions = Pro_Dependency::extensions();
		$status = Pro_Dependency::license_status();
		if ( ! hash_equals( $revision, self::revision() ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Settings changed during inspection; read again.' );
		}
		return array( 'schema_version' => Contract::VERSION, 'revision' => $revision, 'settings' => $settings ?: new \stdClass(), 'compatible_pro' => $pro, 'license_status' => $status, 'license_source' => 'stored', 'extensions' => $extensions ?: new \stdClass() );
	}
	private static function valid_patch( array $patch ): bool {
		if ( ! $patch || is_wp_error( rest_validate_value_from_schema( $patch, self::schema(), 'settings' ) ) || ! Settings_Contract::strict_types( $patch, self::schema() ) ) {
			return false;
		}
		foreach ( $patch as $name => $value ) {
			if ( is_array( $value ) && ! $value ) {
				return false;
			}
			$gate = array( 'modula_standalone' => 'modula-standalone', 'modula_speedup' => 'modula-speedup', 'mas_gallery_link' => 'modula-advanced-shortcodes', 'modula_watermark' => 'modula-watermark' );
			if ( isset( $gate[ $name ] ) && ! Settings_Contract::extension( $gate[ $name ] ) ) {
				return false;
			}
			if ( 'modula_standalone' === $name && ( ! self::pro() || isset( $value['album'] ) && ! Settings_Contract::extension( 'modula-albums' ) ) ) {
				return false;
			}
		}
		$image = $patch['modula_watermark']['watermark_image'] ?? 0;
		return ! $image || Creation::can_use_attachments( array( $image ) );
	}
	public static function update( array $input ): array {
		return self::write( $input, self::UPDATE );
	}
	public static function extension( array $input ): array {
		return self::write( $input, self::EXTENSION );
	}
	private static function write( array $input, string $operation ): array {
		$out = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, $operation );
		};
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! self::can_manage() || self::EXTENSION === $operation && ! self::can_extend() ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current global settings and extension permissions are required.' );
		}
		if ( self::UPDATE === $operation && ! self::valid_patch( $input['settings'] ) ) {
			return $out( 'rejected', 'invalid_settings', 'Invalid, unavailable or empty settings patch.' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$transaction = false;
		try {
			Revision::begin();
			$transaction = true;
			if ( ! hash_equals( self::revision( true ), $input['revision'] ) ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision', 'Read current settings and reconcile before a new request.' ) );
			}
			if ( ! self::can_manage() ) {
				throw new \RuntimeException( 'Access changed.' );
			}
			if ( self::EXTENSION === $operation ) {
				if ( ! self::can_extend() ) {
					throw new \RuntimeException( 'Access changed.' );
				}
				$extensions = \Modula_Pro\Extensions\Extensions::get_instance();
				$status = $extensions->get_read_only_extension_status()[ $input['extension'] ] ?? null;
				if ( ! $status || $input['enabled'] && ! $status['available'] ) {
					Revision::end( false );
					$transaction = false;
					return Requests::finish( $input['request_id'], $out( 'rejected', 'extension_unavailable', 'The extension is unknown or lacks stored entitlement.' ) );
				}
				if ( $status['enabled'] !== $input['enabled'] ) {
					$extensions->toggle_active_status_of_extensions( array( $input['extension'] ), $input['enabled'] ? 'activate' : 'deactivate' );
				}
				if ( $extensions->get_read_only_extension_status()[ $input['extension'] ]['enabled'] !== $input['enabled'] ) {
					throw new \RuntimeException( 'Extension write unconfirmed.' );
				}
			} else {
				if ( ! self::valid_patch( $input['settings'] ) ) {
					throw new \RuntimeException( 'Availability changed.' );
				}
				foreach ( $input['settings'] as $name => $patch ) {
					$value = is_array( $patch ) ? array_replace_recursive( (array) get_option( $name, array() ), self::sanitize( $patch ) ) : sanitize_text_field( $patch );
					$value = apply_filters( 'modula_settings_api_pre_update_' . $name, $value, $name );
					update_option( $name, $value );
					do_action( 'modula_settings_api_update_' . $name, $value );
					self::clear_cache();
					if ( get_option( $name ) !== $value ) {
						throw new \RuntimeException( 'Settings write unconfirmed.' );
					}
				}
			}
			$result = $out( 'succeeded' );
			$result['revision'] = self::revision();
			$result = Requests::finish( $input['request_id'], $result );
			Revision::end( true );
			$transaction = false;
			self::clear_cache();
			return $result;
		} catch ( \Throwable $error ) {
			if ( $transaction ) {
				Revision::end( false );
			}
			self::clear_cache();
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'settings_unconfirmed', 'Settings or extension hooks could not be confirmed. Recover and inspect before a new action.' ) );
		}
	}
	private static function sanitize( array $patch ): array {
		foreach ( $patch as &$value ) {
			$value = is_array( $value ) ? self::sanitize( $value ) : ( is_string( $value ) ? sanitize_text_field( $value ) : $value );
		}
		return $patch;
	}
}
