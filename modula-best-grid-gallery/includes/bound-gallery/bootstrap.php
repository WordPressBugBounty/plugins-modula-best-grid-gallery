<?php
/**
 * Bound gallery host bootstrap (outside wpchill-folders).
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-bound-gallery.php';
require_once __DIR__ . '/class-bound-gallery-host.php';

\Modula\Bound_Gallery\Host::init();
