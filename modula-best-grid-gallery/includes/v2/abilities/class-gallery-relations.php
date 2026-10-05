<?php
/** Read-only album dependency snapshot, including inactive Pro and classic references. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Gallery_Relations {
	public static function state( int $gallery, bool $lock = false ): array {
		global $wpdb;
		$suffix = $lock ? ' FOR UPDATE' : '';
		// Lock the membership index range as well as existing rows to exclude new references.
		$posts = $wpdb->get_results( "SELECT ID,post_status,post_author FROM {$wpdb->posts} WHERE post_type = 'modula-album' ORDER BY ID" . $suffix, ARRAY_A );
		$result = array();
		foreach ( $posts as $post ) {
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT meta_key,meta_value FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_id" . $suffix, $post['ID'] ), ARRAY_A );
			$meta = array_column( $rows, 'meta_value', 'meta_key' );
			$doc = json_decode( $meta['modula_album_members_v2'] ?? '', true );
			$members = $doc['members'] ?? maybe_unserialize( $meta['modula-album-galleries'] ?? '' );
			foreach ( is_array( $members ) ? $members : array() as $member ) {
				if ( is_array( $member ) && absint( $member['id'] ?? 0 ) === $gallery && in_array( sanitize_text_field( $member['itemType'] ?? '' ), array( '', 'modula-gallery' ), true ) ) {
					$result[] = array( 'id' => (int) $post['ID'], 'beta' => ! empty( $meta['_modula_beta'] ), 'post' => $post, 'meta' => $rows );
					break;
				}
			}
		}
		if ( $wpdb->last_error ) { throw new \RuntimeException( 'Album dependencies unavailable.' ); }
		return $result;
	}
}
