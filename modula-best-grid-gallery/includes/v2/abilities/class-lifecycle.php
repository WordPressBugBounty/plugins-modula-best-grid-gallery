<?php
/** Explicit gallery lifecycle, with shared-media preservation and recoverable results. */
namespace Modula\V2\Abilities;
use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
defined( 'ABSPATH' ) || exit;
final class Lifecycle {
	public static function operations(): array { return array( 'modula/duplicate-gallery', 'modula/trash-gallery', 'modula/restore-gallery', 'modula/delete-gallery' ); }
	public static function schema( string $operation ): array {
		$fields = array( 'request_id' => Contract::request_id_schema(), 'id' => array( 'type' => 'integer', 'minimum' => 1 ), 'revision' => Contract::revision_schema() );
		if ( in_array( $operation, array( 'modula/duplicate-gallery', 'modula/restore-gallery' ), true ) ) {
			$fields['status'] = array( 'type' => 'string', 'enum' => array( 'draft', 'publish' ) );
		}
		return Contract::object( $fields, array_keys( $fields ) );
	}
	public static function can_execute( int $id, string $operation, string $status ): bool {
		if ( ! Update::can_update( $id, $status ) ) { return false; }
		return 'modula/duplicate-gallery' === $operation ? Creation::can_create( $status ) : current_user_can( 'delete_post', $id );
	}
	public static function can_recover( array $record ): bool {
		foreach ( $record['albums'] ?? array() as $album ) { if ( ! current_user_can( 'edit_post', $album ) ) { return false; } }
		if ( ! Creation::can_use_attachments( $record['attachment_ids'] ) ) { return false; }
		if ( ! empty( $record['deleted'] ) && ! get_post( $record['target'] ) ) {
			foreach ( $record['required_caps'] as $cap ) { if ( ! current_user_can( $cap ) ) { return false; } }
			return true;
		}
		return self::can_execute( $record['target'], $record['operation'], $record['publication'] ) && ( empty( $record['copy'] ) || Integration::can_read_post( $record['copy'] ) );
	}
	public static function duplicate( array $input ): array { return self::execute( $input, 'modula/duplicate-gallery' ); }
	public static function trash( array $input ): array { return self::execute( $input, 'modula/trash-gallery' ); }
	public static function restore( array $input ): array { return self::execute( $input, 'modula/restore-gallery' ); }
	public static function delete( array $input ): array { return self::execute( $input, 'modula/delete-gallery' ); }
	private static function execute( array $input, string $operation ): array {
		// Core's destructive REST transport supplies query scalars; normalize after schema validation.
		$input['id'] = (int) $input['id'];
		$outcome = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) { return Requests::outcome( $input['request_id'], $status, $code, $message, $operation ); };
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		$id = $input['id'];
		if ( ! self::can_execute( $id, $operation, $input['status'] ?? '' ) ) { return $outcome( 'forbidden', 'current_permission_denied', 'Current gallery, lifecycle and requested publication permissions are required.' ); }
		if ( ! Beta_Settings::is_beta_gallery( $id ) || get_post_meta( $id, '_modula_bind_target_type', true ) ) { return $outcome( 'rejected', 'unsupported_target', 'Only unbound Beta galleries support this lifecycle contract.' ); }
		$trashed = 'trash' === get_post_status( $id );
		if ( ( 'modula/restore-gallery' === $operation && ! $trashed ) || ( in_array( $operation, array( 'modula/trash-gallery', 'modula/duplicate-gallery' ), true ) && $trashed ) ) { return $outcome( 'rejected', 'invalid_lifecycle_state', 'Restore requires trash; trash and duplication require a live gallery.' ); }
		if ( 'modula/trash-gallery' === $operation && ! EMPTY_TRASH_DAYS ) { return $outcome( 'rejected', 'trash_disabled', 'WordPress trash must be enabled for a reversible action.' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		$active = false;
		try {
			Revision::begin(); $active = true;
			$current = Revision::state( $id, true );
			if ( ! hash_equals( $input['revision'], $current ) ) {
				Revision::end( false ); $active = false;
				return Requests::finish( $input['request_id'], $outcome( 'conflict', 'stale_revision', 'Read and reconcile the gallery and affected albums before a new request.' ) );
			}
			if ( ! self::can_execute( $id, $operation, $input['status'] ?? '' ) ) { throw new \RuntimeException( 'Access changed.' ); }
			$albums = Gallery_Relations::state( $id );
			if ( 'modula/duplicate-gallery' !== $operation ) {
				foreach ( $albums as $album ) {
					if ( ! $album['beta'] || ! current_user_can( 'edit_post', $album['id'] ) || ! class_exists( '\Modula_Pro\Extensions\Albums\V2\Members_Document' ) ) {
						Revision::end( false ); $active = false;
						return Requests::finish( $input['request_id'], $outcome( 'rejected', 'unsupported_album_reference', 'Affected albums must be editable Beta albums with Compatible Pro active.' ) );
					}
				}
			}
			Requests::context( $input['request_id'], array( 'albums' => 'modula/duplicate-gallery' === $operation ? array() : array_column( $albums, 'id' ) ) );
			$out = $outcome( 'succeeded' );
			if ( 'modula/duplicate-gallery' === $operation ) {
				$copy = self::copy( $id, $input['status'], $input['request_id'] );
				Requests::context( $input['request_id'], array( 'copy' => $copy ) );
				$out['gallery'] = Integration::gallery( get_post( $copy ) );
				$out['gallery']['revision'] = Revision::state( $copy );
				$url = Creation::public_url( $copy );
				if ( $url ) { $out['gallery']['public_url'] = $url; }
			} elseif ( 'modula/delete-gallery' === $operation ) {
				if ( ! wp_delete_post( $id, true ) || get_post( $id ) || Gallery_Relations::state( $id ) ) { throw new \RuntimeException( 'Deletion or album pruning unconfirmed.' ); }
				Requests::context( $input['request_id'], array( 'deleted' => true ) );
				$out['deleted_id'] = $id;
			} else {
				$status = 'modula/trash-gallery' === $operation ? 'trash' : $input['status'];
				if ( 'trash' === $status ) { $saved = wp_trash_post( $id ); }
				else {
					// Restore in draft first; publication is an explicit separate choice in this input.
					add_filter( 'wp_untrash_post_status', array( __CLASS__, 'restore_draft' ), PHP_INT_MAX );
					try { $saved = wp_untrash_post( $id ); } finally { remove_filter( 'wp_untrash_post_status', array( __CLASS__, 'restore_draft' ), PHP_INT_MAX ); }
					if ( $saved && 'publish' === $status ) {
						if ( ! self::can_execute( $id, $operation, $status ) ) { throw new \RuntimeException( 'Publication access changed.' ); }
						$saved = wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ), true ); }
				}
				if ( ! $saved || is_wp_error( $saved ) || get_post_status( $id ) !== $status ) { throw new \RuntimeException( 'Lifecycle state unconfirmed.' ); }
				$out['gallery'] = Integration::gallery( get_post( $id ) );
				$out['gallery']['revision'] = Revision::state( $id );
			}
			$out = Requests::finish( $input['request_id'], $out );
			Revision::end( true ); $active = false;
			return $out;
		} catch ( \Throwable $error ) {
			if ( $active ) { Revision::end( false ); }
			return Requests::finish( $input['request_id'], $outcome( 'uncertain', 'lifecycle_unconfirmed', 'Recover this request and reconcile the gallery before another action.' ) );
		}
	}
	public static function restore_draft(): string { return 'draft'; }
	private static function copy( int $id, string $status, string $request ): int {
		$source = get_post( $id );
		$items = Meta_Sync::get_images_v2( $id );
		$attachments = array();
		foreach ( $items as $item ) { foreach ( array( 'id', 'blockBackgroundImageId' ) as $key ) { if ( ! empty( $item[ $key ] ) && is_numeric( $item[ $key ] ) ) { $attachments[] = (int) $item[ $key ]; } } }
		if ( ! Creation::can_use_attachments( $attachments ) ) { throw new \RuntimeException( 'Media access denied.' ); }
		Requests::context( $request, array( 'attachment_ids' => array_values( array_unique( $attachments ) ) ) );
		$copy = wp_insert_post( wp_slash( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_author' => get_current_user_id(), 'post_title' => 'Copy of ' . $source->post_title, 'post_password' => $source->post_password, 'meta_input' => array( Beta_Settings::META_KEY => 1 ) ) ), true );
		if ( is_wp_error( $copy ) || ! $copy ) { throw new \RuntimeException( 'Copy unconfirmed.' ); }
		Revision::track( array( $copy ) );
		Meta_Sync::with_canonical_gallery_write( $copy, static function () use ( $copy, $id, $items, $status, $attachments ) {
			foreach ( array( 'modula-settings', Meta_Sync::SETTINGS_V2_META_KEY ) as $key ) { update_post_meta( $copy, $key, wp_slash( get_post_meta( $id, $key, true ) ) ); }
			Meta_Sync::persist_prepared_gallery_items( $copy, $items );
			if ( ! self::can_execute( $id, 'modula/duplicate-gallery', $status ) || ! Integration::can_read_post( $copy ) || ! Creation::can_use_attachments( $attachments ) ) { throw new \RuntimeException( 'Copy access changed.' ); }
			if ( 'publish' === $status ) { wp_update_post( array( 'ID' => $copy, 'post_status' => 'publish' ) ); }
		} );
		if ( get_post_status( $copy ) !== $status || $items !== Meta_Sync::get_images_v2( $copy ) ) { throw new \RuntimeException( 'Copy differs.' ); }
		return $copy;
	}
}
