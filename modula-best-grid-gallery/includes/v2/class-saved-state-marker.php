<?php
/**
 * Saved-state marker: a fingerprint of a document's stored state, for the
 * editor's recovery copy (ADR 0059). The copy keeps the marker of the state it
 * was based on; when the editor opens with a different marker, the document
 * was saved elsewhere since, and the Restore / Discard notice says so.
 *
 * The marker is computed from what is stored (title, status and the
 * document's own meta keys), not written by the save paths, so every path
 * changes it: an editor save of any part, the abilities and MCP, listing
 * Quick edit, the classic editor, and any other writer of those keys. A write
 * that stores the same values leaves it as it was, which is what the notice
 * needs to know. Nothing is stored and no request contract changes.
 *
 * Document-agnostic: the gallery passes its keys (Gallery_Post); the Albums
 * editor passes the album's.
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Class Saved_State_Marker
 */
class Saved_State_Marker {

	/**
	 * A document's meta keys after its `…_saved_state_meta_keys` filter: the
	 * non-empty strings of the filtered list, each once; the document's own
	 * keys when the filter returns no list.
	 *
	 * @param mixed    $filtered What the filter returned.
	 * @param string[] $own      The document's own keys (the filter's input).
	 * @return string[]
	 */
	public static function meta_key_list( $filtered, array $own ) {
		if ( ! is_array( $filtered ) ) {
			return $own;
		}
		$keys = array_filter(
			$filtered,
			static function ( $key ) {
				return is_string( $key ) && '' !== $key;
			}
		);
		return array_values( array_unique( $keys ) );
	}

	/**
	 * The marker of a post's stored state.
	 *
	 * @param int      $post_id           Post ID.
	 * @param string[] $meta_keys         Meta keys that hold the document.
	 * @param string[] $meta_key_prefixes Prefixes of meta keys that hold the document (keys written in chunks).
	 * @return string|null Null for a missing post or an auto-draft (never saved).
	 */
	public static function for_post( $post_id, array $meta_keys, array $meta_key_prefixes = array() ) {
		$post = get_post( absint( $post_id ) );
		if ( ! $post || 'auto-draft' === $post->post_status ) {
			return null;
		}

		$stored_meta = get_post_meta( $post->ID );
		$stored_meta = is_array( $stored_meta ) ? $stored_meta : array();
		$document    = array();
		foreach ( $stored_meta as $key => $values ) {
			if ( self::is_document_key( (string) $key, $meta_keys, $meta_key_prefixes ) ) {
				$document[ $key ] = $values;
			}
		}
		ksort( $document );

		return md5(
			maybe_serialize(
				array(
					'title'  => (string) $post->post_title,
					'status' => (string) $post->post_status,
					'meta'   => $document,
				)
			)
		);
	}

	/**
	 * Who and where a recovery copy belongs to, for its browser storage key:
	 * sites sharing an origin, and users sharing a browser profile, keep
	 * separate copies.
	 *
	 * @return array{site: string, user: int}
	 */
	public static function recovery_identity() {
		return array(
			'site' => home_url( '/' ),
			'user' => get_current_user_id(),
		);
	}

	/**
	 * `rest_prepare_{post_type}` helper: a core REST write of the document
	 * (the editor's title and status save) returns the marker as `savedState`,
	 * as the v2 write routes do. Reads are left as they were.
	 *
	 * @param \WP_REST_Response $response          Response.
	 * @param \WP_Post          $post              Post.
	 * @param \WP_REST_Request  $request           Request.
	 * @param string[]          $meta_keys         Meta keys that hold the document.
	 * @param string[]          $meta_key_prefixes Prefixes of meta keys that hold the document.
	 * @return \WP_REST_Response
	 */
	public static function add_to_write_response( $response, $post, $request, array $meta_keys, array $meta_key_prefixes = array() ) {
		if ( 'GET' === strtoupper( (string) $request->get_method() ) ) {
			return $response;
		}
		$data = $response->get_data();
		if ( ! is_array( $data ) ) {
			return $response;
		}
		$data['savedState'] = self::for_post( $post->ID, $meta_keys, $meta_key_prefixes );
		$response->set_data( $data );
		return $response;
	}

	/**
	 * @param string   $key               Meta key.
	 * @param string[] $meta_keys         Exact keys.
	 * @param string[] $meta_key_prefixes Key prefixes.
	 * @return bool Whether the key holds part of the document.
	 */
	private static function is_document_key( $key, array $meta_keys, array $meta_key_prefixes ) {
		if ( in_array( $key, $meta_keys, true ) ) {
			return true;
		}
		foreach ( $meta_key_prefixes as $prefix ) {
			if ( '' !== $prefix && 0 === strpos( $key, $prefix ) ) {
				return true;
			}
		}
		return false;
	}
}
