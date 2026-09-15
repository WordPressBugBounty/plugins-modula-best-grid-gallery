<?php
/**
 * Modula Debug Log service.
 *
 * Support-facing JSON Lines failure log enabled from Diagnostics.
 *
 * @package Modula
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Modula_Debug_Log
 */
class Modula_Debug_Log {

	/**
	 * Option key for enable/expiry state.
	 */
	const OPTION_KEY = 'modula_debug_log';

	/**
	 * Relative directory under uploads basedir.
	 */
	const DIR_NAME = 'modula/debug';

	/**
	 * Log filename.
	 */
	const FILE_NAME = 'modula-debug.jsonl';

	/**
	 * Max log size in bytes (~2 MB).
	 */
	const MAX_BYTES = 2097152;

	/**
	 * Enable window in days.
	 */
	const TTL_DAYS = 7;

	/**
	 * Failure channel: general-settings REST.
	 */
	const CHANNEL_SETTINGS_REST = 'settings.rest';

	/**
	 * Failure channel: gallery settings / items persist.
	 */
	const CHANNEL_GALLERY_PERSIST = 'gallery.persist';

	/**
	 * Failure channel: shortcode / visitor bootstrap.
	 */
	const CHANNEL_SHORTCODE_BOOTSTRAP = 'shortcode.bootstrap';

	/**
	 * Failure channel: album settings / members persist (Pro).
	 */
	const CHANNEL_ALBUM_PERSIST = 'album.persist';

	/**
	 * Context keys that must never be stored.
	 *
	 * @var string[]
	 */
	const FORBIDDEN_CONTEXT_KEYS = array(
		'body',
		'request_body',
		'password',
		'pass',
		'token',
		'access_token',
		'refresh_token',
		'authorization',
		'auth',
		'nonce',
		'cookie',
		'cookies',
	);

	/**
	 * Singleton.
	 *
	 * @var Modula_Debug_Log|null
	 */
	private static $instance = null;

	/**
	 * @return Modula_Debug_Log
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Reset singleton (CLI tests only).
	 *
	 * @return void
	 */
	public static function reset_instance_for_tests() {
		self::$instance = null;
	}

	/**
	 * Thin failure write for call sites (no-op when inactive).
	 *
	 * @param string               $channel Channel id.
	 * @param string               $message Message.
	 * @param array<string, mixed> $context Optional context.
	 * @return void
	 */
	public static function log_failure( $channel, $message, $context = array() ) {
		self::get_instance()->write( 'error', $channel, $message, $context );
	}

	/**
	 * Whether logging currently accepts writes.
	 *
	 * @return bool
	 */
	public function is_active() {
		$state = $this->get_state();
		if ( empty( $state['enabled'] ) ) {
			return false;
		}
		$expires = isset( $state['expires_at'] ) ? (int) $state['expires_at'] : 0;
		if ( $expires > 0 && $this->now() >= $expires ) {
			return false;
		}
		return true;
	}

	/**
	 * Enable logging for TTL_DAYS from now.
	 *
	 * @return void
	 */
	public function enable() {
		$now = $this->now();
		$this->save_state(
			array(
				'enabled'    => true,
				'expires_at' => $now + ( self::TTL_DAYS * DAY_IN_SECONDS ),
			)
		);
		$this->ensure_storage();
	}

	/**
	 * Disable logging; keep existing file.
	 *
	 * @return void
	 */
	public function disable() {
		$state               = $this->get_state();
		$state['enabled']    = false;
		$state['expires_at'] = isset( $state['expires_at'] ) ? (int) $state['expires_at'] : 0;
		$this->save_state( $state );
	}

	/**
	 * Append one debug log entry when active.
	 *
	 * @param string               $level   Level (e.g. error).
	 * @param string               $channel Channel id.
	 * @param string               $message Message.
	 * @param array<string, mixed> $context Optional context.
	 * @return void
	 */
	public function write( $level, $channel, $message, $context = array() ) {
		if ( ! $this->is_active() ) {
			return;
		}

		try {
			$path = $this->ensure_storage();
			if ( '' === $path ) {
				return;
			}

			$entry = array(
				'ts'      => gmdate( 'c', $this->now() ),
				'level'   => sanitize_key( (string) $level ),
				'channel' => $this->sanitize_channel( $channel ),
				'message' => $this->sanitize_message( $message ),
			);

			$clean = $this->sanitize_context( $context );
			if ( ! empty( $clean ) ) {
				$entry['context'] = $clean;
			}

			$line = wp_json_encode( $entry );
			if ( ! is_string( $line ) || '' === $line ) {
				return;
			}
			$line .= "\n";

			$this->append_line( $path, $line );
		} catch ( Throwable $e ) {
			unset( $e );
			// Quiet: never break the originating request.
		}
	}

	/**
	 * Status for Diagnostics.
	 *
	 * @return array{active:bool,enabled:bool,expires_at:int,size:int,has_file:bool}
	 */
	public function get_status() {
		$state   = $this->get_state();
		$path    = $this->get_log_path();
		$has     = ( '' !== $path && is_file( $path ) );
		$size    = $has ? (int) filesize( $path ) : 0;
		$expires = isset( $state['expires_at'] ) ? (int) $state['expires_at'] : 0;

		return array(
			'active'     => $this->is_active(),
			'enabled'    => ! empty( $state['enabled'] ),
			'expires_at' => $expires,
			'size'       => $size,
			'has_file'   => $has && $size > 0,
		);
	}

	/**
	 * Download payload for authenticated admin transport.
	 *
	 * @return array{body:string,filename:string,filesize:int}|null
	 */
	public function get_download_payload() {
		$path = $this->get_log_path();
		if ( '' === $path || ! is_file( $path ) ) {
			return null;
		}
		$body = file_get_contents( $path );
		if ( false === $body ) {
			return null;
		}
		return array(
			'body'     => $body,
			'filename' => self::FILE_NAME,
			'filesize' => strlen( $body ),
		);
	}

	/**
	 * Clear the log file without re-enabling.
	 *
	 * @return void
	 */
	public function clear() {
		$path = $this->get_log_path();
		if ( '' === $path || ! is_file( $path ) ) {
			return;
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink -- CLI-safe clear.
		@unlink( $path );
	}

	/**
	 * @return array{enabled:bool,expires_at:int}
	 */
	private function get_state() {
		$raw = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $raw ) ) {
			$raw = array();
		}
		return array(
			'enabled'    => ! empty( $raw['enabled'] ),
			'expires_at' => isset( $raw['expires_at'] ) ? (int) $raw['expires_at'] : 0,
		);
	}

	/**
	 * @param array{enabled?:bool,expires_at?:int} $state State.
	 * @return void
	 */
	private function save_state( $state ) {
		update_option(
			self::OPTION_KEY,
			array(
				'enabled'    => ! empty( $state['enabled'] ),
				'expires_at' => isset( $state['expires_at'] ) ? (int) $state['expires_at'] : 0,
			),
			false
		);
	}

	/**
	 * Absolute path to the JSONL file, or empty on failure.
	 *
	 * @return string
	 */
	private function get_log_path() {
		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
			return '';
		}
		return trailingslashit( $uploads['basedir'] ) . self::DIR_NAME . '/' . self::FILE_NAME;
	}

	/**
	 * Directory for the log file.
	 *
	 * @return string
	 */
	private function get_dir_path() {
		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
			return '';
		}
		return trailingslashit( $uploads['basedir'] ) . self::DIR_NAME;
	}

	/**
	 * Ensure directory + protection files exist; return log file path.
	 *
	 * @return string
	 */
	private function ensure_storage() {
		$dir = $this->get_dir_path();
		if ( '' === $dir ) {
			return '';
		}
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return '';
		}
		$this->write_protection_files( $dir );
		return $this->get_log_path();
	}

	/**
	 * @param string $dir Directory.
	 * @return void
	 */
	private function write_protection_files( $dir ) {
		$index = trailingslashit( $dir ) . 'index.php';
		if ( ! is_file( $index ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			@file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}
		$htaccess = trailingslashit( $dir ) . '.htaccess';
		if ( ! is_file( $htaccess ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			@file_put_contents( $htaccess, "Deny from all\n" );
		}
	}

	/**
	 * @param mixed $channel Channel.
	 * @return string
	 */
	private function sanitize_channel( $channel ) {
		$channel = sanitize_text_field( (string) $channel );
		if ( strlen( $channel ) > 100 ) {
			$channel = substr( $channel, 0, 100 );
		}
		return $channel;
	}

	/**
	 * @param mixed $message Message.
	 * @return string
	 */
	private function sanitize_message( $message ) {
		$message = sanitize_text_field( (string) $message );
		if ( strlen( $message ) > 1000 ) {
			$message = substr( $message, 0, 1000 );
		}
		return $message;
	}

	/**
	 * @param string $key Normalized context key.
	 * @return bool
	 */
	private function is_forbidden_context_key( $key ) {
		if ( in_array( $key, self::FORBIDDEN_CONTEXT_KEYS, true ) ) {
			return true;
		}
		foreach ( array( 'password', 'passwd', 'token', 'secret', 'authorization', 'cookie' ) as $needle ) {
			if ( false !== strpos( $key, $needle ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Heuristic: drop values that look like embedded secrets.
	 *
	 * @param string $value Value.
	 * @return bool
	 */
	private function string_looks_like_secret( $value ) {
		if ( preg_match( '/(password|passwd|secret|access_token|refresh_token)\s*[:=]/i', $value ) ) {
			return true;
		}
		if ( preg_match( '/^Bearer\s+\S+/i', $value ) ) {
			return true;
		}
		return false;
	}

	/**
	 * @param array<string, mixed> $context Context.
	 * @return array<string, mixed>
	 */
	private function sanitize_context( $context ) {
		if ( ! is_array( $context ) ) {
			return array();
		}
		$out = array();
		foreach ( $context as $key => $value ) {
			$normalized_key = is_string( $key ) ? strtolower( $key ) : (string) $key;
			if ( $this->is_forbidden_context_key( $normalized_key ) ) {
				continue;
			}
			if ( is_array( $value ) || is_object( $value ) ) {
				continue;
			}
			if ( is_string( $value ) ) {
				if ( $this->string_looks_like_secret( $value ) ) {
					continue;
				}
				if ( strlen( $value ) > 500 ) {
					$value = substr( $value, 0, 500 );
				}
			}
			$out[ $normalized_key ] = $value;
		}
		return $out;
	}

	/**
	 * @param string $path Path.
	 * @param string $line Line including newline.
	 * @return void
	 */
	private function append_line( $path, $line ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		$result = @file_put_contents( $path, $line, FILE_APPEND | LOCK_EX );
		if ( false === $result ) {
			return;
		}
		$this->maybe_truncate( $path );
	}

	/**
	 * Keep newest bytes under MAX_BYTES.
	 *
	 * @param string $path Path.
	 * @return void
	 */
	private function maybe_truncate( $path ) {
		$size = @filesize( $path );
		if ( false === $size || $size <= self::MAX_BYTES ) {
			return;
		}
		$contents = @file_get_contents( $path );
		if ( false === $contents || '' === $contents ) {
			return;
		}
		$keep = substr( $contents, -1 * self::MAX_BYTES );
		$nl   = strpos( $keep, "\n" );
		if ( false !== $nl && $nl < strlen( $keep ) - 1 ) {
			$keep = substr( $keep, $nl + 1 );
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		@file_put_contents( $path, $keep, LOCK_EX );
	}

	/**
	 * @return int
	 */
	private function now() {
		return (int) apply_filters( 'modula_debug_log_now', time() );
	}
}
