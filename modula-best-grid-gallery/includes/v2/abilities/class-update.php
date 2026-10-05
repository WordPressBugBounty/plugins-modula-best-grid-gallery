<?php
/** Metadata/settings patches with durable recovery and conflict protection. */
namespace Modula\V2\Abilities;
use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
use Modula\V2\Settings\Writer;
defined( 'ABSPATH' ) || exit;
final class Update {
	public const OPERATION = 'modula/update-gallery';
	public static function can_update( int $id, string $status = '' ): bool {
		$type = get_post_type_object( 'modula-gallery' );
		return Integration::can_discover() && Integration::can_read_post( $id ) && $type && ( 'publish' !== $status && 'private' !== $status || current_user_can( $type->cap->publish_posts ) );
	}
	private static function operation( array $input ): string {
		if ( isset( $input['video_changes'] ) ) { return Video::UPDATE; }
		return isset( $input['item_changes'] ) ? Embedded::OPERATION : ( isset( $input['changes'] ) ? Composition::OPERATION : self::OPERATION );
	}
	private static function outcome( array $input, string $status, string $code = '', string $message = '' ): array {
		return Requests::outcome( $input['request_id'], $status, $code, $message, self::operation( $input ) );
	}
	public static function execute( array $input ): array {
		$operation = self::operation( $input );
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$id = $input['id'];
		if ( ! self::can_update( $id, $input['metadata']['status'] ?? '' ) ) {
			return self::outcome( $input, 'forbidden', 'current_permission_denied', 'Current gallery and requested publication permissions are required.' );
		}
		if ( ! Beta_Settings::is_beta_gallery( $id ) || 'trash' === get_post_status( $id ) ) {
			return self::outcome( $input, 'rejected', 'unsupported_target', 'Only existing Beta galleries outside trash can be patched.' );
		}
		if ( get_post_meta( $id, '_modula_bind_target_type', true ) ) {
			return self::outcome( $input, 'rejected', 'unsupported_bound_target', 'Bound gallery mutations require the source-aware bound operations in their own delivery stage.' );
		}
		if ( empty( $input['metadata'] ) && empty( $input['settings'] ) && empty( $input['changes'] ) && empty( $input['item_changes'] ) && empty( $input['video_changes'] ) ) {
			return self::outcome( $input, 'rejected', 'empty_patch', 'Provide metadata or settings to change.' );
		}
		if ( isset( $input['metadata']['title'] ) && '' === trim( sanitize_text_field( $input['metadata']['title'] ) ) ) {
			return self::outcome( $input, 'rejected', 'invalid_title', 'title must contain visible text.' );
		}
		$settings = $input['settings'] ?? array();
		if ( $settings ) {
			$schema = Settings_Contract::schema();
			$valid = rest_validate_value_from_schema( $settings, $schema, 'settings' );
			if ( is_wp_error( $valid ) || ! Settings_Contract::strict_types( $settings, $schema ) ) {
				return self::outcome( $input, 'rejected', 'invalid_settings', 'A requested setting is invalid, unavailable or has the wrong JSON type.' );
			}
			$valid = Writer::validate_strict_patch( $id, $settings );
			if ( is_wp_error( $valid ) ) {
				return self::outcome( $input, 'rejected', 'invalid_settings', $valid->get_error_message() );
			}
		}
		if ( isset( $input['item_changes'] ) && ! Creation::can_use_attachments( Embedded::referenced_attachment_ids( $input['item_changes'] ) ) ) {
			return self::outcome( $input, 'rejected', 'invalid_attachments', 'Image references require accessible existing image attachments.' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$transaction = false;
		try {
			Revision::begin();
			$transaction = true;
			$current = Revision::state( $id, true );
			Revision::clear_cache();
			if ( ! hash_equals( $current, $input['revision'] ) ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], self::outcome( $input, 'conflict', 'stale_revision', 'Read the current gallery and reconcile changes before submitting a new request identity.' ) );
			}
			if ( ! self::can_update( $id, $input['metadata']['status'] ?? '' ) || ! Beta_Settings::is_beta_gallery( $id ) ) {
				throw new \RuntimeException( 'Access changed.' );
			}
			if ( isset( $input['changes'] ) || isset( $input['item_changes'] ) || isset( $input['video_changes'] ) ) {
				$composition = isset( $input['video_changes'] ) ? Video::class : ( isset( $input['item_changes'] ) ? Embedded::class : Composition::class );
				$changes = $input['video_changes'] ?? $input['item_changes'] ?? $input['changes'];
				$attachments = Video::class === $composition ? Video::referenced_attachment_ids( $changes, $id ) : $composition::referenced_attachment_ids( $changes );
				if ( $attachments ) { Revision::lock_attachments( $attachments ); }
				$items = $composition::prepare( $id, $changes );
				if ( is_wp_error( $items ) ) {
					Revision::end( false );
					$transaction = false;
					return Requests::finish( $input['request_id'], self::outcome( $input, 'rejected', $items->get_error_code(), $items->get_error_message() ) );
				}
				Meta_Sync::persist_prepared_gallery_items( $id, $items );
				Revision::clear_cache();
				if ( Meta_Sync::get_images_v2( $id ) !== $items ) {
					throw new \RuntimeException( 'Composition differs from requested values.' );
				}
			}
			Meta_Sync::with_canonical_gallery_write( $id, static function () use ( $id, $settings, $input ) {
				if ( $settings ) {
					$saved = Writer::patch( $id, $settings, true );
					if ( is_wp_error( $saved ) ) {
						throw new \RuntimeException( 'Settings not confirmed.' );
					}
				}
				if ( ! empty( $input['metadata'] ) ) {
					$post = array( 'ID' => $id );
					foreach ( array( 'title' => 'post_title', 'status' => 'post_status' ) as $key => $field ) {
						if ( isset( $input['metadata'][ $key ] ) ) {
							$post[ $field ] = 'title' === $key ? sanitize_text_field( $input['metadata'][ $key ] ) : $input['metadata'][ $key ];
						}
					}
					if ( is_wp_error( wp_update_post( wp_slash( $post ), true ) ) ) {
						throw new \RuntimeException( 'Metadata not confirmed.' );
					}
				}
			}
			);
			global $wpdb;
			if ( $wpdb->last_error ) {
				throw new \RuntimeException( 'Write failed.' );
			}
			Revision::clear_cache();
			$stored = json_decode( (string) get_post_meta( $id, Meta_Sync::SETTINGS_V2_META_KEY, true ), true ) ?: array();
			foreach ( $settings as $group => $keys ) {
				foreach ( $keys as $key => $value ) {
					if ( ! array_key_exists( $key, $stored[ $group ] ?? array() ) || $stored[ $group ][ $key ] !== $value ) {
						throw new \RuntimeException( 'Requested settings differ from saved values.' );
					}
				}
			}
			$post = get_post( $id );
			foreach ( array( 'title' => 'post_title', 'status' => 'post_status' ) as $key => $field ) {
				if ( isset( $input['metadata'][ $key ] ) && $post->$field !== ( 'title' === $key ? sanitize_text_field( $input['metadata'][ $key ] ) : $input['metadata'][ $key ] ) ) {
					throw new \RuntimeException( 'Metadata differs from requested values.' );
				}
			}
			$out = self::outcome( $input, 'succeeded' );
			$out['gallery'] = Integration::gallery( get_post( $id ) );
			$out['gallery']['revision'] = Revision::state( $id );
			// Store confirmation inside the same DB transaction as the gallery patch.
			$out = Requests::finish( $input['request_id'], $out );
			Revision::end( true );
			$transaction = false;
			return $out;
		}
		catch ( \Throwable $error ) {
			if ( $transaction ) {
				Revision::end( false );
			}
			return Requests::finish( $input['request_id'], self::outcome( $input, 'uncertain', 'update_unconfirmed', 'The patch was not confirmed. Recover this request and inspect the gallery before a new action.' ) );
		}
	}
}
