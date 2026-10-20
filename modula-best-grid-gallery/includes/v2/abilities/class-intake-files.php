<?php
/** Bounded validation/staging for explicit byte intake; no remote URLs or server paths. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;
final class Intake_Files {
	public const MAX_BYTES = 8388608;
	private $temporary     = array();
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
	public function stage( string $bytes, string $name ): string {
		$path = wp_tempnam( $name );
		if ( ! $path ) {
			throw new \RuntimeException( 'Temporary storage unavailable.' );
		}
		$this->temporary[] = $path;
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Exact byte count in owned WordPress temp staging, with no filesystem credential negotiation.
		if ( strlen( $bytes ) !== file_put_contents( $path, $bytes ) ) {
			throw new \RuntimeException( 'Temporary write failed.' );
		}
		return $path;
	}
	public function allowed(): array {
		if ( ! class_exists( '\Modula_Gallery_Upload' ) ) {
			require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php';
		}
		return \Modula_Gallery_Upload::get_instance()->define_allowed_mime_types();
	}
	public function image( string $bytes, string $name ): array {
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
		return array(
			'name'     => $name,
			'tmp_name' => $path,
			'type'     => $mime,
			'size'     => strlen( $bytes ),
			'error'    => 0,
		);
	}
	public function decode( array $input ): array {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Public upload contract carries canonical image bytes.
		$bytes = base64_decode( $input['content_base64'], true );
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Round-trip rejects noncanonical encoding before media staging.
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
		return array( $bytes, $name );
	}
	public function prepare( array $input ): array {
		list( $bytes, $name ) = $this->decode( $input );
		return array( $this->image( $bytes, $name ) );
	}
}
