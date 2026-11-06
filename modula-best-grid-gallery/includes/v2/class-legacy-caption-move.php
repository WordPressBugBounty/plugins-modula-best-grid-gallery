<?php
/**
 * Beta gallery captions still kept in the Media Library Description.
 *
 * Earlier versions of the gallery editor saved a Beta item's caption to the attachment
 * Description (`post_content`). The caption is now the Media Library Caption
 * (`post_excerpt`); see modula_resolve_gallery_item_caption(). An image is affected
 * while its Caption is empty, its gallery row (`description`) caches a non-empty
 * caption, and its Description still equals that row copy. "Move to Caption" in the
 * gallery editor copies the row copy into Caption and leaves Description alone.
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Detects affected images and moves their captions into the Media Library Caption.
 */
class Legacy_Caption_Move {

	/**
	 * Skip reason: the user cannot edit the attachment.
	 */
	const SKIP_CANNOT_EDIT = 'cannot_edit';

	/**
	 * Skip reason: the attachment write failed.
	 */
	const SKIP_WRITE_FAILED = 'write_failed';

	/**
	 * Affected images among a gallery's rows, read with one attachment prefetch.
	 *
	 * @param array<int, mixed> $rows Gallery rows (modula-images shape: `id`, `description`).
	 * @return array<int, string> Attachment ID => row caption, in row order; the first row wins for a repeated ID.
	 */
	public static function affected_captions( array $rows ) {
		$row_captions = self::row_captions_by_attachment( $rows );
		if ( empty( $row_captions ) ) {
			return array();
		}

		$attachments = self::prefetch_attachment_text( array_keys( $row_captions ) );
		$affected    = array();
		foreach ( $row_captions as $attachment_id => $row_caption ) {
			if ( ! isset( $attachments[ $attachment_id ] ) ) {
				continue;
			}
			$attachment = $attachments[ $attachment_id ];
			if ( self::is_affected( $attachment->post_excerpt, $attachment->post_content, $row_caption ) ) {
				$affected[ $attachment_id ] = $row_caption;
			}
		}

		return $affected;
	}

	/**
	 * Number of affected images among a gallery's rows.
	 *
	 * @param array<int, mixed> $rows Gallery rows.
	 * @return int
	 */
	public static function count_affected( array $rows ) {
		return count( self::affected_captions( $rows ) );
	}

	/**
	 * Whether a gallery can have affected images: only Beta galleries wrote captions to the Description.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return bool
	 */
	public static function applies_to( $gallery_id ) {
		return Beta_Settings::is_beta_gallery( $gallery_id );
	}

	/**
	 * Gallery editor bootstrap metadata: `captionsToMove` for a Beta gallery with affected images.
	 *
	 * Classic galleries carry nothing ({@see applies_to()}).
	 *
	 * @param int               $gallery_id Gallery post ID.
	 * @param array<int, mixed> $rows       The gallery's modula-images rows.
	 * @return array<string, int> `[ 'captionsToMove' => n ]` when n > 0, otherwise empty.
	 */
	public static function editor_metadata( $gallery_id, array $rows ) {
		if ( ! self::applies_to( $gallery_id ) ) {
			return array();
		}
		$count = self::count_affected( $rows );

		return $count > 0 ? array( 'captionsToMove' => $count ) : array();
	}

	/**
	 * Copy each affected image's row caption into its Media Library Caption.
	 *
	 * Detection runs again here, against the current Media Library, so a Caption set
	 * since the editor loaded is never overwritten and a second run moves nothing. The
	 * write goes through the gallery editor's attachment writer, which checks
	 * `edit_post` on the attachment and writes `post_excerpt` only.
	 *
	 * @param array<int, mixed>     $rows   Gallery rows.
	 * @param \Modula_Gallery_Upload $writer Attachment text writer.
	 * @return array{moved: int[], skipped: array<int, array{id: int, reason: string}>}
	 */
	public static function move( array $rows, \Modula_Gallery_Upload $writer ) {
		$outcome = array(
			'moved'   => array(),
			'skipped' => array(),
		);
		foreach ( self::affected_captions( $rows ) as $attachment_id => $row_caption ) {
			$written = $writer->apply_modula_media_fields_to_attachment( $attachment_id, array( 'description' => $row_caption ) );
			if ( is_wp_error( $written ) ) {
				$outcome['skipped'][] = array(
					'id'     => $attachment_id,
					'reason' => self::skip_reason( $written ),
				);
				continue;
			}
			$outcome['moved'][] = $attachment_id;
		}

		return $outcome;
	}

	/**
	 * @param \WP_Error $error Failure from the attachment writer.
	 * @return string One of the SKIP_* reasons.
	 */
	private static function skip_reason( $error ) {
		return 'modula_forbidden' === $error->get_error_code() ? self::SKIP_CANNOT_EDIT : self::SKIP_WRITE_FAILED;
	}

	/**
	 * Whether one image keeps its caption only in the Media Library Description.
	 *
	 * Both texts are compared after the same kses filter the row and the old Description
	 * write applied, so markup the filter normalizes does not hide an affected image.
	 * A row copy the filter empties is not affected: the Caption write would skip it,
	 * so the image would stay counted after every move.
	 *
	 * @param mixed  $media_library_caption     Attachment post_excerpt.
	 * @param mixed  $media_library_description Attachment post_content.
	 * @param string $row_caption               Row `description`.
	 * @return bool
	 */
	public static function is_affected( $media_library_caption, $media_library_description, $row_caption ) {
		$row_caption = wp_kses_post( $row_caption );
		if ( '' !== (string) $media_library_caption || '' === $row_caption ) {
			return false;
		}

		return wp_kses_post( (string) $media_library_description ) === $row_caption;
	}

	/**
	 * Non-empty row captions keyed by attachment ID; embedded items and rows without an ID are skipped.
	 *
	 * @param array<int, mixed> $rows Gallery rows.
	 * @return array<int, string>
	 */
	private static function row_captions_by_attachment( array $rows ) {
		$captions = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) || Images\Adapter::is_embedded_gallery_item( $row ) ) {
				continue;
			}
			$attachment_id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			$row_caption   = isset( $row['description'] ) && is_string( $row['description'] ) ? $row['description'] : '';
			if ( $attachment_id < 1 || '' === $row_caption || isset( $captions[ $attachment_id ] ) ) {
				continue;
			}
			$captions[ $attachment_id ] = $row_caption;
		}

		return $captions;
	}

	/**
	 * Caption and Description of the given attachments, in one query.
	 *
	 * @param int[] $attachment_ids Attachment IDs (non-empty).
	 * @return array<int, object> Attachment ID => row with `post_excerpt`, `post_content`.
	 */
	private static function prefetch_attachment_text( array $attachment_ids ) {
		global $wpdb;

		$placeholders = implode( ',', array_fill( 0, count( $attachment_ids ), '%d' ) );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ID, post_excerpt, post_content
				FROM {$wpdb->posts}
				WHERE post_type = 'attachment' AND ID IN ({$placeholders})",
				$attachment_ids
			),
			OBJECT_K
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$attachments = array();
		foreach ( (array) $results as $id => $row ) {
			$attachments[ absint( $id ) ] = $row;
		}

		return $attachments;
	}
}
