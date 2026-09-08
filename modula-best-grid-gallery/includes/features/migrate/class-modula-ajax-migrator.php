<?php

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Modula_Ajax_Migrator {

	/**
	 * Holds the class object.
	 *
	 * @since 2.3.3
	 *
	 * @var object
	 */
	public static $instance;

	/**
	 * Primary class constructor.
	 *
	 * @since 2.3.3
	 */
	public function __construct() {

		add_action( 'wp_ajax_modula_ajax_import_images', array( $this, 'ajax_import_images' ) );
	}

	/**
	 * Import chunks of images at a time
	 *
	 * @return bool
	 */
	public function ajax_import_images() {

		ini_set( 'max_execution_time', 0 );
		set_time_limit( 0 );

		check_ajax_referer( 'modula-importer', 'nonce' );

		// Exit if no id
		if ( ! isset( $_POST['id'] ) ) {
			return false;
		}

		// Exit if no source
		if ( ! isset( $_POST['source'] ) ) {
			return false;
		}

		$source          = sanitize_text_field( wp_unslash( $_POST['source'] ) );
		$response        = array();
		$chunk           = isset( $_POST['chunk'] ) ? absint( $_POST['chunk'] ) : 0;
		$modula_importer = Modula_Importer::get_instance();

		// wp_core sends JSON {id, shortcode}; other sources send a plain gallery ID.
		if ( 'wp_core' === $source ) {
			$galery_atts = json_decode( stripslashes( $_POST['id'] ), true );
			$pattern     = '/ids\s*=\s*["\']([^"\']+)["\']/';
			preg_match( $pattern, $galery_atts['shortcode'], $gallery_ids );
			$images_ids = isset( $gallery_ids[1] ) ? $gallery_ids[1] : '';
			$gallery_id = absint( $galery_atts['id'] );
			$images     = $modula_importer->prepare_images( $source, $images_ids );
		} else {
			$gallery_id = $_POST['id'];
			$images     = $modula_importer->prepare_images( $source, $gallery_id );
		}

		// Initialize $images variable
		$attachments = array();
		// we slice the images in chunks so that the AJAX will do the rest
		$images = array_slice( $images, $chunk, 5 );

		if ( is_array( $images ) && count( $images ) > 0 ) {

			$response['attachments'] = apply_filters( 'modula_migrate_attachments_' . $source, array(), $images, $gallery_id );

			// If array smaller than 5 we reached the end of the array
			if ( count( $images ) < 5 ) {
				$response['end_of_array'] = 'end_of_array';
			}

		} else {
			// If there are no images in the array we reached the end of it
			$response['end_of_array'] = 'end_of_array';
		}

		echo json_encode( $response );
		wp_die();

	}


	/**
	 * Add image to library
	 *
	 * @param $source_path
	 * @param $source_file
	 * @param $description
	 * @param $alt
	 *
	 * @return mixed
	 *
	 * @since 2.3.3
	 */
	public function add_image_to_library( $source_path, $source_file, $description, $alt ) {

		global $wpdb;

		// Seems like in some scenarios the $sourche_path contains the ABSPATH also
		if ( strpos( $source_path, ABSPATH ) !== false ) {
			$source_file_path = $source_path . '/' . $source_file;
		} else {
			$source_file_path = ABSPATH . $source_path . '/' . $source_file;
		}

		if ( ! file_exists( $source_file_path ) ) {
			return false;
		}

		$source_hash = md5_file( $source_file_path );

		// Filename match is only a pre-filter; content hash decides if it's the same image already in the library.
		$sql = $wpdb->prepare(
			"SELECT ID FROM $wpdb->posts WHERE post_type = 'attachment' AND guid LIKE %s",
			'%/' . str_replace( '-scaled', '', $source_file )
		);

		$candidates = $wpdb->get_results( $sql );

		foreach ( $candidates as $candidate ) {
			$candidate_file_path = get_attached_file( $candidate->ID );

			if ( $candidate_file_path && file_exists( $candidate_file_path ) && md5_file( $candidate_file_path ) === $source_hash ) {
				return array(
					'ID'      => $candidate->ID,
					'title'   => get_the_title( $candidate->ID ),
					'alt'     => get_post_meta( $candidate->ID, '_wp_attachment_image_alt', true ),
					'caption' => ! empty( $description ) ? $description : get_post_field( 'post_content', $candidate->ID ),
				);
			}
		}

		// Get WP upload dir
		$uploadDir = wp_upload_dir();

		// Create destination file paths and URLs
		$destination_file      = wp_unique_filename( $uploadDir['path'], $source_file );
		$destination_file_path = $uploadDir['path'] . '/' . $destination_file;
		$destination_url       = $uploadDir['url'] . '/' . $destination_file;

		// Check file is valid
		$wp_filetype = wp_check_filetype( $source_file, null );
		extract( $wp_filetype );

		if ( ( ! $type || ! $ext ) && ! current_user_can( 'unfiltered_upload' ) ) {
			return false;
		}

		$result = copy( $source_file_path, $destination_file_path );

		if ( ! $result ) {

			return false;
		}

		// Set file permissions
		$stat  = stat( $destination_file_path );
		$perms = $stat['mode'] & 0000666;
		chmod( $destination_file_path, $perms );

		// Apply upload filters
		$return = apply_filters( 'wp_handle_upload', array(
			'file' => $destination_file_path,
			'url'  => $destination_url,
			'type' => $type,
		) );

		// Construct the attachment array
		$attachment = array(
			'post_mime_type' => sanitize_text_field( $type ),
			'guid'           => esc_url_raw( $destination_url ),
			'post_title'     => sanitize_text_field( $alt ),
			'post_name'      => sanitize_text_field( $alt ),
			'post_content'   => wp_filter_post_kses( $description ),
		);

		// Save as attachment
		$attachmentID = wp_insert_attachment( $attachment, $destination_file_path );

		// Update attachment metadata
		if ( ! is_wp_error( $attachmentID ) ) {
			$metadata = wp_generate_attachment_metadata( $attachmentID, $destination_file_path );
			wp_update_attachment_metadata( $attachmentID, $metadata );
		}

		update_post_meta( $attachmentID, '_wp_attachment_image_alt', $alt );
		$attachment               = get_post( $attachmentID );
		$attachment->post_excerpt = $description;
		wp_update_post( $attachment );

		// Return attachment data
		return array(
			'ID'      => $attachmentID,
			'src'     => $destination_url,
			'title'   => $alt,
			'alt'     => $alt,
			'caption' => $description,
		);

	}

	/**
	 * Returns the singleton instance of the class.
	 *
	 * @return object The Modula_Importer object.
	 *
	 * @since 2.3.3
	 */
	public static function get_instance() {

		if ( ! isset( self::$instance ) && ! ( self::$instance instanceof Modula_Ajax_Migrator ) ) {
			self::$instance = new Modula_Ajax_Migrator();
		}

		return self::$instance;
	}
}

$modula_ajax_migrator = Modula_Ajax_Migrator::get_instance();