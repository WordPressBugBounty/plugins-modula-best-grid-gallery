<?php
/**
 * Each extension's state on this site, as Compatible Pro reports it: whether
 * the license makes it available, whether the admin turned it on, and where
 * its settings are. Names, descriptions, plans and order are the catalog's
 * (Modula_Extension_Catalog, ADR 0048).
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Extension state seam.
 */
class Modula_Extension_States {

	/**
	 * Filter through which Compatible Pro reports the state of its extensions.
	 *
	 * Callbacks return slug => array( 'available' => bool, 'active' => bool,
	 * 'settings' => URL string or null ). Until Pro hooks it (the filter
	 * still returns null), the state is read from Pro's extensions list.
	 */
	const FILTER = 'modula_extension_states';

	/**
	 * The state of an extension the site does not have.
	 *
	 * @var array{available:bool,active:bool,settings:?string}
	 */
	const UNAVAILABLE = array(
		'available' => false,
		'active'    => false,
		'settings'  => null,
	);

	/**
	 * State of the extensions Compatible Pro reports. Without Compatible Pro
	 * there is none, so every extension is unavailable and inactive.
	 *
	 * @return array<string,array{available:bool,active:bool,settings:?string}> Slug => state.
	 */
	public static function for_site() {
		if ( ! modula_is_compatible_pro() ) {
			return array();
		}

		/**
		 * Filters the state of each extension on this site.
		 *
		 * @param array|null $states Slug => { available, active, settings }; null when no one reports.
		 */
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- self::FILTER is 'modula_extension_states'; PHPCS cannot resolve the constant.
		$reported = apply_filters( self::FILTER, null );
		if ( null === $reported ) {
			$reported = self::from_pro_extensions_list();
		}

		return self::normalize( $reported );
	}

	/**
	 * State read from Pro's current extensions list
	 * (Modula_Pro\Extensions\Extensions::get_extensions()), until Pro reports
	 * through the filter. Pro's names, order and upgrade dividers are ignored.
	 *
	 * @return array Slug => { available, active, settings }, not yet validated.
	 */
	private static function from_pro_extensions_list() {
		if ( ! class_exists( 'Modula_Pro\Extensions\Extensions' ) ) {
			return array();
		}

		$rows = \Modula_Pro\Extensions\Extensions::get_instance()->get_extensions();
		if ( ! is_array( $rows ) ) {
			return array();
		}

		$states = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) || ! empty( $row['is_divider'] ) || ! isset( $row['slug'] ) ) {
				continue;
			}
			$states[ $row['slug'] ] = array(
				'available' => $row['available'] ?? false,
				'active'    => $row['enabled'] ?? false,
				'settings'  => $row['settings'] ?? null,
			);
		}
		return $states;
	}

	/**
	 * Validates a report: boolean flags only, an extension is active only
	 * while available, and the settings address is a URL or null. Anything
	 * else reads as unavailable.
	 *
	 * @param mixed $reported Slug => state, as reported.
	 * @return array<string,array{available:bool,active:bool,settings:?string}>
	 */
	private static function normalize( $reported ) {
		if ( ! is_array( $reported ) ) {
			return array();
		}

		$states = array();
		foreach ( $reported as $slug => $state ) {
			if ( ! is_string( $slug ) || ! is_array( $state ) ) {
				continue;
			}
			$states[ $slug ] = self::normalize_state( $state );
		}
		return $states;
	}

	/**
	 * One extension's validated state.
	 *
	 * @param array $state Reported state.
	 * @return array{available:bool,active:bool,settings:?string}
	 */
	private static function normalize_state( array $state ) {
		$available = true === ( $state['available'] ?? null );
		$settings  = $state['settings'] ?? null;
		$settings  = is_string( $settings ) ? esc_url_raw( $settings ) : '';

		return array(
			'available' => $available,
			'active'    => $available && true === ( $state['active'] ?? null ),
			'settings'  => '' === $settings ? null : $settings,
		);
	}
}
