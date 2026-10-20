<?php
/**
 * Runs when Modula is deleted from the Plugins screen. WordPress does not load the plugin
 * here, so only the v2 autoloader is set up. Removes the MCP credentials; gallery data stays.
 *
 * @package Modula
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

if ( ! defined( 'MODULA_PATH' ) ) {
	define( 'MODULA_PATH', plugin_dir_path( __FILE__ ) );
}
require_once MODULA_PATH . 'includes/v2/autoload.php';

// WordPress shows nothing from uninstall, so a kept agent is not reported; it holds no credentials.
Modula\V2\Mcp\Uninstall::run();
