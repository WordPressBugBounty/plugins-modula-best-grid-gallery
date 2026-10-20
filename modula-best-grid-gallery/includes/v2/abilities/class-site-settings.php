<?php
/** Closed site settings projection and explicit, recoverable extension administration. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Site_Settings {
	public const PROVIDER  = 'modula-lite-site-administration';
	public const READ      = 'modula/read-site-settings';
	public const UPDATE    = 'modula/update-site-settings';
	public const EXTENSION = 'modula/set-extension';

	/** Modula-owned capability to read and change Modula → Settings. */
	public const MANAGE_CAPABILITY = 'modula_manage_settings';

	/** Modula-owned capability to turn the Modula extensions of the license package on or off. */
	public const EXTENSION_CAPABILITY = 'modula_toggle_extensions';

	/**
	 * The WordPress capabilities a person needs for each Modula capability. The Modula agent
	 * never holds them; Agent_Access grants it the Modula capabilities themselves, only while a
	 * Modula tool runs (ADR 0045).
	 */
	private const CAPABILITY_MAP = array(
		self::MANAGE_CAPABILITY    => array( 'manage_options' ),
		self::EXTENSION_CAPABILITY => array( 'manage_options', 'activate_plugins' ),
	);

	/**
	 * The Modula-owned capabilities, which Agent_Access grants the agent during a Modula tool call.
	 *
	 * @return string[]
	 */
	public static function capabilities(): array {
		return array_keys( self::CAPABILITY_MAP );
	}

	/**
	 * Maps a Modula capability to what its holder needs: WordPress capabilities for people, the
	 * Modula capability itself for the agent.
	 *
	 * @param string[] $caps    Primitive capabilities the capability maps to so far.
	 * @param string   $cap     Capability being checked.
	 * @param int      $user_id User being checked.
	 * @return string[]
	 */
	public static function map_capability( $caps, $cap, $user_id ) {
		if ( ! isset( self::CAPABILITY_MAP[ $cap ] ) ) {
			return $caps;
		}
		return Agent::is_agent( (int) $user_id ) ? array( $cap ) : self::CAPABILITY_MAP[ $cap ];
	}

	public static function mutations(): array {
		return array( self::UPDATE, self::EXTENSION );
	}
	public static function callbacks(): array {
		return array(
			self::READ      => array( self::class, 'read' ),
			self::UPDATE    => array( self::class, 'update' ),
			self::EXTENSION => Site_Explanation::handler( self::EXTENSION ),
		);
	}
	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'permission' => array( self::class, 'can_manage' ),
				'available'  => array( self::class, 'can_manage' ),
			),
			array(
				self::EXTENSION => array(
					'permission'     => array( self::class, 'can_manage' ),
					// Pro contributes the toggle only when its service supports it, so discovery needs just the capability.
					'available'      => array( self::class, 'can_activate' ),
					'requires_pro'   => true,
					'executor_ready' => array( self::class, 'executor_ready' ),
				),
			)
		);
	}
	private static function pro(): bool {
		return function_exists( 'modula_is_compatible_pro' ) && modula_is_compatible_pro();
	}
	public static function can_manage(): bool {
		return get_current_user_id() && current_user_can( self::MANAGE_CAPABILITY );
	}

	/** Capability for an extension toggle; for people it includes manage_options. Commercial readiness is not a permission. */
	public static function can_activate(): bool {
		return get_current_user_id() && current_user_can( self::EXTENSION_CAPABILITY );
	}

	/** Recovery reads a retained toggle. It does not require Pro and does not run hooks again. */
	public static function can_recover_extension(): bool {
		return self::can_activate();
	}


	/**
	 * Signature of the Pro extension toggle. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array(
			self::EXTENSION => array( 'run' => 2 ),
		);
	}

	/** Inspect the executor signature without constructing a service. */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Abilities\Site_Executor', $methods[ $name ] );
	}

	public static function boot(): void {
		add_filter( 'map_meta_cap', array( self::class, 'map_capability' ), 10, 3 );
		$operations = array(
			self::READ   => array( 'execute' => array( self::class, 'read' ) ),
			self::UPDATE => array( 'execute' => array( self::class, 'update' ) ),
		);
		foreach ( Diagnostics::callbacks() as $name => $execute ) {
			$operations[ $name ] = array( 'execute' => $execute );
		}
		Providers::contribute(
			array(
				'provider'   => self::PROVIDER,
				'protocol'   => Providers::PROTOCOL,
				'operations' => $operations,
			)
		);
		Outcomes::register_recovery( self::UPDATE, array( self::class, 'can_manage' ) );
		foreach ( Diagnostics::mutations() as $name ) {
			Outcomes::register_recovery( $name, array( Diagnostics::class, 'can_manage' ) );
		}
	}

	/**
	 * Option groups whose writes belong to Pro. Free licensing stays out of this map.
	 *
	 * @return array<string,string>
	 */
	public static function premium_map(): array {
		return array(
			'modula_standalone' => 'modula-standalone',
			'modula_speedup'    => 'modula-speedup',
			'mas_gallery_link'  => 'modula-advanced-shortcodes',
			'modula_watermark'  => 'modula-watermark',
		);
	}

	public static function extension_ready( string $slug ): bool {
		return Settings_Contract::extension( $slug );
	}

	public static function writer_ready(): bool {
		return Pro_Dependency::methods( '\Modula_Pro\Abilities\Site_Executor', array( 'write_premium' => 1 ) );
	}
	/** Explicit allowlist: never derive it from secret-bearing admin defaults or plugin filters. */
	public static function schema(): array {
		$text        = array(
			'type'      => 'string',
			'maxLength' => 200,
		);
		$toggle      = array(
			'type' => 'string',
			'enum' => array( 'enabled', 'disabled' ),
		);
		$standalone  = Contract::object(
			array(
				'enable_rewrite' => $toggle,
				'slug'           => array(
					'type'      => 'string',
					'maxLength' => 100,
					'pattern'   => '^[a-z0-9]+(?:-[a-z0-9]+)*$',
				),
			)
		);
		$compression = array(
			'type' => 'string',
			'enum' => array( 'lossless', 'lossy', 'glossy', 'disabled' ),
		);
		return Contract::object(
			array(
				'modula_image_licensing_option' => Contract::object(
					array(
						'image_licensing_author'   => $text,
						'image_licensing_company'  => $text,
						'image_licensing'          => array(
							'type' => 'string',
							'enum' => class_exists( 'Modula_Helper' ) ? array_keys( \Modula_Helper::get_image_licenses() ) : array( 'none' ),
						),
						'display_with_description' => array( 'type' => 'boolean' ),
					)
				),
				'modula_standalone'             => Contract::object(
					array(
						'gallery' => $standalone,
						'album'   => $standalone,
					)
				),
				'modula_speedup'                => Contract::object(
					array(
						'enable_optimization'    => $toggle,
						'thumbnail_optimization' => $compression,
						'lightbox_optimization'  => $compression,
					)
				),
				'mas_gallery_link'              => array(
					'type'      => 'string',
					'maxLength' => 100,
					'pattern'   => '^[a-zA-Z][a-zA-Z0-9_-]*$',
				),
				'modula_watermark'              => Contract::object(
					array(
						'watermark_image'                  => array(
							'type'    => 'integer',
							'minimum' => 0,
						),
						'watermark_position'               => array(
							'type' => 'string',
							'enum' => array( 'top_left', 'top_right', 'bottom_right', 'bottom_left', 'center' ),
						),
						'watermark_margin'                 => array(
							'type'    => 'integer',
							'minimum' => 0,
							'maximum' => 50,
						),
						'watermark_image_dimension_width'  => array(
							'type'    => 'integer',
							'minimum' => 0,
							'maximum' => 10000,
						),
						'watermark_image_dimension_height' => array(
							'type'    => 'integer',
							'minimum' => 0,
							'maximum' => 10000,
						),
						'watermark_enable_backup'          => array( 'type' => 'boolean' ),
					)
				),
			)
		);
	}
	public static function definitions(): array {
		$base    = array(
			'request_id' => Contract::request_id_schema(),
			'revision'   => Contract::revision_schema(),
		);
		$feature = Contract::object(
			array(
				'available'     => array( 'type' => 'boolean' ),
				'enabled'       => array( 'type' => 'boolean' ),
				'service_ready' => array( 'type' => 'boolean' ),
			),
			array( 'available', 'enabled' )
		);
		$output  = Contract::object(
			array(
				'schema_version' => array( 'type' => 'string' ),
				'revision'       => Contract::revision_schema(),
				'settings'       => self::read_schema( self::schema() ),
				'compatible_pro' => array( 'type' => 'boolean' ),
				'license_status' => array( 'type' => 'string' ),
				'license_source' => array(
					'type' => 'string',
					'enum' => array( 'stored' ),
				),
				'extensions'     => array(
					'type'                 => 'object',
					'additionalProperties' => $feature,
				),
			),
			array( 'schema_version', 'revision', 'settings', 'compatible_pro', 'license_status', 'license_source', 'extensions' )
		);
		return array(
			self::READ      => array(
				'label'         => 'Read Modula Settings',
				'description'   => 'Requires the Modula settings capability (manage_options for people). Read supported non-secret settings and stored license/extension status without provider refresh, repairs or side effects. Credentials, roles, AI/provider and Diagnostics controls remain outside this contract.',
				'input_schema'  => Contract::object( array() ) + array( 'default' => array() ),
				'output_schema' => $output,
			),
			self::UPDATE    => array(
				'label'         => 'Update Modula Settings',
				'description'   => 'Patch only allowlisted non-secret fields against the site revision; preserve omitted configuration. Requires the Modula settings capability (manage_options for people). Free fields stay in Lite. Premium extension groups are written by Pro when that extension service is ready; a locked group rejects the whole patch with a feature explanation and writes nothing. Standalone changes schedule the existing rewrite refresh. Watermark configuration does not watermark files. 30-day recovery, no license/provider refresh.',
				'input_schema'  => Contract::object( $base + array( 'settings' => self::schema() + array( 'minProperties' => 1 ) ), array( 'request_id', 'revision', 'settings' ) ),
				// Site writes report only the envelope: the new revision, or the blockers.
				'output_schema' => Contract::outcome( self::UPDATE, array() ),
			),
			self::EXTENSION => array(
				'label'         => 'Set Modula extension state',
				'description'   => 'Explicit desired enabled state. Requires the Modula extension capability (manage_options and activate_plugins for people), which an upgrade does not replace. Pro performs the toggle when the extension service contract is ready; Lite explains a missing package, entitlement or service before any hook. Activation requires stored entitlement. No implicit license refresh. Revision and 30-day recovery prevent repeat hooks. Recovery after Pro removal rechecks these capabilities and does not toggle again.',
				'input_schema'  => Contract::object(
					$base + array(
						'extension' => array(
							'type'      => 'string',
							'pattern'   => '^modula-[a-z-]+$',
							'maxLength' => 80,
						),
						'enabled'   => array( 'type' => 'boolean' ),
					),
					array( 'request_id', 'revision', 'extension', 'enabled' )
				),
				'output_schema' => Contract::outcome( self::EXTENSION, array() ),
			),
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
				if ( array_key_exists( $key, $value ) ) {
					$value[ $key ] = self::normalize_stored( $value[ $key ], $child ); }
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
		$sql  = $wpdb->prepare( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN (" . implode( ',', array_fill( 0, count( $names ), '%s' ) ) . ') ORDER BY option_name' . ( $lock ? ' FOR UPDATE' : '' ), $names );
		$rows = $wpdb->get_results( $sql, ARRAY_A );
		if ( null === $rows || $wpdb->last_error ) {
			throw new \RuntimeException( 'Settings revision unavailable.' );
		}
		self::clear_cache();
		return hash( 'sha256', wp_json_encode( $rows ) );
	}
	public static function clear_cache(): void {
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
		$pro        = self::pro();
		$extensions = Pro_Dependency::extensions();
		$status     = Pro_Dependency::license_status();
		if ( ! hash_equals( $revision, self::revision() ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Settings changed during inspection; read again.' );
		}
		return array(
			'schema_version' => Contract::VERSION,
			'revision'       => $revision,
			'settings'       => $settings ?: new \stdClass(),
			'compatible_pro' => $pro,
			'license_status' => $status,
			'license_source' => 'stored',
			'extensions'     => $extensions ?: new \stdClass(),
		);
	}
	/** Structural rejection only. Known locked groups are explained separately and are not invalid input. */
	private static function valid_patch( array $patch ): bool {
		if ( ! $patch || is_wp_error( rest_validate_value_from_schema( $patch, self::schema(), 'settings' ) ) || ! Settings_Contract::strict_types( $patch, self::schema() ) ) {
			return false;
		}
		foreach ( $patch as $value ) {
			if ( is_array( $value ) && ! $value ) {
				return false;
			}
		}
		$image = $patch['modula_watermark']['watermark_image'] ?? 0;
		return ! $image || Creation::can_use_attachments( array( $image ) );
	}

	/**
	 * Blockers for requested premium groups. Empty means those groups may be written.
	 *
	 * @param array<string,mixed> $settings
	 * @return array<int,array<string,mixed>>
	 */
	public static function premium_blockers( array $settings ): array {
		$blockers = array();
		foreach ( self::premium_map() as $option => $feature ) {
			if ( ! array_key_exists( $option, $settings ) ) {
				continue;
			}
			$blockers = array_merge( $blockers, self::option_blockers( $option, $feature, $settings[ $option ] ) );
		}
		if ( self::premium_subset( $settings ) && ! $blockers && ! self::writer_ready() ) {
			$blockers[] = self::service_blocker();
		}
		return self::unique_blockers( $blockers );
	}

	/**
	 * Permission, package and toggle-service blockers. A disabled extension is not itself a blocker: enabling it is the effect.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( array $input ): array {
		if ( ! self::can_manage() ) {
			return array( self::permission_blocker( 'manage_options' ) );
		}
		if ( ! self::can_activate() ) {
			return array( self::permission_blocker( 'activate_plugins' ) );
		}
		// A Pro without the toggle service contributes no executor, so Availability reports needs_service_update.
		$blockers = Availability::blockers( self::EXTENSION );
		$slug     = is_string( $input['extension'] ?? null ) ? $input['extension'] : '';
		$enable   = $input['enabled'] ?? null;
		$status   = '' !== $slug ? ( Pro_Dependency::extensions()[ $slug ] ?? null ) : null;
		$missing  = true === $enable && is_array( $status ) && true !== ( $status['available'] ?? null );
		if ( $missing ) {
			$blockers = array_merge(
				$blockers,
				Availability::for_requirement(
					array(
						'feature' => $slug,
						'scope'   => 'extension',
					),
					'extension'
				)
			);
		}
		return self::unique_blockers( $blockers );
	}

	public static function update( array $input ): array {
		$operation = self::UPDATE;
		$out       = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, $operation );
		};
		$existing  = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! self::can_manage() ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current global settings permissions are required.' );
		}
		if ( ! isset( $input['settings'] ) || ! is_array( $input['settings'] ) || ! self::valid_patch( $input['settings'] ) ) {
			return $out( 'rejected', 'invalid_settings', 'Invalid or empty settings patch.' );
		}
		$blockers = self::premium_blockers( $input['settings'] );
		if ( $blockers ) {
			return Requests::reject_feature( $operation, $input, $blockers, 'A requested site setting is not currently executable.' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		return self::commit_settings( $input, $out );
	}

	/**
	 * @param array<string,mixed>            $input
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>
	 */
	private static function locked( array $input, array $blockers ): array {
		$out             = Requests::outcome( $input['request_id'], 'rejected', 'feature_unavailable', 'A requested site setting is not currently executable.', self::UPDATE );
		$out['blockers'] = $blockers;
		return $out;
	}

	/**
	 * @param callable $out
	 * @param array<string,mixed> $input
	 * @return array<string,mixed>
	 */
	private static function commit_settings( array $input, callable $out ): array {
		$transaction = false;
		try {
			Revision::begin();
			$transaction = true;
			$rejected    = self::admission_failure( $input, $out );
			if ( null !== $rejected ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], $rejected );
			}
			if ( ! self::write_premium( $input['settings'] ) ) {
				Revision::end( false );
				$transaction = false;
				$locked      = self::premium_blockers( $input['settings'] );
				if ( array() === $locked ) {
					$locked = array( self::service_blocker() );
				}
				return Requests::finish( $input['request_id'], self::locked( $input, $locked ) );
			}
			self::persist_options( self::free_subset( $input['settings'] ) );
			$result             = $out( 'succeeded' );
			$result['revision'] = self::revision();
			$result             = Requests::finish( $input['request_id'], $result );
			Revision::end( true );
			$transaction = false;
			self::clear_cache();
			return $result;
		} catch ( \Throwable $error ) {
			if ( $transaction ) {
				Revision::end( false );
			}
			self::clear_cache();
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'settings_unconfirmed', 'Settings could not be confirmed. Recover and inspect before a new action.' ) );
		}
	}

	/**
	 * Recheck revision, access and premium admission. Null means the patch may be written.
	 *
	 * @param callable $out
	 * @param array<string,mixed> $input
	 * @return array<string,mixed>|null
	 */
	private static function admission_failure( array $input, callable $out ) {
		if ( ! hash_equals( self::revision( true ), $input['revision'] ) ) {
			return $out( 'conflict', 'stale_revision', 'Read current settings and reconcile before a new request.' );
		}
		if ( ! self::can_manage() ) {
			throw new \RuntimeException( 'Access changed.' );
		}
		if ( ! self::valid_patch( $input['settings'] ) ) {
			throw new \RuntimeException( 'Availability changed.' );
		}
		$blockers = self::premium_blockers( $input['settings'] );
		if ( $blockers ) {
			return self::locked( $input, $blockers );
		}
		return null;
	}

	/**
	 * @param array<string,mixed> $settings
	 * @return array<string,mixed>
	 */
	private static function premium_subset( array $settings ): array {
		$out = array();
		foreach ( array_keys( self::premium_map() ) as $option ) {
			if ( array_key_exists( $option, $settings ) ) {
				$out[ $option ] = $settings[ $option ];
			}
		}
		return $out;
	}

	/**
	 * @param array<string,mixed> $settings
	 * @return array<string,mixed>
	 */
	private static function free_subset( array $settings ): array {
		$premium = self::premium_map();
		$out     = array();
		foreach ( $settings as $option => $value ) {
			if ( ! isset( $premium[ $option ] ) ) {
				$out[ $option ] = $value;
			}
		}
		return $out;
	}

	/**
	 * Write admitted premium groups through the Pro handler. An empty premium subset is already done.
	 *
	 * @param array<string,mixed> $settings
	 */
	private static function write_premium( array $settings ): bool {
		$premium = self::premium_subset( $settings );
		if ( ! $premium ) {
			return true;
		}
		$writer = apply_filters( 'modula_ability_premium_site_settings_writer', null );
		return is_callable( $writer ) && true === $writer( $premium );
	}

	/**
	 * Blockers for one premium option, including the albums subkey on standalone.
	 *
	 * @param mixed $value
	 * @return array<int,array<string,mixed>>
	 */
	public static function option_blockers( string $option, string $feature, $value ): array {
		$blockers = array();
		if ( ! self::extension_ready( $feature ) ) {
			$blockers = array_merge(
				$blockers,
				Availability::for_requirement(
					array(
						'feature' => $feature,
						'scope'   => 'extension',
					),
					$option
				)
			);
		}
		$album_setting_locked = 'modula_standalone' === $option && is_array( $value ) && array_key_exists( 'album', $value ) && ! self::extension_ready( 'modula-albums' );
		if ( $album_setting_locked ) {
			$blockers = array_merge(
				$blockers,
				Availability::for_requirement(
					array(
						'feature' => 'modula-albums',
						'scope'   => 'extension',
					),
					'modula_standalone.album'
				)
			);
		}
		return $blockers;
	}

	/**
	 * @param array<string,mixed> $settings
	 */
	private static function persist_options( array $settings ): void {
		foreach ( $settings as $name => $patch ) {
			self::store_option( $name, $patch );
		}
	}

	/**
	 * One free or already-admitted option. Premium groups are written by the Pro executor instead.
	 *
	 * @param mixed $patch
	 */
	private static function store_option( string $name, $patch ): void {
		$value = is_array( $patch ) ? array_replace_recursive( (array) get_option( $name, array() ), self::sanitize_patch( $patch ) ) : sanitize_text_field( $patch );
		$value = apply_filters( 'modula_settings_api_pre_update_' . $name, $value, $name );
		update_option( $name, $value );
		do_action( 'modula_settings_api_update_' . $name, $value );
		self::clear_cache();
		if ( get_option( $name ) !== $value ) {
			throw new \RuntimeException( 'Settings write unconfirmed.' );
		}
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function permission_blocker( string $capability ): array {
		if ( 'activate_plugins' === $capability ) {
			$explanation = __( 'Current activate_plugins permission is required. An upgrade does not grant this access.', 'modula-best-grid-gallery' );
		} else {
			$explanation = __( 'Current manage_options permission is required. An upgrade does not grant this access.', 'modula-best-grid-gallery' );
		}
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-pro',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => $explanation,
			),
		);
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function service_blocker(): array {
		return array(
			'reason'  => 'needs_service_update',
			'feature' => 'modula-pro',
			'remedy'  => array(
				'action'      => 'update_package',
				'explanation' => __( 'Installed Pro is missing a required service contract. Update the package; this is not a plan upgrade.', 'modula-best-grid-gallery' ),
			),
		);
	}

	/**
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<int,array<string,mixed>>
	 */
	private static function unique_blockers( array $blockers ): array {
		$out  = array();
		$seen = array();
		foreach ( $blockers as $blocker ) {
			if ( ! is_array( $blocker ) ) {
				continue;
			}
			$key = ( $blocker['reason'] ?? '' ) . ':' . ( $blocker['feature'] ?? '' ) . ':' . ( $blocker['path'] ?? '' );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$out[]        = $blocker;
		}
		return $out;
	}

	public static function sanitize_patch( array $patch ): array {
		foreach ( $patch as &$value ) {
			if ( is_array( $value ) ) {
				$value = self::sanitize_patch( $value );
				continue;
			}
			if ( is_string( $value ) ) {
				$value = sanitize_text_field( $value );
			}
		}
		return $patch;
	}
}
