<?php
namespace Modula\Ai\Helpers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Image_Helper {
	/**
	 * Update media library images in batch from gallery image data
	 *
	 * @param array $images Array of gallery images
	 * @return void
	 */
	public static function batch_update_images( $images ) {
		global $wpdb;

		if ( empty( $images ) ) {
			return;
		}

		$post_updates = array();
		$meta_updates = array();

		foreach ( $images as $image ) {
			if ( ! isset( $image['id'] ) ) {
				continue;
			}

			$attachment_id = absint( $image['id'] );
			if ( ! $attachment_id ) {
				continue;
			}

			$attachment = get_post( $attachment_id );
			if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
				continue;
			}

			$title_incoming = array_key_exists( 'title', $image ) ? $image['title'] : null;
			$desc_incoming  = array_key_exists( 'description', $image ) ? $image['description'] : null;

			$title_write = null;
			if ( null !== $title_incoming ) {
				$title_write = modula_resolve_attachment_text_write(
					(string) $title_incoming,
					(string) $attachment->post_title
				);
			}

			$excerpt_write  = null;
			$content_write  = null;
			if ( null !== $desc_incoming ) {
				$excerpt_write = modula_resolve_attachment_text_write(
					(string) $desc_incoming,
					(string) $attachment->post_excerpt
				);
				$content_write = modula_resolve_attachment_text_write(
					(string) $desc_incoming,
					(string) $attachment->post_content
				);
			}

			$resolved_title   = null !== $title_write ? $title_write : $attachment->post_title;
			$resolved_excerpt = null !== $excerpt_write ? $excerpt_write : $attachment->post_excerpt;
			$resolved_content = null !== $content_write ? $content_write : $attachment->post_content;

			$needs_post_update = ( null !== $title_write && $title_write !== $attachment->post_title )
				|| ( null !== $excerpt_write && $excerpt_write !== $attachment->post_excerpt )
				|| ( null !== $content_write && $content_write !== $attachment->post_content );

			if ( $needs_post_update ) {
				$post_updates[] = $wpdb->prepare(
					'(%d, %s, %s, %s)',
					$attachment_id,
					$resolved_title,
					$resolved_excerpt,
					$resolved_content
				);
			}

			if ( isset( $image['alt'] ) ) {
				$alt = sanitize_text_field( wp_unslash( $image['alt'] ) );
				if ( is_serialized( $alt ) ) {
					$alt = '';
				}
				$existing_alt = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
				$alt_write    = modula_resolve_attachment_text_write(
					$alt,
					is_string( $existing_alt ) ? $existing_alt : ''
				);
				if ( null !== $alt_write ) {
					// First delete any existing meta for this key to prevent duplicates
					$meta_updates[] = $wpdb->prepare(
						"DELETE FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_wp_attachment_image_alt'",
						$attachment_id
					);
					// Then add the new meta value
					$meta_updates[] = $wpdb->prepare(
						"INSERT INTO {$wpdb->postmeta} (post_id, meta_key, meta_value) VALUES (%d, '_wp_attachment_image_alt', %s)",
						$attachment_id,
						$alt_write
					);
				}
			}
		}

		if ( ! empty( $post_updates ) ) {
			$query = "INSERT INTO {$wpdb->posts} (ID, post_title, post_excerpt, post_content) VALUES " .
					implode( ',', $post_updates ) .
					' ON DUPLICATE KEY UPDATE post_title = VALUES(post_title), 
					post_excerpt = VALUES(post_excerpt), 
					post_content = VALUES(post_content)';
			//phpcs:ignore WordPress.DB
			$wpdb->query( $query );
		}

		if ( ! empty( $meta_updates ) ) {
			// Execute each meta update query separately since we're doing DELETE + INSERT
			foreach ( $meta_updates as $query ) {
				//phpcs:ignore WordPress.DB
				$wpdb->query( $query );
			}
		}

		// Clean post cache for all updated images
		foreach ( $images as $image ) {
			if ( isset( $image['id'] ) ) {
				clean_post_cache( $image['id'] );
			}
		}
	}
}
