<?php
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Folder import path authorization: resolve uploads paths to attachments and apply caps.
 *
 * @since 3.0.3
 */
class Modula_Folder_Import_Path {

	const ERROR_CODE     = 'modula_cannot_import_file';
	const STAGING_SUBDIR = 'modula_folder_import';

	/**
	 * Default folder import browse root: staging subdirectory under uploads (filter-overridable at the call site).
	 *
	 * @param string $uploads_basedir wp_upload_dir()['basedir'].
	 * @return string
	 */
	public static function default_browse_root( $uploads_basedir ) {
		$uploads_basedir = rtrim( str_replace( '\\', '/', (string) $uploads_basedir ), '/' );
		if ( '' === $uploads_basedir ) {
			return '';
		}
		return $uploads_basedir . '/' . self::STAGING_SUBDIR;
	}

	/**
	 * Whether $real_path is the root or a descendant (not a prefix-sibling).
	 *
	 * @param string $real_path Absolute path.
	 * @param string $root_real Absolute root.
	 * @return bool
	 */
	public static function is_path_under_root( $real_path, $root_real ) {
		$path = rtrim( str_replace( '\\', '/', (string) $real_path ), '/' );
		$root = rtrim( str_replace( '\\', '/', (string) $root_real ), '/' );
		if ( '' === $path || '' === $root ) {
			return false;
		}
		return $path === $root || 0 === strpos( $path, $root . '/' );
	}

	/**
	 * Uploads-relative form of a realpath, or empty when the file is not under basedir.
	 *
	 * @param string $real_path          Absolute file path.
	 * @param string $uploads_base_real  Absolute uploads basedir.
	 * @return string
	 */
	public static function uploads_relative_from_real( $real_path, $uploads_base_real ) {
		if ( ! self::is_path_under_root( $real_path, $uploads_base_real ) ) {
			return '';
		}
		$path = rtrim( str_replace( '\\', '/', (string) $real_path ), '/' );
		$base = rtrim( str_replace( '\\', '/', (string) $uploads_base_real ), '/' );
		if ( $path === $base ) {
			return '';
		}
		return ltrim( substr( $path, strlen( $base ) ), '/' );
	}

	/**
	 * Whether a resolved browse file should appear in listing/check results.
	 *
	 * @param int|string|null $resolved         Attachment ID, null orphan, or 'ambiguous'.
	 * @param callable        $current_user_can Signature: ( string $cap, int $id ): bool.
	 * @return bool
	 */
	public static function is_browse_file_visible( $resolved, $current_user_can ) {
		if ( 'ambiguous' === $resolved ) {
			return false;
		}
		if ( null === $resolved || '' === $resolved ) {
			return true;
		}
		$id = (int) $resolved;
		if ( $id < 1 ) {
			return true;
		}
		return (bool) call_user_func( $current_user_can, 'edit_post', $id );
	}

	/**
	 * Owned uploads-relative paths for an attachment (primary, original_image, intermediate sizes).
	 *
	 * @param string               $attached_file _wp_attached_file relative path.
	 * @param array<string, mixed> $metadata      Attachment metadata from wp_get_attachment_metadata().
	 * @return string[]
	 */
	public static function owned_uploads_relatives( $attached_file, $metadata ) {
		$attached_file = self::normalize_uploads_relative( $attached_file );
		$files         = array();
		if ( '' !== $attached_file ) {
			$files[] = $attached_file;
		}
		$dir = dirname( $attached_file );
		if ( '.' === $dir ) {
			$dir = '';
		}
		if ( ! is_array( $metadata ) ) {
			return $files;
		}
		if ( ! empty( $metadata['file'] ) && is_string( $metadata['file'] ) ) {
			$files[] = self::normalize_uploads_relative( $metadata['file'] );
		}
		if ( ! empty( $metadata['original_image'] ) && is_string( $metadata['original_image'] ) ) {
			$basename = basename( $metadata['original_image'] );
			$files[]  = '' === $dir ? $basename : $dir . '/' . $basename;
		}
		if ( ! empty( $metadata['sizes'] ) && is_array( $metadata['sizes'] ) ) {
			foreach ( $metadata['sizes'] as $size ) {
				if ( empty( $size['file'] ) || ! is_string( $size['file'] ) ) {
					continue;
				}
				$basename = basename( $size['file'] );
				$files[]  = '' === $dir ? $basename : $dir . '/' . $basename;
			}
		}
		$files = array_values( array_unique( array_filter( $files ) ) );
		return $files;
	}

	/**
	 * Match an uploads-relative path to attachment IDs that own it (primary file, original, or size).
	 *
	 * @param string              $uploads_relative Uploads-relative path (e.g. 2024/01/admin-150x150.jpg).
	 * @param array<int, string[]> $owned_files_by_id Map of attachment ID => owned relative paths.
	 * @return int|string|null Attachment ID, 'ambiguous', or null when no owner (orphan).
	 */
	public static function resolve_attachment_id( $uploads_relative, $owned_files_by_id ) {
		$target = self::normalize_uploads_relative( $uploads_relative );
		if ( '' === $target || ! is_array( $owned_files_by_id ) ) {
			return null;
		}
		$matches = array();
		foreach ( $owned_files_by_id as $id => $files ) {
			if ( ! is_array( $files ) ) {
				continue;
			}
			foreach ( $files as $file ) {
				if ( $target === self::normalize_uploads_relative( $file ) ) {
					$matches[] = (int) $id;
					break;
				}
			}
		}
		$matches = array_values( array_unique( $matches ) );
		if ( array() === $matches ) {
			return null;
		}
		if ( 1 === count( $matches ) ) {
			return $matches[0];
		}
		return 'ambiguous';
	}

	/**
	 * @param string $path Relative or mixed-separator path.
	 * @return string
	 */
	public static function normalize_uploads_relative( $path ) {
		$path = str_replace( '\\', '/', (string) $path );
		$path = ltrim( $path, '/' );
		return $path;
	}

	/**
	 * Require edit_post to copy an attachment-mapped path; delete_post when Delete after import is requested.
	 * Orphans (null) are allowed. Ambiguous resolution is refused.
	 *
	 * @param int|string|null $resolved          Attachment ID, null orphan, or 'ambiguous'.
	 * @param bool            $delete_requested  Whether Delete after import was requested.
	 * @param callable        $current_user_can  Signature: ( string $cap, int $id ): bool.
	 * @return true|\WP_Error
	 */
	public static function authorize_import( $resolved, $delete_requested, $current_user_can ) {
		if ( null === $resolved || '' === $resolved ) {
			return true;
		}
		if ( 'ambiguous' === $resolved ) {
			return self::cannot_import_file_error();
		}
		$id = (int) $resolved;
		if ( $id < 1 ) {
			return true;
		}
		if ( ! call_user_func( $current_user_can, 'edit_post', $id ) ) {
			return self::cannot_import_file_error();
		}
		if ( $delete_requested && ! call_user_func( $current_user_can, 'delete_post', $id ) ) {
			return self::cannot_import_file_error();
		}
		return true;
	}

	/**
	 * @return \WP_Error
	 */
	public static function cannot_import_file_error() {
		return new WP_Error(
			self::ERROR_CODE,
			__( 'You cannot import this file.', 'modula-best-grid-gallery' ),
			array( 'status' => 403 )
		);
	}
}
