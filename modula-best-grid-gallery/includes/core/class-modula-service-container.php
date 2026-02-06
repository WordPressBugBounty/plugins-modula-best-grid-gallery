<?php

/**
 * Service container for Modula plugin.
 *
 * Manages and provides shared service instances used throughout the plugin.
 *
 * @since 2.0.0
 */
class Modula_Service_Container {

	/**
	 * Admin assets manager.
	 *
	 * @var Modula_Admin_Assets
	 */
	private $admin_assets;

	/**
	 * Media handler.
	 *
	 * @var Modula_Media
	 */
	private $media;

	/**
	 * Editor handler.
	 *
	 * @var Modula_Editor
	 */
	private $editor;

	/**
	 * WPChill notifications instance.
	 *
	 * @var WPChill_Notifications
	 */
	private $notifications;

	/**
	 * Instantiate shared services used across hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_services(): void {
		$this->admin_assets  = new Modula_Admin_Assets();
		$this->media         = new Modula_Media();
		$this->editor        = new Modula_Editor();
		$this->notifications = WPChill_Notifications::get_instance();
	}

	/**
	 * Get admin assets manager.
	 *
	 * @since 2.0.0
	 * @return Modula_Admin_Assets
	 */
	public function get_admin_assets(): Modula_Admin_Assets {
		return $this->admin_assets;
	}

	/**
	 * Get media handler.
	 *
	 * @since 2.0.0
	 * @return Modula_Media
	 */
	public function get_media(): Modula_Media {
		return $this->media;
	}

	/**
	 * Get editor handler.
	 *
	 * @since 2.0.0
	 * @return Modula_Editor
	 */
	public function get_editor(): Modula_Editor {
		return $this->editor;
	}

	/**
	 * Get notifications instance.
	 *
	 * @since 2.0.0
	 * @return WPChill_Notifications
	 */
	public function get_notifications(): WPChill_Notifications {
		return $this->notifications;
	}
}
