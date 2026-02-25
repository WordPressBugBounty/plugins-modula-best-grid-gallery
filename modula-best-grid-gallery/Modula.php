<?php
/**
* Plugin Name:              Modula
* Plugin URI:               https://wp-modula.com/
* Description:              Modula is the most powerful, user-friendly WordPress gallery plugin. Add galleries, masonry grids and more in a few clicks.
* Author:                   WPChill
* Version:                  2.14.17
* Author URI:               https://www.wpchill.com/
* License:                  GPLv3 or later
* License URI:              http://www.gnu.org/licenses/gpl-3.0.html
* Requires PHP:             5.6
* Text Domain:              modula-best-grid-gallery
* Domain Path:              /languages
*
* Copyright 2015-2017       GreenTreeLabs       diego@greentreelabs.net
* Copyright 2017-2020       MachoThemes         hello@wp-modula.com
* Copyright 2020            WPchill             hello@wp-modula.com
*
* Original Plugin URI:      https://modula.greentreelabs.net/
* Original Author URI:      https://greentreelabs.net
* Original Author:          https://profiles.wordpress.org/greentreelabs/
*
* NOTE:
* GreenTreeLabs transferred ownership rights on: 03/29/2017 06:34:07 PM when ownership was handed over to MachoThemes
* The MachoThemes ownership period started on: 03/29/2017 06:34:08 PM
* SVN commit proof of ownership transferral: https://plugins.trac.wordpress.org/changeset/1607943/modula-best-grid-gallery
*
* MachoThemes has transferred ownership to WPChill on: 5th of November, 2020. WPChill is a rebrand & restructure of MachoThemes.
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License, version 3, as
* published by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free software
* Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

/**
 * Define Constants
 *
 * @since    2.0.2
 */

define( 'MODULA_LITE_VERSION', '2.14.17' );
define( 'MODULA_PATH', plugin_dir_path( __FILE__ ) );
define( 'MODULA_URL', plugin_dir_url( __FILE__ ) );
defined( 'MODULA_PRO_STORE_URL' ) || define( 'MODULA_PRO_STORE_URL', 'https://wp-modula.com' );
defined( 'MODULA_PRO_STORE_UPGRADE_URL' ) || define( 'MODULA_PRO_STORE_UPGRADE_URL', 'https://wp-modula.com/pricing' );
define( 'MODULA_FILE', plugin_basename( __FILE__ ) );

define( 'MODULA_LITE_TRANSLATE', dirname( plugin_basename( __FILE__ ) ) . '/languages' );

define( 'MODULA_CPT_NAME', 'modula-gallery' );
define( 'MODULA_AI_ENDPOINT', 'https://ai.wpchill.com' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-modula-activator.php
 */
function modula_activate() {}

register_activation_hook( __FILE__, 'modula_activate' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-modula.php';

// Action Scheduler
require_once plugin_dir_path( __FILE__ ) . 'includes/libraries/action-scheduler/action-scheduler.php';
/**
 * Ensures Modula Pro (modula/Modula.php) loads right after Lite so extensions
 * that depend on Modula_Pro do not run before the class exists.
 * Runs on every request when Lite loads first; updates DB for the next request.
 *
 * @since 2.14.0
 */
function modula_ensure_pro_loads_after_lite() {
	$lite = 'modula-best-grid-gallery/Modula.php';
	$pro  = 'modula/Modula.php';
	$list = (array) get_option( 'active_plugins', array() );

	$key_lite = array_search( $lite, $list, true );
	$key_pro  = array_search( $pro, $list, true );

	if ( false === $key_pro ) {
		return;
	}

	$want_pro_index = ( false !== $key_lite ) ? 1 : 0;
	if ( $key_pro === $want_pro_index ) {
		return;
	}
	unset( $list[ $key_pro ] );
	$list = array_values( $list );
	array_splice( $list, $want_pro_index, 0, array( $pro ) );

	update_option( 'active_plugins', $list );
}
/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    2.0.0
 */
function modula_run() {
	modula_ensure_pro_loads_after_lite();
	new Modula();
}

modula_run();
