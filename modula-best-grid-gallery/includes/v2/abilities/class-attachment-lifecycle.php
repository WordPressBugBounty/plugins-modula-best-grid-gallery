<?php
/** Explicit local attachment lifecycle; irreversible file effects are never replayed. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Usage\Usage_Service;
use WPChill\Folders\Storage\Option_Provider_Map_Repository;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Memberships\Wpdb_Membership_Repository;
use Modula\V2\Meta_Sync;
use Modula\V2\Beta_Settings;

defined( 'ABSPATH' ) || exit;
final class Attachment_Lifecycle {
	public static function operations(): array {
		return array( 'modula/trash-attachment', 'modula/restore-attachment', 'modula/delete-attachment' ); }
	public static function available( string $operation ): bool {
		return Media_Folders::can_manage() && Folders_Dependency::available( 'usage' ) && ( 'modula/delete-attachment' === $operation || ( defined( 'MEDIA_TRASH' ) && MEDIA_TRASH && EMPTY_TRASH_DAYS ) );
	}
	public static function callbacks(): array {
		$out = array();
		foreach ( self::operations() as $name ) {
			$out[ $name ] = static function ( $input ) use ( $name ) {
				return self::execute( $input, $name );
			}; }
		return $out;
	}
	public static function definitions(): array {
		$out = array();
		foreach ( self::operations() as $name ) {
			$out[ $name ] = array(
				'label'         => ucwords( str_replace( '-', ' ', substr( $name, 7 ) ) ),
				'description'   => 'Explicit local attachment lifecycle using WordPress. Trash and restore require MEDIA_TRASH and EMPTY_TRASH_DAYS; no permanent-delete fallback. Requires current edit/read/delete permissions and read-attachment revision. Known gallery/bound, indexed content/featured-image and album-cover usage blocks trash/delete even when hidden from this actor. Provider-mapped/storage-resident media is rejected. Permanent deletion verifies known original/derivative files are absent; failed confirmation is uncertain and never retried. Unknown external/plugin/theme references are not covered. Recover identical requests for 30 days.',
				'input_schema'  => Contract::object(
					array(
						'request_id' => Contract::request_id_schema(),
						'id'         => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'revision'   => Contract::revision_schema(),
					),
					array( 'request_id', 'id', 'revision' )
				),
				'output_schema' => Contract::outcome_schema(),
			);
		}
		return $out;
	}
	public static function can_recover( array $record ): bool {
		if ( ! Media_Folders::can_manage() || ! Folders_Dependency::available( 'usage' ) ) {
			return false; }
		if ( get_post( $record['target'] ) ) {
			return Attachments::can_read( $record['target'] ) && current_user_can( 'delete_post', $record['target'] ); }
		if ( 'modula/delete-attachment' !== $record['operation'] || empty( $record['required_caps'] ) ) {
			return false; }
		foreach ( $record['required_caps'] as $cap ) {
			if ( ! current_user_can( $cap ) ) {
				return false; }
		}
		return true;
	}
	/** Guard all known uses, without leaking referring objects or filtering by actor access. */
	public static function used( int $id ): bool {
		if ( Usage_Service::service()->repository()->has_usage( $id ) ) {
			return true; }
		$page = 1;
		do {
			$query = new \WP_Query(
				array(
					'post_type'      => 'modula-gallery',
					'post_status'    => array_keys( get_post_stati() ),
					'posts_per_page' => 200,
					'paged'          => $page++,
					'fields'         => 'ids',
					'orderby'        => 'ID',
					'order'          => 'ASC',
					'no_found_rows'  => true,
				)
			);
			foreach ( $query->posts as $gallery_id ) {
				$items = Beta_Settings::is_beta_gallery( $gallery_id ) ? Meta_Sync::get_images_v2( $gallery_id ) : get_post_meta( $gallery_id, 'modula-images', true );
				if ( \Modula\Bound_Gallery\Bound_Gallery::references_attachment( $gallery_id, $id, is_array( $items ) ? $items : array() ) ) {
					return true; }
			}
			$found = count( $query->posts );
		} while ( 200 === $found );
		global $wpdb;
		$albums = $wpdb->get_results( "SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_key IN ('modula-album-galleries','modula_album_members_v2')", ARRAY_A );
		foreach ( $albums as $album ) {
			$rows = maybe_unserialize( $album['meta_value'] );
			if ( is_string( $rows ) ) {
				$rows = json_decode( $rows, true ); }
			foreach ( is_array( $rows ) ? ( $rows['members'] ?? $rows ) : array() as $row ) {
				if ( is_array( $row ) && (int) ( $row['cover'] ?? 0 ) === $id ) {
					return true; }
			}
		}
		$relative = get_post_meta( $id, '_wp_attached_file', true );
		if ( $relative && $wpdb->get_var( $wpdb->prepare( "SELECT meta_id FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file' AND meta_value = %s AND post_id <> %d LIMIT 1", $relative, $id ) ) ) {
			return true; }
		// Featured images are a known WordPress relation even before usage indexing.
		return (bool) $wpdb->get_var( $wpdb->prepare( "SELECT meta_id FROM {$wpdb->postmeta} WHERE meta_key = '_thumbnail_id' AND meta_value = %s LIMIT 1", (string) $id ) );
	}
	/** Enumerate only paths WordPress knows; never expose server paths in the outcome. */
	private static function files( int $id ): array {
		$file = get_attached_file( $id, true );
		$base = realpath( wp_get_upload_dir()['basedir'] );
		if ( ! $file || ! $base || ! is_file( $file ) ) {
			throw new \DomainException( 'A local original is required.' ); }
		$meta  = wp_get_attachment_metadata( $id, true );
		$meta  = is_array( $meta ) ? $meta : array();
		$files = array( $file );
		foreach ( array( 'thumb', 'original_image', 'source_image', 'animated_video', 'animated_video_poster' ) as $key ) {
			if ( ! empty( $meta[ $key ] ) ) {
				$files[] = dirname( $file ) . '/' . $meta[ $key ]; }
		}
		foreach ( $meta['sizes'] ?? array() as $size ) {
			if ( ! empty( $size['file'] ) ) {
				$files[] = dirname( $file ) . '/' . $size['file']; }
		}
		foreach ( (array) get_post_meta( $id, '_wp_attachment_backup_sizes', true ) as $size ) {
			if ( ! empty( $size['file'] ) ) {
				$files[] = dirname( $file ) . '/' . $size['file']; }
		}
		foreach ( $files as $path ) {
			$resolved = realpath( $path );
			if ( is_link( $path ) || false !== strpos( $path, '..' ) || ( $resolved && 0 !== strpos( $resolved, $base . DIRECTORY_SEPARATOR ) ) ) {
				throw new \DomainException( 'Only files inside the local uploads directory are supported.' ); }
		}
		return array_values( array_unique( $files ) );
	}
	public static function execute( array $input, string $operation ): array {
		$input['id'] = (int) $input['id'];
		$existing    = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, $operation );
		};
		$id  = $input['id'];
		if ( ! Attachments::can_read( $id ) || ! current_user_can( 'delete_post', $id ) ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current attachment read, edit and delete permissions are required.' ); }
		if ( ! self::available( $operation ) ) {
			return $out( 'rejected', 'media_trash_disabled', 'Reversible media trash is disabled in this WordPress environment.' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$active       = false;
		$staged_files = array();
		$stage_delete = null;
		try {
			Revision::begin();
			$active = true;
			// Conservative locks protect known reference writers, including insertions.
			Revision::attachment_usage();
			if ( ! hash_equals( Revision::document( $id, true ), $input['revision'] ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision', 'Read current attachment state and reconcile before a new identity.' ) );
			}
			$error   = null;
			$restore = 'modula/restore-attachment' === $operation;
			$delete  = 'modula/delete-attachment' === $operation;
			if ( ! Attachments::can_read( $id ) || ! current_user_can( 'delete_post', $id ) ) {
				$error = 'current_permission_denied'; }
			if ( ! self::available( $operation ) ) {
				$error = 'media_trash_disabled'; }
			if ( ( $restore && 'trash' !== get_post_status( $id ) ) || ( ! $restore && ! $delete && 'trash' === get_post_status( $id ) ) ) {
				$error = 'invalid_lifecycle_state'; }
			$folder_id = ( new Wpdb_Membership_Repository() )->folder_for_object( $id, 'attachment' );
			$folder    = $folder_id ? Folders_Controller::service()->find( $folder_id ) : null;
			if ( ( new Option_Provider_Map_Repository() )->find_by_attachment( $id ) || ! empty( $folder['connection_id'] ) ) {
				$error = 'remote_media_unsupported'; }
			if ( ! $restore && self::used( $id ) ) {
				$error = 'attachment_in_use'; }
			if ( $error ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'rejected', $error, 'Attachment lifecycle refused; object and file bytes are preserved.' ) );
			}
			$files = self::files( $id );
			if ( $delete ) {
				// WordPress removes its rows and invokes its normal file filters, but actual
				// unlink waits until the database commit is confirmed. A DB rollback can
				// therefore never resurrect an attachment whose files we already deleted.
				$stage_delete = static function ( $path ) use ( &$staged_files, $files ) {
					if ( $path ) {
						if ( ! in_array( $path, $files, true ) ) {
							throw new \RuntimeException( 'Unexpected file deletion path.' ); }
						$staged_files[] = $path;
					}
					return '';
				};
				add_filter( 'wp_delete_file', $stage_delete, PHP_INT_MAX );
			}
			$result = $delete ? wp_delete_attachment( $id, true ) : ( $restore ? wp_untrash_post( $id ) : wp_trash_post( $id ) );
			if ( $stage_delete ) {
				remove_filter( 'wp_delete_file', $stage_delete, PHP_INT_MAX );
				$stage_delete = null; }
			Revision::clear_cache();
			if ( ! $result || is_wp_error( $result ) ) {
				// A service refusal must not be mistaken for a successful transport response.
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'rejected', 'lifecycle_refused', 'WordPress refused the requested lifecycle operation.' ) );
			}
			if ( $delete ) {
				if ( get_post( $id ) ) {
					throw new \RuntimeException( 'Object deletion unconfirmed.' ); }
				Revision::end( true );
				$active = false;
				// Paths already passed WordPress's filters and our uploads boundary.
				// Do not run filters twice: a refusal remains a refusal.
				foreach ( array_unique( $staged_files ) as $path ) {
					if ( is_file( $path ) && ! @unlink( $path ) ) {
						throw new \RuntimeException( 'File deletion failed.' ); }
				}
				foreach ( $files as $path ) {
					clearstatcache( true, $path );
					if ( file_exists( $path ) ) {
						throw new \RuntimeException( 'File deletion unconfirmed.' ); }
				}
			} elseif ( ( $restore && 'trash' === get_post_status( $id ) ) || ( ! $restore && 'trash' !== get_post_status( $id ) ) ) {
				throw new \RuntimeException( 'Status change unconfirmed.' ); }
			$response = $out( 'succeeded' );
			if ( $delete ) {
				$response['deleted_id'] = $id;
			} else {
				$response['attachment'] = Attachments::summary( $id ); }
			$response = Requests::finish( $input['request_id'], $response );
			if ( $active ) {
				Revision::end( true );
				$active = false; }
			return $response;
		} catch ( \Throwable $error ) {
			if ( $stage_delete ) {
				remove_filter( 'wp_delete_file', $stage_delete, PHP_INT_MAX ); }
			// An active transaction means unlink has not started; rollback is safe.
			if ( $active ) {
				Revision::end( false ); }
			$invalid = $error instanceof \DomainException;
			return Requests::finish( $input['request_id'], $out( $invalid ? 'rejected' : 'uncertain', $invalid ? 'local_file_required' : 'lifecycle_unconfirmed', $invalid ? 'Only a local uploads attachment is supported.' : 'The effect could not be confirmed. Recover this identity; do not repeat with a new request.' ) );
		}
	}
}
