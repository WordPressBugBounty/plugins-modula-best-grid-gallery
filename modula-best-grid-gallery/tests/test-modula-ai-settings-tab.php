<?php
/**
 * CLI tests: Modula AI settings tab field config on a local site host.
 *
 * Seam: Modula_Settings::get_modula_ai() (PHP field config, Performance-parallel).
 *
 * php tests/test-modula-ai-settings-tab.php
 *
 * @package Modula
 */

$failures = 0;

/**
 * @param bool   $ok  Assertion.
 * @param string $msg Label.
 * @return void
 */
function modula_ai_settings_test_assert( $ok, $msg ) {
	global $failures;
	if ( $ok ) {
		echo "ok - {$msg}\n";
		return;
	}
	++$failures;
	echo "FAIL - {$msg}\n";
}

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', true );
}

if ( ! defined( 'MODULA_AI_ENDPOINT' ) ) {
	define( 'MODULA_AI_ENDPOINT', 'https://ai.example.test' );
}

$GLOBALS['modula_ai_settings_test_site_url']       = 'http://localhost/wp';
$GLOBALS['modula_ai_settings_test_use_modula_ai']  = 1;
$GLOBALS['modula_ai_settings_test_environment']    = 'production';

if ( ! function_exists( 'add_action' ) ) {
	/**
	 * @return true
	 */
	function add_action() {
		return true;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	/**
	 * @return true
	 */
	function add_filter() {
		return true;
	}
}

if ( ! function_exists( 'get_option' ) ) {
	/**
	 * @param string $option  Option name.
	 * @param mixed  $default Default.
	 * @return mixed
	 */
	function get_option( $option, $default = false ) {
		if ( 'use_modula_ai' === $option ) {
			return $GLOBALS['modula_ai_settings_test_use_modula_ai'];
		}
		return $default;
	}
}

if ( ! function_exists( 'site_url' ) ) {
	/**
	 * @return string
	 */
	function site_url() {
		return $GLOBALS['modula_ai_settings_test_site_url'];
	}
}

if ( ! function_exists( 'wp_parse_url' ) ) {
	/**
	 * @param string $url       URL.
	 * @param int    $component Component.
	 * @return mixed
	 */
	function wp_parse_url( $url, $component = -1 ) {
		if ( -1 === $component ) {
			return parse_url( (string) $url );
		}
		return parse_url( (string) $url, $component );
	}
}

if ( ! function_exists( 'esc_html__' ) ) {
	/**
	 * @param string $text Text.
	 * @return string
	 */
	function esc_html__( $text ) {
		return $text;
	}
}

if ( ! function_exists( 'wp_get_environment_type' ) ) {
	/**
	 * @return string
	 */
	function wp_get_environment_type() {
		return $GLOBALS['modula_ai_settings_test_environment'];
	}
}

if ( ! class_exists( 'Modula_Debug_Log' ) ) {
	/**
	 * Stub so Modula_Settings can construct without the debug log service.
	 */
	class Modula_Debug_Log {
		const OPTION_KEY = 'modula_debug_log';
	}
}

require dirname( __DIR__ ) . '/includes/features/ai/class-ai-helper.php';
require dirname( __DIR__ ) . '/includes/admin/settings/class-modula-settings.php';

/**
 * Paragraph whose copy matches the compression environment notice.
 *
 * @param array $config Settings tab config.
 * @return bool
 */
function modula_ai_settings_test_has_localhost_notice( $config ) {
	if ( empty( $config['fields'] ) || ! is_array( $config['fields'] ) ) {
		return false;
	}

	foreach ( $config['fields'] as $field ) {
		if ( ! is_array( $field ) || ( $field['type'] ?? '' ) !== 'paragraph' ) {
			continue;
		}
		$text = (string) ( $field['description'] ?? '' );
		if ( false !== stripos( $text, 'running in a' ) && false !== stripos( $text, 'local' ) && false !== stripos( $text, 'environment' ) && false !== stripos( $text, 'Modula AI features have been disabled' ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Use AI Features toggle from the tab config.
 *
 * @param array $config Settings tab config.
 * @return array|null
 */
function modula_ai_settings_test_use_ai_toggle( $config ) {
	if ( empty( $config['fields'] ) || ! is_array( $config['fields'] ) ) {
		return null;
	}

	foreach ( $config['fields'] as $field ) {
		if ( is_array( $field ) && ( $field['name'] ?? '' ) === 'use_modula_ai' ) {
			return $field;
		}
	}

	return null;
}

$settings = new Modula_Settings();
$local    = $settings->get_modula_ai();
$toggle   = modula_ai_settings_test_use_ai_toggle( $local );

modula_ai_settings_test_assert(
	is_array( $toggle ) && true === ( $toggle['disabled'] ?? null ),
	'local host disables Use AI Features'
);
modula_ai_settings_test_assert(
	true === ( $toggle['default'] ?? null ),
	'local host keeps an already-on Use AI Features value'
);
modula_ai_settings_test_assert(
	modula_ai_settings_test_has_localhost_notice( $local ),
	'local host includes a local-host unavailable notice'
);

$GLOBALS['modula_ai_settings_test_use_modula_ai'] = 0;
$local_off = $settings->get_modula_ai();
$toggle_off = modula_ai_settings_test_use_ai_toggle( $local_off );

modula_ai_settings_test_assert(
	is_array( $toggle_off ) && true === ( $toggle_off['disabled'] ?? null ) && false === ( $toggle_off['default'] ?? null ),
	'local host keeps Use AI Features off and disabled'
);

$GLOBALS['modula_ai_settings_test_site_url']      = 'https://example.com';
$GLOBALS['modula_ai_settings_test_use_modula_ai'] = 0;
$GLOBALS['modula_ai_settings_test_environment']   = 'local';
$public = $settings->get_modula_ai();
$public_toggle = modula_ai_settings_test_use_ai_toggle( $public );

modula_ai_settings_test_assert(
	is_array( $public_toggle ) && false === ( $public_toggle['disabled'] ?? null ),
	'public host leaves Use AI Features interactive even when environment type is local'
);
modula_ai_settings_test_assert(
	! modula_ai_settings_test_has_localhost_notice( $public ),
	'public host omits the local-host unavailable notice'
);

if ( $failures > 0 ) {
	echo "{$failures} failed\n";
	exit( 1 );
}

echo "all passed\n";
exit( 0 );
