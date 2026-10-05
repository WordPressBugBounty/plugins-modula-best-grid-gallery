<?php
/** Album preset lifecycle shares the gallery preset admission and transaction contract. */
namespace Modula\V2\Abilities;

use Modula_Pro\Extensions\Defaults\Utils\Preset_Storage;
use Modula_Pro\Extensions\Albums\V2\Meta_Sync;
use Modula_Pro\Extensions\Albums\V2\Settings_Writer;

defined( 'ABSPATH' ) || exit;

final class Album_Presets extends Presets {
	protected const FAMILY = 'album';
	public const APPLY = 'modula/apply-album-preset';
	public const BATCH = 'modula/apply-album-presets';
	protected const POST_TYPE = 'defaults-albums';
	public static function available(): bool { return Presets::available() && Albums::available() && Pro_Dependency::methods( Preset_Storage::class, array( 'save_album_preset_grouped' => 3, 'album_preset_flat' => 1, 'get_album_preset_grouped' => 1, 'apply_preset_to_album' => 2 ) ); }
	protected static function settings_schema(): array { return self::available() ? Settings_Contract::schema( true ) : Contract::object( array() ); }
	protected static function read_settings_schema(): array { return self::available() ? Contract::settings_schema( \Modula_Pro\Extensions\Albums\V2\Registry::get_schema() ) : Contract::object( array() ); }
	protected static function get_settings( int $id ): array { return Preset_Storage::get_album_preset_grouped( $id ); }
	protected static function validate_settings( array $settings ) { return Settings_Writer::validate_patch( 0, $settings ); }
	protected static function save_settings( int $id, array $settings, string $sorting ) { return Preset_Storage::save_album_preset_grouped( $id, $settings, $sorting ); }
	protected static function settings_confirmed( int $id, array $settings ): bool { return $settings === json_decode( (string) get_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, true ), true ) && Preset_Storage::album_preset_flat( $settings ) === get_post_meta( $id, Meta_Sync::FLAT_META_KEY, true ); }
	protected static function target_access( int $id ): bool { return Albums::can_access( $id ); }
	protected static function eligible_target( int $id ): bool { return \Modula\V2\Beta_Settings::is_beta_album( $id ) && 'trash' !== get_post_status( $id ); }
	protected static function target_revision( int $id, bool $lock = false ): string { return Revision::document( $id, $lock ); }
	protected static function target_summary( int $id ): array { return Albums::summary( $id ); }
	protected static function apply_settings( int $id, int $source ) {
		$keys = array( 'modula_album_members_v2', 'modula-album-galleries' );
		$members = array(); foreach ( $keys as $key ) { $members[$key] = get_post_meta( $id, $key, true ); }
		$parent = get_post( $id )->post_parent;
		Meta_Sync::ensure_settings_v2_from_flat( $id );
		$before = Meta_Sync::get_settings_v2( $id );
		$settings = self::get_settings( $source );
		if ( ! array_key_exists( 'passwordProtect', $settings ) && isset( $before['passwordProtect'] ) ) { $settings['passwordProtect'] = $before['passwordProtect']; }
		// Replacement sanitizes once, and the canonical save normalizes the full document again.
		$expected = \Modula_Pro\Extensions\Albums\V2\Sanitizer::sanitize_grouped( \Modula_Pro\Extensions\Albums\V2\Sanitizer::sanitize_grouped( $settings ) );
		$password = get_post( $id )->post_password;
		$saved = Meta_Sync::with_canonical_write( $id, static function () use ( $id, $source ) { return Preset_Storage::apply_preset_to_album( $id, $source ); } );
		if ( is_wp_error( $saved ) ) { return $saved; }
		foreach ( $members as $key => $value ) { if ( $value !== get_post_meta( $id, $key, true ) ) { return new \WP_Error( 'members_changed', 'Preset changed member composition.' ); } }
		if ( $parent !== get_post( $id )->post_parent || ( ! array_key_exists( 'passwordProtect', self::get_settings( $source ) ) && $password !== get_post( $id )->post_password ) ) { return new \WP_Error( 'album_changed', 'Preset changed unrequested hierarchy or protection.' ); }
		return array( 'expected' => $expected );
	}
	protected static function application_confirmed( int $id, array $settings, $saved ): bool {
		if ( ! isset( $saved['expected'] ) || $saved['expected'] !== Meta_Sync::get_settings_v2( $id ) ) { return false; }
		$flat = get_post_meta( $id, Meta_Sync::FLAT_META_KEY, true );
		foreach ( Preset_Storage::album_preset_flat( $saved['expected'] ) as $key => $value ) { if ( ! array_key_exists( $key, $flat ) || $value !== $flat[$key] ) { return false; } }
		return true;
	}
}
