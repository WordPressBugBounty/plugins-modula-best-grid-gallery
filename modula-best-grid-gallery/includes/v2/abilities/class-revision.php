<?php
/** Authoritative state fingerprints and row locks, shared with ordinary SQL writers. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Revision {
	private static $locked_ids = array();
	private static $active = false;
	private static $connection_id = null;
	private static function query( string $sql ): array {
		global $wpdb;
		$rows = $wpdb->get_results( $sql, ARRAY_A );
		if ( null === $rows || $wpdb->last_error ) {
			throw new \RuntimeException( 'Revision query failed.' );
		}
		return $rows;
	}
	/** Hash raw state, including secret-bearing metadata, but never return it. No read repairs. */
	public static function state( int $id, bool $lock = false ): string {
		global $wpdb;
		$suffix = $lock ? ' FOR UPDATE' : '';
		// Lock the parent first, matching WordPress post-save then metadata ordering.
		if ( $lock ) {
			self::query( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE ID = %d FOR UPDATE", $id ) );
		}
		$meta = self::query( $wpdb->prepare( "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key NOT IN ('_edit_lock','_edit_last') ORDER BY meta_id" . $suffix, $id ) );
		$ids = array( $id );
		foreach ( $meta as $row ) {
			if ( 0 === strpos( $row['meta_key'], 'modula_images_v2' ) && 'modula_images_v2_manifest' !== $row['meta_key'] ) {
				$decoded = json_decode( $row['meta_value'], true ) ?: array();
				foreach ( \Modula\V2\Images\Adapter::unwrap_items_lenient( $decoded ) as $item ) {
					foreach ( array( 'video_url', 'video_thumbnail' ) as $video_field ) {
						if ( ! empty( $item[ $video_field ] ) ) { $video_id = attachment_url_to_postid( $item[ $video_field ] ); if ( $video_id ) { $ids[] = $video_id; } }
					}
					foreach ( array( 'id', 'blockBackgroundImageId' ) as $key ) {
						if ( ! empty( $item[ $key ] ) && is_numeric( $item[ $key ] ) ) {
							$ids[] = absint( $item[ $key ] );
						}
					}
				}
			}
		}
		$ids = array_unique( $ids );
		sort( $ids );
		if ( $lock ) {
			self::$locked_ids = array_unique( array_merge( self::$locked_ids, $ids ) );
		}
		foreach ( $ids as $post_id ) {
			wp_cache_delete( $post_id, 'posts' );
			wp_cache_delete( $post_id, 'post_meta' );
		}
		$list = implode( ',', array_map( 'absint', $ids ) );
		$posts = self::query( "SELECT ID,post_type,post_status,post_title,post_content,post_excerpt,post_password,post_author,post_name,post_modified_gmt FROM {$wpdb->posts} WHERE ID IN ($list) ORDER BY ID" . $suffix );
		$metadata = self::query( "SELECT post_id,meta_key,meta_value FROM {$wpdb->postmeta} WHERE post_id IN ($list) AND meta_key NOT IN ('_edit_lock','_edit_last') ORDER BY post_id,meta_id" . $suffix );
		$terms = self::query( "SELECT object_id,term_taxonomy_id,term_order FROM {$wpdb->term_relationships} WHERE object_id IN ($list) ORDER BY object_id,term_taxonomy_id" . $suffix );
		// Lock organization rows for referenced attachments, including insertion gaps.
		$library = array();
		$organization_ids = array( 'wpchill_folders' => array(), 'wpchill_collections' => array() );
		foreach ( array( 'wpchill_folder_memberships' => 'folder_id', 'wpchill_collection_labels' => 'collection_id' ) as $name => $parent ) {
			if ( ! Folders_Dependency::loaded() ) { continue; }
			$table = $wpdb->prefix . $name;
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) ) ) {
				if ( $lock ) {
					self::require_transactional_table( $table );
				}
				$rows = self::query( "SELECT * FROM $table WHERE object_type = 'attachment' AND object_id IN ($list) ORDER BY id" . $suffix );
				$library[ $name ] = $rows;
				$organization_ids[ 'folder_id' === $parent ? 'wpchill_folders' : 'wpchill_collections' ] = array_column( $rows, $parent );
			}
		}
		foreach ( $organization_ids as $name => $parent_ids ) {
			$table = $wpdb->prefix . $name;
			if ( $parent_ids && $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) ) ) {
				if ( $lock ) {
					self::require_transactional_table( $table );
				}
				$parents = implode( ',', array_map( 'absint', array_unique( $parent_ids ) ) );
				$library[ $name ] = self::query( "SELECT * FROM $table WHERE id IN ($parents) ORDER BY id" . $suffix );
			}
		}
		$config = self::query( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN ('wpchill_folders_storage_connections','wpchill_folders_storage_maps','modula_pro_active_extensions','modula_pro_current_plan','modula_pro_license_data') ORDER BY option_name" . $suffix );
		$relations = Gallery_Relations::state( $id, $lock );
		if ( $lock ) { self::track( array_column( $relations, 'id' ) ); }
		return hash( 'sha256', wp_json_encode( array( $posts, $metadata, $terms, $library, $config, $relations ) ) );
	}
	/** Conservative site-wide organizer revision; row/gap locks include ordinary REST writers. */
	public static function organization( bool $lock = false ): string {
		if ( ! Folders_Dependency::available( 'folders' ) ) {
			throw new \RuntimeException( 'Folders dependency unavailable.' );
		}
		global $wpdb;
		$rows = array(); $suffix = $lock ? ' FOR UPDATE' : '';
		foreach ( array( 'wpchill_folders', 'wpchill_folder_memberships' ) as $name ) {
			$table = $wpdb->prefix . $name;
			if ( $lock ) { self::require_transactional_table( $table ); }
			$rows[] = self::query( "SELECT * FROM $table ORDER BY id" . $suffix );
		}
		$rows[] = self::query( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN ('wpchill_folders_folder_transfer','wpchill_folders_storage_maps','wpchill_folders_storage_connections','modula_pro_active_extensions','modula_pro_current_plan','modula_pro_license_data') ORDER BY option_name" . $suffix );
		return hash( 'sha256', wp_json_encode( $rows ) );
	}
	/** Serialize known reference writes during irreversible local media operations. */
	public static function attachment_usage(): void {
		if ( ! Folders_Dependency::available( 'usage' ) ) {
			throw new \RuntimeException( 'Folders dependency unavailable.' );
		}
		global $wpdb;
		$posts = self::query( "SELECT ID FROM {$wpdb->posts} ORDER BY ID FOR UPDATE" );
		self::query( "SELECT meta_id FROM {$wpdb->postmeta} ORDER BY meta_id FOR UPDATE" );
		self::track( array_column( $posts, 'ID' ) );
		self::clear_cache();
		self::organization( true );
		$table = $wpdb->prefix . 'wpchill_attachment_usage';
		self::require_transactional_table( $table );
		self::query( "SELECT * FROM $table FOR UPDATE" );
		wp_cache_delete( 'wpchill_folders_storage_maps', 'options' );
	}
	/** Shared site collections/favorites, including ordinary organizer writes and insertion gaps. */
	public static function collections( bool $lock = false ): string {
		if ( ! Folders_Dependency::available( 'collections' ) ) {
			throw new \RuntimeException( 'Folders dependency unavailable.' );
		}
		global $wpdb;
		$rows = array(); $suffix = $lock ? ' FOR UPDATE' : '';
		foreach ( array( 'wpchill_collections', 'wpchill_collection_labels', 'wpchill_favorites' ) as $name ) {
			$table = $wpdb->prefix . $name;
			if ( $lock ) { self::require_transactional_table( $table ); }
			$rows[] = self::query( "SELECT * FROM $table ORDER BY id" . $suffix );
		}
		$rows[] = self::query( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN ('modula_pro_active_extensions','modula_pro_current_plan','modula_pro_license_data') ORDER BY option_name" . $suffix );
		return hash( 'sha256', wp_json_encode( $rows ) );
	}
	/** Album/preset metadata operations depend on their own document, not gallery relations or media. */
	public static function document( int $id, bool $lock = false ): string {
		global $wpdb;
		$suffix = $lock ? ' FOR UPDATE' : '';
		$post = self::query( $wpdb->prepare( "SELECT * FROM {$wpdb->posts} WHERE ID = %d" . $suffix, $id ) );
		$meta = self::query( $wpdb->prepare( "SELECT meta_key,meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key NOT IN ('_edit_lock','_edit_last') ORDER BY meta_id" . $suffix, $id ) );
		$config = self::query( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name IN ('modula_pro_active_extensions','modula_pro_current_plan','modula_pro_license_data') ORDER BY option_name" . $suffix );
		if ( $lock ) { self::track( array( $id ) ); }
		wp_cache_delete( $id, 'posts' );
		wp_cache_delete( $id, 'post_meta' );
		return hash( 'sha256', wp_json_encode( array( $post, $meta, $config ) ) );
	}
	/** Newly added media is not part of the old revision, but must remain stable during the write. */
	public static function lock_attachments( array $ids ): void {
		global $wpdb;
		$ids = array_unique( array_map( 'absint', $ids ) );
		sort( $ids );
		$list = implode( ',', $ids );
		self::query( "SELECT ID FROM {$wpdb->posts} WHERE ID IN ($list) ORDER BY ID FOR UPDATE" );
		self::query( "SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id IN ($list) ORDER BY post_id,meta_id FOR UPDATE" );
		self::$locked_ids = array_unique( array_merge( self::$locked_ids, $ids ) );
		self::clear_cache();
	}
	public static function require_transactional_table( string $table ): void {
		global $wpdb;
		$engine = $wpdb->get_row( $wpdb->prepare( 'SHOW TABLE STATUS WHERE Name = %s', $table ), ARRAY_A );
		if ( 'InnoDB' !== ( $engine['Engine'] ?? '' ) ) {
			throw new \RuntimeException( 'Transactional tables are required.' );
		}
	}
	public static function begin(): void {
		global $wpdb;
		if ( self::$active ) {
			throw new \RuntimeException( 'Nested transactions are unsupported.' );
		}
		foreach ( array( $wpdb->posts, $wpdb->postmeta, $wpdb->term_relationships, $wpdb->options ) as $table ) {
			self::require_transactional_table( $table );
		}
		if ( false === $wpdb->query( 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ' ) || false === $wpdb->query( 'START TRANSACTION' ) ) {
			throw new \RuntimeException( 'Transaction unavailable.' );
		}
		self::$active = true;
		self::$connection_id = $wpdb->dbh instanceof \mysqli ? $wpdb->dbh->thread_id : null;
		add_filter( 'query', array( __CLASS__, 'guard_query' ), PHP_INT_MAX );
	}
	/** Abort after SQL errors, reconnects or hooks attempting to end the protected boundary. */
	public static function guard_query( string $query ): string {
		global $wpdb;
		if ( $wpdb->last_error || ( null !== self::$connection_id && ( ! ( $wpdb->dbh instanceof \mysqli ) || self::$connection_id !== $wpdb->dbh->thread_id ) ) ) {
			throw new \RuntimeException( 'The protected transaction was lost or a query failed.' );
		}
		if ( preg_match( '/^\s*(?:COMMIT|ROLLBACK|BEGIN|START\s+TRANSACTION|ALTER|CREATE|DROP|TRUNCATE|RENAME|LOCK|UNLOCK|SET\s+(?:SESSION\s+)?AUTOCOMMIT)\b/i', $query ) ) {
			throw new \RuntimeException( 'Hooks cannot change the protected transaction boundary.' );
		}
		return $query;
	}
	public static function end( bool $commit ): void {
		global $wpdb;
		if ( $commit ) {
			self::guard_query( '' );
		}
		remove_filter( 'query', array( __CLASS__, 'guard_query' ), PHP_INT_MAX );
		self::$active = false;
		self::$connection_id = null;
		if ( false === $wpdb->query( $commit ? 'COMMIT' : 'ROLLBACK' ) ) {
			throw new \RuntimeException( 'Transaction confirmation failed.' );
		}
		self::clear_cache();
		self::$locked_ids = array();
	}
	public static function track( array $ids ): void { self::$locked_ids = array_unique( array_merge( self::$locked_ids, $ids ) ); }
	public static function clear_cache(): void {
		foreach ( self::$locked_ids as $id ) {
			clean_post_cache( $id );
			wp_cache_delete( $id, 'post_meta' );
		}
	}
}
