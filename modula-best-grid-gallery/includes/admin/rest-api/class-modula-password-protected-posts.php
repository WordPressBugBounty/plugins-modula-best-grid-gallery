<?php
/**
 * Galleries and albums that have a password.
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Counts the posts whose password Password Protect's deactivation clears, so
 * the Extensions page can say how many lose it before the admin confirms.
 */
class Modula_Password_Protected_Posts {

	/**
	 * Post types Password Protect covers. Compatible Pro's deactivation hook
	 * (`modula_extension_modula-password-protect_deactivated`) clears the
	 * password of every post of these types, whatever its status.
	 */
	const POST_TYPES = array( 'modula-gallery', 'modula-album' );

	/**
	 * Number of galleries and albums with a password, in any status.
	 *
	 * @return int|WP_Error Count, or an error when the query failed.
	 */
	public static function count() {
		global $wpdb;

		// One aggregate over several post types: WP_Query has no counting form for it.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- the count must be current before a destructive confirm.
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type IN ( " . implode( ', ', array_fill( 0, count( self::POST_TYPES ), '%s' ) ) . " ) AND post_password != ''",
				self::POST_TYPES
			)
		);

		if ( null === $count ) {
			return new WP_Error(
				'modula_password_protected_count_failed',
				__( 'The password-protected galleries and albums could not be counted.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		return (int) $count;
	}
}
