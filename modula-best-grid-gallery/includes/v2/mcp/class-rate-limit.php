<?php
/** Fixed-window request limits for the public OAuth endpoints, kept in transients. */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Rate_Limit {
	/**
	 * Counts one request in the bucket's window; false when the window is full.
	 * The counter lives in a transient that expires with its window.
	 *
	 * @param string $bucket Endpoint and caller, such as `register|<ip>`.
	 * @param int    $limit  Requests allowed per window.
	 * @param int    $window Window length in seconds.
	 */
	public static function admit( string $bucket, int $limit, int $window ): bool {
		$key     = 'modula_mcp_rate_' . md5( $bucket );
		$counter = get_transient( $key );
		$counter = is_array( $counter ) ? $counter : array(
			'count'   => 0,
			'expires' => time() + $window,
		);
		if ( $counter['count'] >= $limit ) {
			return false;
		}
		++$counter['count'];
		// A counter that cannot be saved cannot limit anything; refuse rather than fail open.
		return set_transient( $key, $counter, max( 1, $counter['expires'] - time() ) );
	}

	/** The caller's address, as the server saw it; forwarded headers can be forged. */
	public static function client_ip(): string {
		return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	}
}
