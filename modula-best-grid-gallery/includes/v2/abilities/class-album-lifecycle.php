<?php
/** Explicit album lifecycle with graph protection and no implicit member ownership changes. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula_Pro\Extensions\Albums\V2\Meta_Sync;
use Modula_Pro\Extensions\Albums\V2\Members_Document;

defined( 'ABSPATH' ) || exit;

final class Album_Lifecycle {
	private const COPY_META = array( Meta_Sync::FLAT_META_KEY, Meta_Sync::SETTINGS_V2_META_KEY, 'modulaSorting', '_thumbnail_id', Members_Document::MEMBERS_V2_META_KEY, Members_Document::CLASSIC_META_KEY );
	public static function operations(): array { return array( 'modula/duplicate-album', 'modula/trash-album', 'modula/restore-album', 'modula/delete-album' ); }
	public static function callbacks(): array {
		$out = array( 'modula/read-album-lifecycle' => array( self::class, 'read' ) );
		foreach ( self::operations() as $name ) { $out[$name] = array( self::class, explode( '-', substr( $name, 7 ) )[0] ); }
		return $out;
	}
	public static function definitions(): array {
		$out = array();
		foreach ( self::callbacks() as $name => $callback ) {
			$read = 'modula/read-album-lifecycle' === $name;
			$input = $read ? Contract::object( array( 'id' => array( 'type' => 'integer', 'minimum' => 1 ) ), array( 'id' ) ) : Lifecycle::schema( str_replace( '-album', '-gallery', $name ) );
			$output = $read ? Contract::object( array( 'id' => array( 'type' => 'integer' ), 'revision' => Contract::revision_schema(), 'status' => array( 'type' => 'string' ) ), array( 'id', 'revision', 'status' ) ) : Contract::outcome_schema();
			$out[$name] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => 'Enabled Albums and current object permissions required. Read the lifecycle graph revision before writing, including in trash. Duplicate creates a root album with the same settings and member references, without reparenting or copying members/media. Duplicate and restore require draft/publish intent. Trash preserves hierarchy. Delete prunes references from editable Beta parents and detaches Beta children to root; classic mutations are refused. 30-day actor-scoped recovery.', 'input_schema' => $input, 'output_schema' => $output );
		}
		return $out;
	}
	public static function read( array $input ) {
		$id = (int) $input['id'];
		if ( ! Albums::can_access( $id ) || ! Beta_Settings::is_beta_album( $id ) ) { return new \WP_Error( 'modula_forbidden', 'An accessible Beta album is required.' ); }
		$graph = Album_Members::graph();
		if ( ! isset( $graph[$id] ) || ! hash_equals( Album_Members::token( $graph ), Album_Members::token( Album_Members::graph() ) ) ) { return new \WP_Error( 'modula_read_conflict', 'Album hierarchy changed while reading.' ); }
		return array( 'id' => $id, 'revision' => Album_Members::token( $graph ), 'status' => get_post_status( $id ) );
	}
	private static function permitted( int $id, string $operation, string $status ): bool {
		return Albums::can_access( $id, $status ) && ( 'modula/duplicate-album' === $operation ? Albums::can_access( 0, $status, true ) : current_user_can( 'delete_post', $id ) );
	}
	public static function can_recover( array $record ): bool {
		if ( ! Albums::can_access() ) { return false; }
		foreach ( $record['member_access'] ?? array() as $id ) { if ( ! current_user_can( 'edit_post', $id ) || ! current_user_can( 'read_post', $id ) ) { return false; } }
		if ( ! empty( $record['deleted'] ) && ! get_post( $record['target'] ) ) {
			foreach ( $record['required_caps'] as $cap ) { if ( ! current_user_can( $cap ) ) { return false; } }
			return true;
		}
		return self::permitted( $record['target'], $record['operation'], $record['publication'] ) && ( empty( $record['copy'] ) || Albums::can_access( $record['copy'] ) );
	}
	public static function duplicate( array $input ): array { return self::execute( $input, 'modula/duplicate-album' ); }
	public static function trash( array $input ): array { return self::execute( $input, 'modula/trash-album' ); }
	public static function restore( array $input ): array { return self::execute( $input, 'modula/restore-album' ); }
	public static function delete( array $input ): array { return self::execute( $input, 'modula/delete-album' ); }
	private static function execute( array $input, string $operation ): array {
		$input['id'] = (int) $input['id']; $id = $input['id']; $request = $input['request_id'];
		$outcome = static function ( $status, $code = '', $message = '' ) use ( $request, $operation ) { return Requests::outcome( $request, $status, $code, $message, $operation ); };
		$existing = Requests::existing( $input, $operation ); if ( null !== $existing ) { return $existing; }
		if ( ! self::permitted( $id, $operation, $input['status'] ?? '' ) ) { return $outcome( 'forbidden', 'current_permission_denied', 'Current album and lifecycle permissions are required.' ); }
		if ( ! Beta_Settings::is_beta_album( $id ) ) { return $outcome( 'rejected', 'unsupported_target', 'Only Beta albums support lifecycle changes.' ); }
		$trashed = 'trash' === get_post_status( $id );
		if ( ( 'modula/restore-album' === $operation && ! $trashed ) || ( in_array( $operation, array( 'modula/duplicate-album', 'modula/trash-album' ), true ) && $trashed ) || ( 'modula/trash-album' === $operation && ! EMPTY_TRASH_DAYS ) ) { return $outcome( 'rejected', 'invalid_lifecycle_state', 'Restore requires trash; duplicate/trash require a live album and trash must be enabled.' ); }
		$existing = Requests::claim( $input, $operation ); if ( null !== $existing ) { return $existing; }
		$active = false;
		try {
			Revision::begin(); $active = true;
			$graph = Album_Members::graph( true );
			if ( ! hash_equals( $input['revision'], Album_Members::token( $graph ) ) ) {
				Revision::end( false ); $active = false;
				return Requests::finish( $request, $outcome( 'conflict', 'stale_revision', 'Read and reconcile the album lifecycle graph.' ) );
			}
			if ( 'modula/duplicate-album' === $operation ) {
				$settings = Meta_Sync::get_settings_v2( $id );
				if ( ! $settings ) {
					$flat = get_post_meta( $id, Meta_Sync::FLAT_META_KEY, true );
					$settings = \Modula_Pro\Extensions\Albums\V2\Adapter::to_grouped( is_array( $flat ) ? $flat : array() );
				}
				$valid = Albums::validate_configuration( $settings );
				if ( is_wp_error( $valid ) ) {
					Revision::end( false ); $active = false;
					return Requests::finish( $request, $outcome( 'rejected', 'ineligible_album_settings', 'The source contains invalid or unavailable active configuration.' ) );
				}
			}
			$documents = array(); $parents = array(); $access = array_column( $graph[$id]['members'], 'id' );
			if ( 'modula/delete-album' === $operation ) {
				foreach ( $graph as $album => $state ) {
					if ( $album === $id ) { continue; }
					$members = array_values( array_filter( $state['members'], static function ( $member ) use ( $id ) { return (int) $member['id'] !== $id; } ) );
					if ( $members !== $state['members'] ) { $documents[$album] = $members; }
					if ( $id === $state['parent'] ) { $parents[$album] = 0; }
				}
				foreach ( array_unique( array_merge( array_keys( $documents ), array_keys( $parents ) ) ) as $affected ) {
					if ( ! Beta_Settings::is_beta_album( $affected ) || ! Albums::can_access( $affected ) ) {
						Revision::end( false ); $active = false;
						return Requests::finish( $request, $outcome( 'rejected', 'ineligible_hierarchy', 'Every changed parent and child must be an accessible Beta album.' ) );
					}
					$access[] = $affected;
				}
			}
			$access = array_values( array_unique( array_diff( $access, array( $id ) ) ) );
			foreach ( $access as $member ) {
				Revision::document( $member, true );
				if ( ! current_user_can( 'edit_post', $member ) || ! current_user_can( 'read_post', $member ) ) {
					Revision::end( false ); $active = false;
					return Requests::finish( $request, $outcome( 'forbidden', 'inaccessible_member', 'Current access to affected members is required.' ) );
				}
			}
			if ( ! self::permitted( $id, $operation, $input['status'] ?? '' ) ) { throw new \RuntimeException( 'Access changed.' ); }
			Requests::context( $request, array( 'member_access' => $access ) );
			$out = $outcome( 'succeeded' );
			if ( 'modula/duplicate-album' === $operation ) {
				$copy = self::copy( $id, $input['status'], $graph[$id]['members'] );
				Requests::context( $request, array( 'copy' => $copy ) );
				$out['album'] = Albums::summary( $copy );
			} elseif ( 'modula/delete-album' === $operation ) {
				if ( is_wp_error( Members_Document::persist_composition( $documents, $parents ) ) || ! wp_delete_post( $id, true ) || get_post( $id ) ) { throw new \RuntimeException( 'Deletion unconfirmed.' ); }
				Requests::context( $request, array( 'deleted' => true ) ); $out['deleted_id'] = $id;
			} else {
				$status = 'modula/trash-album' === $operation ? 'trash' : $input['status'];
				$saved = Meta_Sync::with_canonical_write( $id, static function () use ( $id, $status ) {
					if ( 'trash' === $status ) { return wp_trash_post( $id ); }
					add_filter( 'wp_untrash_post_status', array( Lifecycle::class, 'restore_draft' ), PHP_INT_MAX );
					try { $saved = wp_untrash_post( $id ); } finally { remove_filter( 'wp_untrash_post_status', array( Lifecycle::class, 'restore_draft' ), PHP_INT_MAX ); }
					return $saved && 'publish' === $status ? wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ), true ) : $saved;
				} );
				if ( ! $saved || is_wp_error( $saved ) || get_post_status( $id ) !== $status ) { throw new \RuntimeException( 'Lifecycle unconfirmed.' ); }
				$out['album'] = Albums::summary( $id );
			}
			$out = Requests::finish( $request, $out );
			if ( 'succeeded' !== $out['status'] ) { throw new \RuntimeException( 'Outcome unconfirmed.' ); }
			Revision::end( true ); $active = false; return $out;
		} catch ( \Throwable $error ) {
			if ( $active ) { Revision::end( false ); }
			return Requests::finish( $request, $outcome( 'uncertain', 'album_lifecycle_unconfirmed', 'Recover this request and reconcile the album before another action.' ) );
		}
	}
	private static function copy( int $id, string $status, array $members ): int {
		$source = get_post( $id );
		$copy = wp_insert_post( wp_slash( array( 'post_type' => 'modula-album', 'post_status' => 'draft', 'post_title' => 'Copy of ' . $source->post_title, 'post_author' => get_current_user_id(), 'post_password' => $source->post_password, 'meta_input' => array( Beta_Settings::META_KEY => '1' ) ) ), true );
		if ( is_wp_error( $copy ) || ! $copy ) { throw new \RuntimeException( 'Copy unconfirmed.' ); }
		Revision::track( array( $copy ) );
		Meta_Sync::with_canonical_write( $copy, static function () use ( $copy, $id, $status, $members ) {
			foreach ( self::COPY_META as $key ) {
				if ( metadata_exists( 'post', $id, $key ) ) { update_post_meta( $copy, $key, wp_slash( get_post_meta( $id, $key, true ) ) ); }
			}
			if ( 'publish' === $status ) { wp_update_post( array( 'ID' => $copy, 'post_status' => $status ) ); }
		} );
		Revision::clear_cache();
		if ( get_post_status( $copy ) !== $status || get_post( $copy )->post_password !== $source->post_password || Album_Members::members( $copy ) !== $members ) { throw new \RuntimeException( 'Copy differs.' ); }
		foreach ( self::COPY_META as $key ) { if ( get_post_meta( $copy, $key, true ) !== get_post_meta( $id, $key, true ) ) { throw new \RuntimeException( 'Copy configuration differs.' ); } }
		return $copy;
	}
}
