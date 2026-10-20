<?php
/**
 * The license as the license card gets it, and the card's key actions
 * (ADR 0049). Licensing stays in Compatible Pro (`Licensing`); this class
 * only calls it and projects its stored license for the browser, which never
 * receives the full key.
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * License card seam behind POST /modula-best-grid-gallery/v1/license.
 */
class Modula_License_Card {

	/**
	 * Compatible Pro's licensing class.
	 */
	const LICENSING = 'Modula_Pro\Extensions\Licensing';

	/**
	 * Option where Compatible Pro saves the key activated on this site.
	 */
	const KEY_OPTION = 'modula_pro_license_key';

	/**
	 * Key actions the card sends.
	 */
	const ACTIONS = array( 'activate', 'deactivate', 'check' );

	/**
	 * States the card knows (Licensing::STATE_*); anything else reads as none.
	 */
	const STATES = array( 'active', 'renewal_grace', 'expired', 'none' );

	/**
	 * Compatible Pro's Licensing, or an object with the same methods.
	 *
	 * @var object
	 */
	private $licensing;

	/**
	 * @param object $licensing Compatible Pro's Licensing.
	 */
	public function __construct( $licensing ) {
		$this->licensing = $licensing;
	}

	/**
	 * Whether this site has a license card: only with Compatible Pro.
	 *
	 * @return bool
	 */
	public static function is_available() {
		return modula_is_compatible_pro() && class_exists( self::LICENSING );
	}

	/**
	 * Runs a key action on this site's license.
	 *
	 * @param mixed $action      One of ACTIONS.
	 * @param mixed $license_key Key to activate; ignored by the other actions.
	 * @return array|WP_Error The license (see project()), or why it failed.
	 */
	public static function handle( $action, $license_key ) {
		if ( ! self::is_available() ) {
			return new WP_Error(
				'modula_license_unavailable',
				__( 'Modula Pro is not active.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		return self::for_site()->run( $action, $license_key );
	}

	/**
	 * This site's license state: one of STATES, none without Compatible Pro.
	 * The extensions route uses it to decide which plans offer an upgrade.
	 *
	 * @return string
	 */
	public static function current_state() {
		if ( ! self::is_available() ) {
			return 'none';
		}

		return self::for_site()->license_state()['state'];
	}

	/**
	 * The card over Compatible Pro's Licensing; check is_available() first.
	 *
	 * @return self
	 */
	private static function for_site() {
		return new self( call_user_func( array( self::LICENSING, 'get_instance' ) ) );
	}

	/**
	 * @param mixed $action      One of ACTIONS.
	 * @param mixed $license_key Key to activate; ignored by the other actions.
	 * @return array|WP_Error The license (see project()), or why it failed.
	 */
	public function run( $action, $license_key ) {
		switch ( $action ) {
			case 'activate':
				return $this->activate( $license_key );
			case 'deactivate':
				return $this->deactivate();
			case 'check':
				return $this->check();
			default:
				return new WP_Error(
					'modula_license_unknown_action',
					__( 'Unknown license action.', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
		}
	}

	/**
	 * Activates a key on this site. The license server answers a wrong key,
	 * a key without free sites and an unreachable server alike (Pro gets no
	 * license back), so all of them are "not activated".
	 *
	 * An expired key is activated too: Pro saves it and it enters renewal
	 * grace (or is expired past it), which the projection's state shows.
	 *
	 * @param mixed $license_key Key typed in the card.
	 * @return array|WP_Error
	 */
	private function activate( $license_key ) {
		$license_key = is_string( $license_key ) ? trim( $license_key ) : '';
		if ( '' === $license_key ) {
			return new WP_Error(
				'modula_license_key_missing',
				__( 'Enter your license key.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$answer = $this->licensing->activate_license( $license_key );
		// Pro may accept the answer yet store no license; the site then has none.
		$license = self::is_activated_answer( $answer ) ? $this->project() : null;
		if ( null === $license || 'none' === $license['state'] ) {
			return new WP_Error(
				'modula_license_not_activated',
				__( 'That key doesn’t look right. Check it and try again.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		return $license;
	}

	/**
	 * Deactivates the saved key on this site; the browser never sends it.
	 *
	 * @return array|WP_Error
	 */
	private function deactivate() {
		$saved_key = self::saved_key();
		if ( '' === $saved_key ) {
			return $this->project();
		}

		$this->licensing->deactivate_license( $saved_key );

		// Pro removes the key only when the license server confirmed; until
		// then the site still has its license, whatever Pro returned.
		$license = $this->project();
		if ( 'none' !== $license['state'] ) {
			return new WP_Error(
				'modula_license_not_deactivated',
				__( 'The license could not be deactivated. Try again in a few minutes.', 'modula-best-grid-gallery' ),
				array( 'status' => 502 )
			);
		}

		return $license;
	}

	/**
	 * Asks Pro to check the saved key with the license server (Pro answers
	 * from its cache when it can), then reads the stored license. A failed
	 * check leaves the stored license as it was, so it is still shown.
	 *
	 * @return array
	 */
	private function check() {
		$this->licensing->check_license();

		return $this->project();
	}

	/**
	 * The stored license, projected for the browser.
	 *
	 * With no license only the state is set. The product, term, key and sites
	 * come from the license server's stored answer; the key is cut to its last
	 * four characters (none when it is that short).
	 *
	 * @return array{state:string,product:string,lifetime:bool,expires:int|null,renewal_grace_ends:int|null,key_last_four:string,sites:array{used:int,limit:int|null}}
	 *         `expires` and `renewal_grace_ends` are unix timestamps; a `limit` of null is unlimited sites.
	 */
	private function project() {
		$state   = $this->license_state();
		$license = array(
			'state'              => $state['state'],
			'product'            => '',
			'lifetime'           => false,
			'expires'            => null,
			'renewal_grace_ends' => $state['renewal_grace_ends'],
			'key_last_four'      => '',
			'sites'              => array(
				'used'  => 0,
				'limit' => null,
			),
		);

		$answer = $this->licensing->get_license_data();
		if ( 'none' === $state['state'] || ! is_object( $answer ) ) {
			return $license;
		}

		$lifetime = self::is_lifetime( $answer );

		return array_merge(
			$license,
			array(
				'product'       => self::string_field( $answer, 'product_name' ),
				'lifetime'      => $lifetime,
				'expires'       => $lifetime ? null : self::positive_field( $answer, 'expiration' ),
				'key_last_four' => self::last_four( self::string_field( $answer, 'license_key' ) ),
				'sites'         => array(
					'used'  => (int) self::count_field( $answer, 'activation_count' ),
					// The license server sends 0 (or nothing) for unlimited sites.
					'limit' => self::positive_field( $answer, 'activation_limit' ),
				),
			)
		);
	}

	/**
	 * State and renewal grace end from Pro, limited to the states the card
	 * knows.
	 *
	 * Compatible Pro released before get_license_state() still reaches this
	 * card (Lite and Pro update separately); its own validity check then
	 * decides between active and no license.
	 *
	 * @return array{state:string,renewal_grace_ends:int|null}
	 */
	private function license_state() {
		if ( ! method_exists( $this->licensing, 'get_license_state' ) ) {
			return array(
				'state'              => true === $this->licensing->is_license_valid() ? 'active' : 'none',
				'renewal_grace_ends' => null,
			);
		}

		$state = $this->licensing->get_license_state();
		$name  = is_array( $state ) && isset( $state['state'] ) ? $state['state'] : 'none';
		if ( ! in_array( $name, self::STATES, true ) ) {
			$name = 'none';
		}

		$grace_ends = 'renewal_grace' === $name && is_int( $state['renewal_grace_ends'] ?? null )
			? $state['renewal_grace_ends']
			: null;

		return array(
			'state'              => $name,
			'renewal_grace_ends' => $grace_ends,
		);
	}

	/**
	 * @param mixed $answer What Pro's activate_license() returned.
	 * @return bool Whether the license server took the key: active, or
	 *              expired (saved for renewal grace).
	 */
	private static function is_activated_answer( $answer ) {
		return is_object( $answer )
			&& ! is_wp_error( $answer )
			&& isset( $answer->status )
			&& in_array( $answer->status, array( 'active', 'expired' ), true );
	}

	/**
	 * @return string The key saved on this site, '' for none.
	 */
	private static function saved_key() {
		$saved_key = get_option( self::KEY_OPTION, '' );

		return is_string( $saved_key ) ? trim( $saved_key ) : '';
	}

	/**
	 * @param object $answer Stored license server answer.
	 * @return bool
	 */
	private static function is_lifetime( $answer ) {
		$expiration = $answer->expiration ?? null;
		// The license server sends a boolean; a stored or proxied answer may carry it as 1 or '1'.
		$flag = $answer->is_lifetime ?? false;

		return 'lifetime' === $expiration || in_array( $flag, array( true, 1, '1' ), true );
	}

	/**
	 * @param object $answer Stored license server answer.
	 * @param string $field  Field name.
	 * @return string The field when it is a string, else ''.
	 */
	private static function string_field( $answer, $field ) {
		return isset( $answer->$field ) && is_string( $answer->$field ) ? $answer->$field : '';
	}

	/**
	 * @param object $answer Stored license server answer.
	 * @param string $field  Field name.
	 * @return int|null A whole number above zero, else null.
	 */
	private static function positive_field( $answer, $field ) {
		$count = self::count_field( $answer, $field );

		return $count > 0 ? $count : null;
	}

	/**
	 * @param object $answer Stored license server answer.
	 * @param string $field  Field name.
	 * @return int|null A whole number of zero or more (also from a digit string), else null.
	 */
	private static function count_field( $answer, $field ) {
		$value = $answer->$field ?? null;

		if ( is_int( $value ) ) {
			return $value >= 0 ? $value : null;
		}

		return is_string( $value ) && ctype_digit( $value ) ? (int) $value : null;
	}

	/**
	 * @param string $license_key Full key.
	 * @return string Its last four characters, '' when it has four or fewer.
	 */
	private static function last_four( $license_key ) {
		return strlen( $license_key ) > 4 ? substr( $license_key, -4 ) : '';
	}
}
