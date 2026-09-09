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
			$title = is_string( $post->post_title ) ? $post->post_title : '';
			if ( self::is_placeholder_gallery_title( $title ) ) {
				$title = is_string( $title_fallback ) ? trim( $title_fallback ) : '';
				if ( '' === $title ) {
					/* translators: %d: gallery post ID */
					$title = sprintf( __( 'Gallery #%d', 'modula-best-grid-gallery' ), $post_id );
				}
			}

			$target_status = 'publish';
			if ( ! current_user_can( 'publish_post', $post_id ) ) {
				$target_status = 'draft';
			}

			/**
			 * Status used when promoting a new gallery from auto-draft on the first v2 REST write.
			 *
			 * @param string $target_status `publish` or `draft` (and other public statuses if the user can set them).
			 * @param int    $post_id       Gallery post ID.
			 */
			$target_status = apply_filters( 'modula_gallery_auto_promote_status', $target_status, $post_id );

			$updated = wp_update_post(
				array(
					'ID'          => $post_id,
					'post_status' => $target_status,
					'post_title'  => $title,
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
	 * REST payload fragment: current post status + label (for React top bar sync).
	 *
	 * @param int $post_id Gallery post ID.
	 * @return array{postStatus: string, postStatusLabel: string}
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
		);
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
}
