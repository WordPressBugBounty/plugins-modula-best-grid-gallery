<?php
/** One WordPress sideload with durable identity capture, shared by free and premium intake. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Intake_Attachment {
	/** @return int|\WP_Error */
	public static function import( array $file, string $request, array &$progress, int $index ) {
		// Record the identity before metadata generation/hooks can fail or the response can be lost.
		$capture      = static function ( $id ) use ( &$progress, $index, $request ) {
			$progress['attachment_ids'][]                   = (int) $id;
			$progress['objects'][ $index ]['attachment_id'] = (int) $id;
			Requests::context( $request, array( 'intake' => $progress ) );
		};
		$moved_file   = '';
		$capture_file = static function ( $uploaded, $context ) use ( &$moved_file, &$progress, $index, $request ) {
			if ( 'sideload' === $context && ! empty( $uploaded['file'] ) ) {
				$moved_file = $uploaded['file'];
				// Retain only the actual unique filename, never an absolute path or provider URL.
				$progress['objects'][ $index ]['filename'] = wp_basename( $moved_file );
				Requests::context( $request, array( 'intake' => $progress ) );
			}
			return $uploaded;
		};
		add_filter( 'wp_handle_upload', $capture_file, PHP_INT_MAX, 2 );
		add_action( 'add_attachment', $capture, -999 );
		$id = null;
		try {
			$id = media_handle_sideload( $file, 0 );
		} finally {
			remove_action( 'add_attachment', $capture, -999 );
			remove_filter( 'wp_handle_upload', $capture_file, PHP_INT_MAX );
			// An exception before add_attachment may still follow a successful row insert.
			// Preserve its bytes and record the filename; only an explicit WP_Error permits cleanup.
			if ( null === $id && $moved_file && ! $progress['objects'][ $index ]['attachment_id'] ) {
				$progress['objects'][ $index ]['status'] = 'uncertain';
				$progress['objects'][ $index ]['code']   = 'retained_file';
				Requests::context( $request, array( 'intake' => $progress ) );
			}
			// WordPress can move bytes and then fail before inserting the attachment.
			if ( is_wp_error( $id ) && $moved_file && ! $progress['objects'][ $index ]['attachment_id'] && is_file( $moved_file ) ) {
				wp_delete_file( $moved_file );
				$retained                                = is_file( $moved_file );
				$progress['objects'][ $index ]['status'] = $retained ? 'uncertain' : 'rejected';
				$progress['objects'][ $index ]['code']   = $retained ? 'retained_file' : 'unattached_file_removed';
				Requests::context( $request, array( 'intake' => $progress ) );
				if ( $retained ) {
					throw new \RuntimeException( 'Unattached file cleanup unconfirmed.' );
				}
			}
		}
		return $id;
	}
}
