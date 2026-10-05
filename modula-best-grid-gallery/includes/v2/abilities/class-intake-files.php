<?php
/** Bounded validation/staging for explicit byte intake; no remote URLs or server paths. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Intake_Files {
	public const MAX_BYTES = 8388608;
	public const MAX_EXPANDED = 33554432;
	public const MAX_ENTRIES = 100;
	private $temporary = array();
	public function __construct() {
		register_shutdown_function( array( $this, 'cleanup' ) );
	}
	public function cleanup(): void {
		foreach ( $this->temporary as $path ) {
			if ( is_file( $path ) ) {
				wp_delete_file( $path );
			}
		}
		$this->temporary = array();
	}
	private function stage( string $bytes, string $name ): string {
		$path = wp_tempnam( $name );
		if ( ! $path ) {
			throw new \RuntimeException( 'Temporary storage unavailable.' );
		}
		$this->temporary[] = $path;
		if ( strlen( $bytes ) !== file_put_contents( $path, $bytes ) ) {
			throw new \RuntimeException( 'Temporary write failed.' );
		}
		return $path;
	}
	private function allowed(): array {
		if ( ! class_exists( '\Modula_Gallery_Upload' ) ) {
			require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php';
		}
		return \Modula_Gallery_Upload::get_instance()->define_allowed_mime_types();
	}
	private function image( string $bytes, string $name ): array {
		if ( '' === $bytes || strlen( $bytes ) > min( self::MAX_BYTES, wp_max_upload_size() ) ) {
			throw new \InvalidArgumentException( 'file_size_limit' );
		}
		$path = $this->stage( $bytes, $name );
		$type = wp_check_filetype_and_ext( $path, $name, $this->allowed() );
		$mime = wp_get_image_mime( $path );
		if ( ! $mime || empty( $type['ext'] ) || empty( $type['type'] ) || $mime !== $type['type'] || 0 !== strpos( $mime, 'image/' ) ) {
			throw new \InvalidArgumentException( 'invalid_image' );
		}
		// Bound decode work as well as compressed bytes. Dimensions are checked before metadata generation.
		$dimensions = wp_getimagesize( $path );
		if ( ! $dimensions || $dimensions[0] * $dimensions[1] > 40000000 ) {
			throw new \InvalidArgumentException( 'image_dimensions_limit' );
		}
		return array( 'name' => $name, 'tmp_name' => $path, 'type' => $mime, 'size' => strlen( $bytes ), 'error' => 0 );
	}
	/** Copy bounded server bytes into owned staging; never move the original source. */
	public function prepare_server( string $path, string $name ): array {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		$bytes = file_get_contents( $path, false, null, 0, self::MAX_BYTES + 1 );
		if ( false === $bytes ) { throw new \InvalidArgumentException( 'source_unreadable' ); }
		return $this->image( $bytes, $name );
	}
	public function prepare( array $input, bool $archive ): array {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		$bytes = base64_decode( $input['content_base64'], true );
		if ( false === $bytes || '' === $bytes || base64_encode( $bytes ) !== $input['content_base64'] ) {
			throw new \InvalidArgumentException( 'invalid_base64' );
		}
		if ( strlen( $bytes ) > min( self::MAX_BYTES, wp_max_upload_size() ) ) {
			throw new \InvalidArgumentException( 'file_size_limit' );
		}
		$name = sanitize_file_name( $input['filename'] );
		if ( '' === $name || $name !== $input['filename'] || false !== strpos( $name, '/' ) || false !== strpos( $name, '\\' ) ) {
			throw new \InvalidArgumentException( 'invalid_filename' );
		}
		if ( ! $archive ) {
			return array( $this->image( $bytes, $name ) );
		}
		if ( 'zip' !== strtolower( pathinfo( $name, PATHINFO_EXTENSION ) ) || ! class_exists( '\ZipArchive' ) ) {
			throw new \InvalidArgumentException( 'zip_unavailable' );
		}
		$path = $this->stage( $bytes, $name );
		unset( $bytes );
		$zip = new \ZipArchive();
		if ( true !== $zip->open( $path, \ZipArchive::CHECKCONS ) ) {
			throw new \InvalidArgumentException( 'invalid_archive' );
		}
		try {
			if ( $zip->numFiles < 1 || $zip->numFiles > self::MAX_ENTRIES ) {
				throw new \InvalidArgumentException( 'archive_entries_limit' );
			}
			$total = 0;
			$entries = array();
			$seen = array();
			for ( $i = 0; $i < $zip->numFiles; ++$i ) {
				$stat = $zip->statIndex( $i );
				if ( ! $stat ) {
					throw new \InvalidArgumentException( 'invalid_archive' );
				}
				$entry = str_replace( '\\', '/', $stat['name'] );
				if ( preg_match( '~(^/|^[a-zA-Z]:|(^|/)\.\.(/|$)|\x00)~', $entry ) ) {
					throw new \InvalidArgumentException( 'unsafe_archive_path' );
				}
				$opsys = 0;
				$attributes = 0;
				if ( $zip->getExternalAttributesIndex( $i, $opsys, $attributes ) && 0120000 === ( ( $attributes >> 16 ) & 0170000 ) ) {
					throw new \InvalidArgumentException( 'archive_symlink' );
				}
				if ( ! empty( $stat['encryption_method'] ) ) {
					throw new \InvalidArgumentException( 'encrypted_archive' );
				}
				if ( '/' === substr( $entry, -1 ) || 0 === strpos( $entry, '__MACOSX/' ) || 0 === strpos( basename( $entry ), '._' ) ) {
					continue;
				}
				$total += $stat['size'];
				if ( $stat['size'] > self::MAX_BYTES || $total > self::MAX_EXPANDED || $stat['size'] > max( 1, $stat['comp_size'] ) * 100 ) {
					throw new \InvalidArgumentException( 'archive_size_limit' );
				}
				$filename = sanitize_file_name( basename( $entry ) );
				if ( '' === $filename || isset( $seen[ $filename ] ) || empty( wp_check_filetype( $filename, $this->allowed() )['type'] ) ) {
					throw new \InvalidArgumentException( 'invalid_archive_entry' );
				}
				$seen[ $filename ] = true;
				$entries[] = array( $i, $filename, $stat['size'] );
			}
			if ( ! $entries ) {
				throw new \InvalidArgumentException( 'empty_archive' );
			}
			$files = array();
			foreach ( $entries as $entry ) {
				$bytes = $zip->getFromIndex( $entry[0], self::MAX_BYTES + 1 );
				if ( false === $bytes || strlen( $bytes ) !== $entry[2] ) {
					throw new \InvalidArgumentException( 'archive_read_failed' );
				}
				$files[] = $this->image( $bytes, $entry[1] );
			}
			if ( is_multisite() && ! is_upload_space_available() || is_multisite() && $total > get_upload_space_available() ) {
				throw new \InvalidArgumentException( 'upload_quota_exceeded' );
			}
			return $files;
		} finally {
			$zip->close();
		}
	}
}
