<?php
/** Album preset descriptors share gallery preset authorization with a compound Albums gate. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Album_Presets extends Presets {
	protected const FAMILY    = 'album';
	public const APPLY        = 'modula/apply-album-preset';
	public const BATCH        = 'modula/apply-album-presets';
	public const DELETE       = 'modula/delete-album-preset';
	protected const POST_TYPE = 'defaults-albums';

	protected static function executor_class(): string {
		return '\Modula_Pro\Extensions\Defaults\Abilities\Album_Preset_Executor';
	}

	protected static function catalog_features(): array {
		return array( 'modula-defaults', 'modula-albums' );
	}

	public static function available(): bool {
		return Presets::available() && Albums::available() && Pro_Dependency::methods(
			'\Modula_Pro\Extensions\Defaults\Utils\Preset_Storage',
			array(
				'save_album_preset_grouped' => 3,
				'album_preset_flat'         => 1,
				'get_album_preset_grouped'  => 1,
				'apply_preset_to_album'     => 2,
			)
		);
	}

	protected static function settings_schema(): array {
		if ( class_exists( \Modula_Pro\Extensions\Albums\V2\Registry::class, false ) ) {
			return Settings_Contract::schema( true );
		}
		return array(
			'type'                 => 'object',
			'additionalProperties' => true,
		);
	}

	protected static function read_settings_schema(): array {
		if ( class_exists( \Modula_Pro\Extensions\Albums\V2\Registry::class, false ) ) {
			return Contract::settings_schema( \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() );
		}
		return array(
			'type'                 => 'object',
			'additionalProperties' => true,
		);
	}

	protected static function recover_target_access( int $id ): bool {
		return Albums::object_access( $id );
	}
}
