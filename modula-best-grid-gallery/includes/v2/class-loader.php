<?php
/**
 * Modula v2 loader.
 * Bootstraps v2 namespace (settings: registry, adapter, sanitizer). Extensions (Pro) register via filters.
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Class Loader
 */
class Loader {

	/**
	 * Load v2. Registers alias for legacy Modula_V2_Settings_Adapter and triggers autoload of settings classes.
	 */
	public static function load() {
		// Trigger autoload of settings classes so they are available and alias works.
		Settings\Registry::class;
		Settings\Settings_Schema_Document::class;
		Settings\Field_Registry::class;
		Settings\Adapter::class;
		Settings\Sanitizer::class;
		Settings\Settings_Editor_Presenter::class;
		Images\Adapter::class;
		Images\Chunked_Storage::class;
		Modern_Gallery::class;

		class_alias( Settings\Adapter::class, 'Modula_V2_Settings_Adapter' );

		Modern_Gallery::init();

		Beta_Settings::init();

		// When modula-settings / modula-images are saved, also save modula_settings_v2 and modula_images_v2.
		Meta_Sync::init();

		// Optional native automation surface; normal Modula boot has no API dependency.
		Abilities\Integration::init();

		// Admin: optional React settings shell (metabox + scripts); remove with v2 admin cleanup if abandoned.
		Admin\Gallery_Takeover_Admin::init();
		Admin\Settings_Editor_Metabox::init();
		Admin\Beta_Gallery_Admin::init();
		Admin\Gallery_Listing_Admin::init();
		// SCRIPT_DEBUG only: hidden page that shows every admin-ui control (ADR 0046).
		Admin\Admin_Ui_Demo::init();

		// REST: GET gallery settings v2 / images v2 (optional filter by group or key).
		Rest\Settings_Controller::init();
		// REST: gallery listing index.
		Rest\Listing_Controller::init();
		// REST: folder/ZIP import helpers (gallery upload browser — no admin-ajax).
		Rest\Gallery_Upload_Controller::init();
		// REST: AI-assisted custom CSS generation.
		Rest\Gallery_Css_Ai_Controller::init();
		// REST: MCP Connections panel on the AI settings tab.
		Rest\Mcp_Connections_Controller::init();
		Mcp\Connections::boot();
		Mcp\Activity::boot();
		// OAuth for Direct MCP connections: discovery, consent screen, registration, tokens and Bearer auth.
		Mcp\Oauth::boot();
		Rest\Oauth_Controller::init();
		// Modula's Uninstall form removes MCP credentials; uninstall.php does the same on delete.
		Mcp\Uninstall::boot();

		// WP-CLI: Gallery WP-CLI (list / Convert to new editor / Restore classic editor).
		add_action( 'cli_init', array( Cli\Gallery_Command::class, 'register' ) );

		// Shortcode [modula]: register on init so Modula_Item_Data_Processor (public) is already loaded.
		add_action( 'init', array( __CLASS__, 'register_shortcode' ), 5 );
	}

	/**
	 * Register the [modula] dispatcher (Beta gallery vs classic per gallery id).
	 */
	public static function register_shortcode() {
		new Shortcode\Dispatcher();
	}
}
