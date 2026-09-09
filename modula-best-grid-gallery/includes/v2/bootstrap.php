<?php
/**
 * Modula v2 bootstrap.
 * Registers autoloader and runs Loader::load().
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once MODULA_PATH . 'includes/v2/autoload.php';
\Modula\V2\Loader::load();
