<?php
/** Bounded explicit Instagram intake through the existing provider and media services. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
use Modula_Pro\Extensions\Instagram\Instagram_Api_Client;
use Modula_Pro\Extensions\Instagram\Image_Handler;
use Modula_Pro\Extensions\Instagram\Instagram_Sync;

defined( 'ABSPATH' ) || exit;
final class Instagram {
	public const READ = 'modula/read-instagram-state';
	public const SYNC = 'modula/sync-instagram-gallery';
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-instagram' ) && class_exists( Instagram_Api_Client::class ) && class_exists( Image_Handler::class );
	}
	public static function callbacks(): array {
		return array(
			self::READ => array( self::class, 'read' ),
			self::SYNC => array( self::class, 'sync' ),
		);
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available() || ! Update::can_update( (int) $record['target'] ) || ! current_user_can( 'upload_files' ) ) {
			return false; }
		foreach ( $record['attachment_ids'] ?? array() as $id ) {
			if ( ! Attachments::can_read( (int) $id ) ) {
				return false; }
		}
		return true;
	}
	private static function eligible( int $id ): bool {
		return Beta_Settings::is_beta_gallery( $id ) && 'trash' !== get_post_status( $id ) && ! get_post_meta( $id, '_modula_bind_target_type', true );
	}
	private static function configured(): bool {
		$expiry = (int) get_option( 'modula_instagram_expiry_date', 0 );
		return (bool) get_option( 'modula_instagram_access_token', false ) && ( ! $expiry || $expiry > time() );
	}
	/** Account changes are conflicts too; credentials only enter an irreversible digest. */
	private static function revision( int $id, bool $lock = false ): string {
		global $wpdb;
		$gallery = Revision::state( $id, $lock );
		// Authoritative snapshot: fixed option names and boolean-selected FOR UPDATE; caching would hide conflicts.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$config = $wpdb->get_results( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN ('modula_instagram_access_token','modula_instagram_expiry_date') ORDER BY option_name" . ( $lock ? ' FOR UPDATE' : '' ), ARRAY_A );
		if ( $wpdb->last_error ) {
			throw new \RuntimeException( 'Account state unavailable.' ); }
		return hash( 'sha256', $gallery . wp_json_encode( $config ) );
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'phase'          => array( 'type' => 'string' ),
				'attachment_ids' => array(
					'type'  => 'array',
					'items' => array( 'type' => 'integer' ),
				),
				'added_ids'      => array(
					'type'  => 'array',
					'items' => array( 'type' => 'integer' ),
				),
				'failed'         => array( 'type' => 'integer' ),
				'complete'       => array( 'type' => 'boolean' ),
				'after'          => array( 'type' => 'string' ),
			),
			array( 'phase', 'attachment_ids', 'added_ids', 'failed', 'complete' )
		);
	}
	public static function definitions(): array {
		$id = array(
			'id' => array(
				'type'    => 'integer',
				'minimum' => 1,
			),
		);
		return array(
			self::READ => array(
				'label'         => 'Read local Instagram account and gallery state',
				'description'   => 'Sanitized local configured/expired state and account/gallery revision. No tokens, account refresh, provider calls, cache mutation or synchronization. Requires editable Beta gallery and active eligible Instagram extension.',
				'input_schema'  => Contract::object( $id, array( 'id' ) ),
				'output_schema' => Contract::object(
					array(
						'configured' => array( 'type' => 'boolean' ),
						'revision'   => Contract::revision_schema(),
					),
					array( 'configured', 'revision' )
				),
			),
			self::SYNC => array(
				'label'         => 'Explicitly sync Instagram media into a Beta gallery',
				'description'   => 'Uses only the existing configured account and existing image intake services. No credentials or arbitrary source URLs accepted. One provider page, at most 50 supported images; max_items defaults to 20. refresh=true bypasses the shared image cache; false can reuse it. after continues a returned cursor with a NEW request and current state revision after inspecting partial results. Imports retain Instagram attachment identities and gallery upload-position ordering. No automatic/background sync is enabled. Media files may remain after gallery conflicts; results list retained attachments and confirmed added IDs. Partial/uncertain effects never retry on replay. Recover the same request_id for 30 days.',
				'input_schema'  => Contract::object(
					$id + array(
						'revision'   => Contract::revision_schema(),
						'request_id' => Contract::request_id_schema(),
						'max_items'  => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 50,
							'default' => 20,
						),
						'refresh'    => array(
							'type'    => 'boolean',
							'default' => true,
						),
						'after'      => array(
							'type'      => 'string',
							'maxLength' => 2000,
							'pattern'   => '^[A-Za-z0-9_=-]+$',
						),
					),
					array( 'id', 'revision', 'request_id' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
		);
	}
	public static function read( array $input ) {
		if ( ! self::can_recover( array( 'target' => $input['id'] ) ) || ! self::eligible( $input['id'] ) ) {
			return new \WP_Error( 'modula_forbidden', 'Current editable Beta gallery and Instagram rights required.' ); }
		return array(
			'configured' => self::configured(),
			'revision'   => self::revision( $input['id'] ),
		);
	}
	public static function sync( array $input ): array {
		$existing = Requests::existing( $input, self::SYNC );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Inspect retained attachments and gallery before any new synchronization.' : '', self::SYNC );
		};
		if ( ! self::can_recover( array( 'target' => $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		if ( ! self::eligible( $input['id'] ) || ! self::configured() ) {
			return $out( 'rejected', 'instagram_unavailable' ); }
		if ( self::revision( $input['id'] ) !== $input['revision'] ) {
			return $out( 'conflict', 'stale_revision' ); }
		$existing = Requests::claim( $input, self::SYNC );
		if ( null !== $existing ) {
			return $existing; }
		$progress = array(
			'phase'          => 'provider_query',
			'attachment_ids' => array(),
			'added_ids'      => array(),
			'failed'         => 0,
			'complete'       => false,
		);
		$active   = false;
		global $wpdb;
		$lock   = 'modula_instagram_ability_' . get_current_blog_id();
		$locked = false;
		try {
			Requests::context( $input['request_id'], array( 'instagram' => $progress ) );
			// Serialize ability intakes across galleries to avoid duplicate imports of the same provider ID.
			// Database lock/identity state must be read directly, never from an object cache.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$locked = '1' === (string) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $lock ) );
			if ( ! $locked ) {
				return Requests::finish( $input['request_id'], $out( 'conflict', 'instagram_busy' ) ); }
			if ( ! self::can_recover( array( 'target' => $input['id'] ) ) || ! self::eligible( $input['id'] ) || ! self::configured() || self::revision( $input['id'] ) !== $input['revision'] ) {
				return Requests::finish( $input['request_id'], $out( 'conflict', 'instagram_state_changed' ) ); }
			$service = Instagram_Api_Client::get_instance();
			$limit   = $input['max_items'] ?? 20;
			$page    = $service->get_image_list( $limit, $input['after'] ?? false, $input['refresh'] ?? true );
			if ( ! is_array( $page ) || ! is_array( $page['images'] ?? null ) ) {
				return Requests::finish( $input['request_id'], $out( 'rejected', 'instagram_provider_unavailable' ) + array( 'instagram' => $progress ) ); }
			// A larger cached page must not silently discard its tail when returning its end cursor.
			if ( count( $page['images'] ) > $limit ) {
				return Requests::finish( $input['request_id'], $out( 'rejected', 'instagram_cache_exceeds_limit' ) + array( 'instagram' => $progress ) ); }
			if ( ! empty( $page['after'] ) && is_string( $page['after'] ) && preg_match( '/^[A-Za-z0-9_=-]{1,2000}$/D', $page['after'] ) ) {
				$progress['after'] = $page['after']; }
			$handler = Image_Handler::get_instance();
			foreach ( $page['images'] as $image ) {
				if ( ! is_array( $image ) || 'image' !== ( $image['type'] ?? '' ) || ! preg_match( '/^[0-9]+$/D', (string) ( $image['id'] ?? '' ) ) ) {
					++$progress['failed'];
					continue; }
				// The existing service reuses an attachment by Instagram ID; authorize it BEFORE reuse.
				// Database lock/identity state must be read directly, never from an object cache.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery
				$matches = $wpdb->get_col( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = 'modula_instagram_image_id' AND meta_value = %s", (string) $image['id'] ) );
				foreach ( $matches as $match ) {
					if ( ! Attachments::can_read( (int) $match ) || 'trash' === get_post_status( $match ) ) {
						throw new \RuntimeException( 'Existing media unavailable.' ); }
				}
				if ( ! self::can_recover(
					array(
						'target'         => $input['id'],
						'attachment_ids' => $progress['attachment_ids'],
					)
				) || ! self::configured() ) {
					throw new \RuntimeException( 'Access changed.' ); }
				$progress['phase'] = 'media_intake';
				Requests::context( $input['request_id'], array( 'instagram' => $progress ) );
				$image['author_id'] = get_current_user_id();
				$capture            = static function ( $id ) use ( &$progress, $input ) {
					$progress['attachment_ids'][] = (int) $id;
					$progress['attachment_ids']   = array_values( array_unique( $progress['attachment_ids'] ) );
					Requests::context(
						$input['request_id'],
						array(
							'instagram'      => $progress,
							'attachment_ids' => $progress['attachment_ids'],
						)
					);
				};
				add_action( 'add_attachment', $capture, 1 );
				try {
					$attachment = $handler->upload_item_from_url( $image ); } finally {
					remove_action( 'add_attachment', $capture, 1 ); }
					if ( is_wp_error( $attachment ) ) {
						++$progress['failed'];
						continue; }
					$progress['attachment_ids'][] = (int) $attachment;
					$progress['attachment_ids']   = array_values( array_unique( $progress['attachment_ids'] ) );
					Requests::context(
						$input['request_id'],
						array(
							'instagram'      => $progress,
							'attachment_ids' => $progress['attachment_ids'],
						)
					);
			}
			// Files are durable outside the gallery transaction; conflicts retain them for reconciliation.
			$progress['phase'] = 'gallery_save';
			Requests::context( $input['request_id'], array( 'instagram' => $progress ) );
			Revision::begin();
			$active = true;
			if ( self::revision( $input['id'], true ) !== $input['revision'] ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( $progress['attachment_ids'] ? 'partial' : 'conflict', 'stale_revision' ) + array( 'instagram' => $progress ) );
			}
			if ( $progress['attachment_ids'] ) {
				Revision::lock_attachments( $progress['attachment_ids'] ); }
			if ( ! self::can_recover(
				array(
					'target'         => $input['id'],
					'attachment_ids' => $progress['attachment_ids'],
				)
			) || ! self::eligible( $input['id'] ) || ! self::configured() ) {
				throw new \RuntimeException( 'Access changed.' ); }
			$before   = array_column( Meta_Sync::get_images_v2( $input['id'] ), 'id' );
			$settings = get_post_meta( $input['id'], 'modula-settings', true );
			Instagram_Sync::get_instance()->add_items_to_gallery( $input['id'], $progress['attachment_ids'], $settings['upload_position'] ?? 'end' );
			$after = array_map( 'strval', array_column( Meta_Sync::get_images_v2( $input['id'] ), 'id' ) );
			if ( array_diff( array_map( 'strval', $progress['attachment_ids'] ), $after ) ) {
				throw new \RuntimeException( 'Gallery persistence unconfirmed.' ); }
			Revision::end( true );
			$active                = false;
			$progress['added_ids'] = array_values( array_diff( $progress['attachment_ids'], $before ) );
			$progress['phase']     = 'saved';
			$progress['complete']  = empty( $page['after'] ) && ! $progress['failed'];
			return Requests::finish(
				$input['request_id'],
				$out( $progress['complete'] ? 'succeeded' : 'partial', $progress['complete'] ? '' : 'instagram_incomplete' ) + array(
					'instagram' => $progress,
					'gallery'   => Integration::gallery( get_post( $input['id'] ) ),
				)
			);
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false ); }
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'instagram_unconfirmed' ) + array( 'instagram' => $progress ) );
		} finally {
			if ( $locked ) {
				// Database lock/identity state must be read directly, never from an object cache.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery
				$wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock ) ); }
		}
	}
}
