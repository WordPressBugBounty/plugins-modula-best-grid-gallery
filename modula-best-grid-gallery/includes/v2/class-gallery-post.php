<?php
/**
 * Gallery post lifecycle helpers for the v2 REST editor.
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Post
 */
class Gallery_Post {

	/**
	 * Promote auto-draft galleries to a persistable status and seed default settings before REST writes.
	 *
	 * Defaults to `publish` so the gallery shortcode works on the frontend without a separate Publish step.
	 *
	 * @param int    $post_id        Gallery post ID.
	 * @param string $title_fallback Optional title when the post still has an empty/auto title.
	 * @return int|\WP_Error Post ID on success.
	 */
	public static function ensure_persistable( $post_id, $title_fallback = '' ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return new \WP_Error(
				'modula_invalid_gallery',
				__( 'Invalid gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_Error(
				'rest_cannot_edit',
				__( 'Sorry, you are not allowed to edit this gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Gallery not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		if ( 'auto-draft' === $post->post_status ) {
			$updated = wp_update_post(
				array(
					'ID'          => $post_id,
					'post_status' => self::promoted_status( $post_id ),
					'post_title'  => self::persistable_title( $post_id, $post->post_title, $title_fallback ),
				),
				true
			);

			if ( is_wp_error( $updated ) ) {
				return $updated;
			}
		}

		Meta_Sync::ensure_default_settings( $post_id );

		return $post_id;
	}

	/**
	 * Hooks: a core REST write of a gallery returns its saved-state marker.
	 */
	public static function init() {
		add_filter( 'rest_prepare_modula-gallery', array( __CLASS__, 'add_saved_state_to_rest_write' ), 10, 3 );
	}

	/**
	 * REST payload fragment: current post status + label (for React top bar
	 * sync) and the saved-state marker (for the editor's recovery copy). Every
	 * v2 gallery write response carries it.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array{postStatus: string, postStatusLabel: string, savedState: string|null}
	 */
	public static function rest_response_meta( $post_id ) {
		$post_id = absint( $post_id );
		$status  = $post_id ? get_post_status( $post_id ) : '';
		$status  = is_string( $status ) ? $status : '';
		$obj     = $status ? get_post_status_object( $status ) : null;
		$label   = ( is_object( $obj ) && ! empty( $obj->label ) ) ? $obj->label : $status;

		return array(
			'postStatus'      => $status,
			'postStatusLabel' => $label,
			'savedState'      => self::saved_state_marker( $post_id ),
		);
	}

	/**
	 * The gallery's saved-state marker (see Saved_State_Marker).
	 *
	 * @param int $post_id Gallery post ID.
	 * @return string|null Null for a never-saved gallery.
	 */
	public static function saved_state_marker( $post_id ) {
		return Saved_State_Marker::for_post( $post_id, self::saved_state_meta_keys(), self::saved_state_meta_key_prefixes() );
	}

	/**
	 * The repairs a read of the gallery for its editor runs (the settings
	 * GET): v2 settings rebuilt from the flat ones, defaults for a gallery
	 * with none. The bootstrap GET's repair is part of it.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return void
	 */
	public static function repair_for_editor( $post_id ) {
		Meta_Sync::ensure_default_settings( $post_id );
	}

	/**
	 * The saved-state marker the editor opens with: taken after the repairs
	 * its first reads run, so it matches the stored state the editor shows
	 * and a later reopen does not read as "saved elsewhere" (ADR 0059).
	 *
	 * @param int $post_id Gallery post ID.
	 * @return string|null Null for a never-saved gallery.
	 */
	public static function editor_open_saved_state( $post_id ) {
		self::repair_for_editor( $post_id );
		return self::saved_state_marker( $post_id );
	}

	/**
	 * Meta keys that hold a gallery's settings, items and sort mode, in both
	 * the classic and the v2 forms. Bookkeeping meta (edit lock, repair
	 * revisions, upload errors, the Beta flag) is not the gallery.
	 * Extensions that store gallery state in meta of their own register it
	 * with `modula_gallery_saved_state_meta_keys`.
	 *
	 * @return string[]
	 */
	public static function saved_state_meta_keys() {
		$keys = self::core_saved_state_meta_keys();
		/**
		 * Meta keys whose writes change a gallery's saved-state marker (the
		 * editor's "saved elsewhere" warning, ADR 0059).
		 *
		 * @param string[] $keys Gallery-state meta keys.
		 */
		$filtered = apply_filters( 'modula_gallery_saved_state_meta_keys', $keys );
		return Saved_State_Marker::meta_key_list( $filtered, $keys );
	}

	/**
	 * @return string[] The gallery-state meta keys Lite owns.
	 */
	private static function core_saved_state_meta_keys() {
		return array(
			'modula-settings',
			'modula-images',
			'modulaSorting',
			Meta_Sync::SETTINGS_V2_META_KEY,
			Meta_Sync::IMAGES_V2_META_KEY,
			Meta_Sync::IMAGES_V2_EMBEDDED_META_KEY,
			Meta_Sync::IMAGES_V2_MANIFEST_META_KEY,
			Freeform_Catalog::PLACEMENTS_META_KEY,
		);
	}

	/**
	 * Prefixes of the gallery's chunked item meta keys.
	 *
	 * @return string[]
	 */
	public static function saved_state_meta_key_prefixes() {
		return array( Images\Chunked_Storage::CHUNK_KEY_PREFIX );
	}

	/**
	 * `rest_prepare_modula-gallery`: the editor's title and status save (core
	 * REST) returns the marker like the v2 writes.
	 *
	 * @param \WP_REST_Response $response Response.
	 * @param \WP_Post          $post     Gallery post.
	 * @param \WP_REST_Request  $request  Request.
	 * @return \WP_REST_Response
	 */
	public static function add_saved_state_to_rest_write( $response, $post, $request ) {
		return Saved_State_Marker::add_to_write_response( $response, $post, $request, self::saved_state_meta_keys(), self::saved_state_meta_key_prefixes() );
	}

	/**
	 * Title and status the editor's first save stores for a new gallery: what
	 * `ensure_persistable()` promotes the auto-draft to when no title fallback is
	 * passed. The gallery editor writes them before any content write, so a
	 * gallery saved as Draft is never promoted to Published (ADR 0059). Reads
	 * only; shares the promotion rule's helpers so the two stay in step.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array{title: string, status: string}|null Null unless the gallery is an auto-draft.
	 */
	public static function first_save_post_fields( $post_id ) {
		$post_id = absint( $post_id );
		$post    = $post_id ? get_post( $post_id ) : null;
		if ( ! $post || 'auto-draft' !== $post->post_status ) {
			return null;
		}

		return array(
			'title'  => self::persistable_title( $post_id, $post->post_title ),
			'status' => self::promoted_status( $post_id ),
		);
	}

	/**
	 * Status a new gallery is promoted to from auto-draft. The promotion and
	 * the editor's first save share it.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return string `publish` when the user may publish, otherwise `draft`;
	 *                filterable. A filter result that is not a non-empty string
	 *                reads as `draft`, which is what `wp_update_post()` stores for it.
	 */
	private static function promoted_status( $post_id ) {
		$status = current_user_can( 'publish_post', $post_id ) ? 'publish' : 'draft';

		/**
		 * Status used when promoting a new gallery from auto-draft on the first v2 REST write.
		 *
		 * @param string $status  `publish` or `draft` (and other public statuses if the user can set them).
		 * @param int    $post_id Gallery post ID.
		 */
		$filtered = apply_filters( 'modula_gallery_auto_promote_status', $status, $post_id );

		return is_string( $filtered ) && '' !== $filtered ? $filtered : 'draft';
	}

	/**
	 * Title a new gallery is promoted with.
	 *
	 * @param int    $post_id        Gallery post ID.
	 * @param mixed  $title          Stored title.
	 * @param string $title_fallback Title sent with the write, used for a placeholder title.
	 * @return string The stored title, else the trimmed fallback, else "Gallery #ID".
	 */
	private static function persistable_title( $post_id, $title, $title_fallback = '' ) {
		$title = is_string( $title ) ? $title : '';
		if ( ! self::is_placeholder_gallery_title( $title ) ) {
			return $title;
		}

		$fallback = is_string( $title_fallback ) ? trim( $title_fallback ) : '';
		if ( '' !== $fallback ) {
			return $fallback;
		}

		/* translators: %d: gallery post ID */
		return sprintf( __( 'Gallery #%d', 'modula-best-grid-gallery' ), $post_id );
	}

	/**
	 * @param string $title Post title.
	 */
	private static function is_placeholder_gallery_title( $title ) {
		$title = trim( (string) $title );
		if ( '' === $title ) {
			return true;
		}

		$auto_draft = __( 'Auto Draft', 'default' );
		if ( $auto_draft === $title ) {
			return true;
		}

		return false;
	}

	/**
	 * Slug and the permalink text around it, for the Link field of Quick edit
	 * (listing) and of the editor.
	 *
	 * @param \WP_Post|null $post Gallery or album post.
	 * @return array{slug:string,permalinkPrefix:string,permalinkSuffix:string}
	 */
	public static function permalink_pieces( $post ) {
		$pieces = array(
			'slug'            => '',
			'permalinkPrefix' => '',
			'permalinkSuffix' => '',
		);
		if ( ! ( $post instanceof \WP_Post ) ) {
			return $pieces;
		}

		$pieces['slug'] = (string) $post->post_name;
		if ( (int) $post->ID < 1 ) {
			return $pieces;
		}

		if ( ! function_exists( 'get_sample_permalink' ) ) {
			require_once ABSPATH . 'wp-admin/includes/post.php';
		}

		$sample = get_sample_permalink( (int) $post->ID );
		if ( ! is_array( $sample ) ) {
			return $pieces;
		}
		if ( '' === $pieces['slug'] && isset( $sample[1] ) && is_string( $sample[1] ) ) {
			$pieces['slug'] = $sample[1];
		}

		$template = isset( $sample[0] ) ? (string) $sample[0] : '';

		return array_merge( $pieces, self::split_sample_permalink( $template, $pieces['slug'] ) );
	}

	/**
	 * Splits a sample permalink around the slug.
	 *
	 * With plain permalinks the sample has no slug placeholder. It is the real
	 * URL, which ends in the slug (`?modula-gallery=my-gallery`) or does not
	 * carry it at all (`?post_type=modula-gallery&p=12` for a draft). Using
	 * that URL as the prefix would show the slug twice.
	 *
	 * @param string $template Sample permalink from `get_sample_permalink()`.
	 * @param string $slug     Post slug.
	 * @return array{permalinkPrefix:string,permalinkSuffix:string}
	 */
	private static function split_sample_permalink( $template, $slug ) {
		$parts = preg_split( '/%(?:postname|pagename)%/', $template, 2 );
		if ( is_array( $parts ) && 2 === count( $parts ) ) {
			return array(
				'permalinkPrefix' => $parts[0],
				'permalinkSuffix' => $parts[1],
			);
		}

		$slug_value   = '=' . $slug;
		$ends_in_slug = '' !== $slug && substr( $template, -strlen( $slug_value ) ) === $slug_value;

		return array(
			'permalinkPrefix' => $ends_in_slug ? substr( $template, 0, -strlen( $slug ) ) : '',
			'permalinkSuffix' => '',
		);
	}
}
