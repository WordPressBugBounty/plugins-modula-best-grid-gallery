<?php
/** Capability contracts for optional Pro services used by Abilities only. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Pro_Dependency {
	/** Abilities service floor read only by activates(). */
	public const MIN_VERSION = '3.0.12';

	/**
	 * Compatibility only: shipped Pro (3.0.16 and earlier) calls this from Freeform_Author::authors() on every
	 * gallery write, so removing it would fatal. Current Pro no longer calls it; Lite never does.
	 * Delete once Lite's Compatible Pro floor is past that release.
	 */
	public static function activates(): bool {
		return defined( 'MODULA_PRO_VERSION' ) && version_compare( (string) MODULA_PRO_VERSION, self::MIN_VERSION, '>=' );
	}

	/** Inspect declarations without constructing services or refreshing licensing. */
	public static function methods( string $class, array $methods, bool $static = true ): bool {
		if ( ! class_exists( $class ) ) {
			return false; }
		foreach ( $methods as $method => $parameters ) {
			if ( ! method_exists( $class, $method ) ) {
				return false; }
			$reflection = new \ReflectionMethod( $class, $method );
			if ( ! $reflection->isPublic() || $reflection->isAbstract() || $reflection->getNumberOfParameters() < $parameters || $reflection->getNumberOfRequiredParameters() > $parameters || ( $static || 'get_instance' === $method ) && ! $reflection->isStatic() ) {
				return false; }
		}
		return true;
	}
	public static function available(): bool {
		return function_exists( 'modula_is_compatible_pro' ) && modula_is_compatible_pro()
			&& self::methods(
				'\Modula_Pro\Extensions\Extensions',
				array(
					'get_instance'                   => 0,
					'get_read_only_extension_status' => 0,
				),
				false
			)
			&& self::methods(
				'\Modula_Pro\Extensions\Licensing',
				array(
					'get_instance'         => 0,
					'get_read_only_status' => 0,
				),
				false
			);
	}
	/** Extension reads internally call Licensing, so both contracts are required. */
	public static function extensions(): array {
		if ( ! self::available() ) {
			return array();
		}
		$status = \Modula_Pro\Extensions\Extensions::get_instance()->get_read_only_extension_status();
		foreach ( $status as $slug => $_row ) {
			$status[ $slug ]['service_ready'] = self::extension_contract( $slug );
		}
		return $status;
	}
	public static function license_status(): string {
		return self::available() ? \Modula_Pro\Extensions\Licensing::get_instance()->get_read_only_status()['status'] : 'unavailable';
	}
	/**
	 * Compatibility only: shipped Pro (3.0.16 and earlier) calls this from Site_Provider::contribute() before any
	 * readiness check, so removing it would fatal abilities registration. Current Pro owns Site_Provider::can_toggle().
	 * Delete once Lite's Compatible Pro floor is past that release.
	 */
	public static function can_toggle(): bool {
		return self::available() && self::methods(
			'\Modula_Pro\Extensions\Extensions',
			array(
				'clear_active_extensions_cache'      => 0,
				'toggle_active_status_of_extensions' => 2,
			),
			false
		);
	}
	/** Consume only readiness checks declared by the owning operation family. */
	public static function host_executor_ready( string $name ): bool {
		$row = Integration::operation( $name );
		if ( ! $row ) {
			return false;
		}
		foreach ( $row['executor_checks'] as $check ) {
			if ( ! $check( $name ) ) {
				return false;
			}
		}
		return true;
	}

	/** New service methods and safety-significant arguments, checked before admission. */
	public static function extension_contract( string $slug ): bool {
		$contracts = array(
			'modula-albums'              => array(
				'\Modula_Pro\Extensions\Albums\V2\Settings_Writer' => array(
					'validate_patch' => 2,
					'patch'          => 3,
				),
				'\Modula_Pro\Extensions\Albums\V2\Meta_Sync' => array(
					'with_canonical_write'                 => 2,
					'apply_new_beta_album_create_defaults' => 1,
				),
				'\Modula_Pro\Extensions\Albums\V2\Members_Document' => array( 'persist_composition' => 2 ),
				'\Modula_Pro\Extensions\Albums\V2\Registry' => array( 'get_schema' => 0 ),
				'\Modula_Pro\Extensions\Albums\V2\Settings_Schema_Document' => array( 'get_settings_tree_raw' => 0 ),
			),
			'modula-defaults'            => array(
				'\Modula_Pro\Extensions\Defaults\Utils\Preset_Storage' => array(
					'get_preset_grouped'      => 2,
					'apply_preset_to_gallery' => 3,
					'save_preset_grouped'     => 3,
				),
			),
			'modula-video'               => array(
				'\Modula_Pro\Extensions\Video\Video' => array(
					'get_video_snap'                 => 2,
					'get_video_playlist_snap'        => 3,
					'get_video_snap_from_attachment' => 1,
					'get_youtube_video_id'           => 1,
				),
			),
			'modula-instagram'           => array(
				'\Modula_Pro\Extensions\Instagram\Instagram_Api_Client' => array(
					'get_instance'   => 0,
					'get_image_list' => 3,
				),
				'\Modula_Pro\Extensions\Instagram\Instagram_Sync'       => array(
					'get_instance'         => 0,
					'add_items_to_gallery' => 3,
				),
				'\Modula_Pro\Extensions\Instagram\Image_Handler'        => array(
					'get_instance'         => 0,
					'upload_item_from_url' => 1,
				),
			),
			'modula-watermark'           => array(
				'\Modula_Pro\Extensions\Watermark\Watermark' => array(
					'get_instance'                => 0,
					'apply_watermark_to_image'    => 2,
					'remove_watermark_from_image' => 2,
				),
			),
			'modula-standalone'          => array(
				'\Modula_Pro\Extensions\Standalone\Standalone' => array(
					'get_instance'              => 0,
					'get_standalone_public_url' => 1,
				),
				'\Modula_Pro\Extensions\Standalone\Standalone_Rewrite' => array(
					'merge_settings' => 1,
					'is_enabled'     => 2,
				),
			),
			'modula-speedup'             => array(
				'\Modula_Pro\Extensions\Speedup\Speedup' => array(
					'get_instance'                   => 0,
					'generate_optimized_image_links' => 3,
				),
			),
			'modula-advanced-shortcodes' => array(
				'\Modula_Pro\Extensions\Advanced_Shortcodes\Advanced_Shortcodes' => array(
					'get_instance' => 0,
					'debug_info'   => 1,
				),
			),
			'modula-image-proofing'      => array(
				'\Modula_Pro\Extensions\Image_Proofing\Data_Handler'  => array( 'create_invitation' => 2 ),
				'\Modula_Pro\Extensions\Image_Proofing\Email_Handler' => array(
					'send_client_invitation_email' => 3,
					'send_invitation_email'        => 3,
				),
			),
		);
		$instance  = array( 'modula-instagram', 'modula-image-proofing', 'modula-watermark', 'modula-standalone', 'modula-speedup', 'modula-advanced-shortcodes' );
		foreach ( $contracts[ $slug ] ?? array() as $class => $methods ) {
			if ( ! self::methods( $class, $methods, ! in_array( $slug, $instance, true ) ) ) {
				return false; }
		}
		return true;
	}
}
