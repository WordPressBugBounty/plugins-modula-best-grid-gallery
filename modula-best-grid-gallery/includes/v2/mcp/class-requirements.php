<?php
/** What a Direct MCP connection needs from this site, as the MCP Connections panel shows it. */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Requirements {
	/** Application Passwords need HTTPS outside a local environment. */
	public const PASSWORDS_HTTPS_REQUIRED = 'https_required';
	/** A filter or plugin turned Application Passwords off. */
	public const PASSWORDS_DISABLED = 'disabled';

	/**
	 * Status for the current user. Reasons are codes; the panel words them.
	 *
	 * `connections_enabled` is the Allow AI clients to connect switch. `oauth.reason` is the error
	 * code of what blocks signing in, or empty. `can_create_password` says whether a Password
	 * connection, the fallback, can be created now. `clients` has the shape Clients::options() documents.
	 *
	 * @return array{connections_enabled:bool,adapter:string,application_passwords:array{available:bool,reason:string},oauth:array{available:bool,reason:string},multisite:bool,wordpress:array{version:string,required:string},endpoint:string,can_install:bool,can_activate:bool,plugin_url:string,clients:array<int,array{id:string,label:string,steps:array<int,array{text:string,code?:string}>,cloud:bool,install_url:?string,has_fallback:bool}>,can_create_password:bool}
	 */
	public static function status(): array {
		return array(
			'connections_enabled'   => Connection_Switch::is_on(),
			'adapter'               => Adapter::state(),
			'application_passwords' => self::application_passwords(),
			'oauth'                 => self::oauth(),
			'multisite'             => is_multisite(),
			'wordpress'             => array(
				'version'  => get_bloginfo( 'version' ),
				'required' => Adapter::MIN_WP,
			),
			'endpoint'              => Adapter::endpoint(),
			'can_install'           => current_user_can( 'install_plugins' ),
			'can_activate'          => current_user_can( 'activate_plugins' ),
			'plugin_url'            => Adapter::PLUGIN_URL,
			'clients'               => Clients::options(),
			'can_create_password'   => null === Connections::site_unmet(),
		);
	}

	/** @return array{available:bool,reason:string} */
	public static function oauth(): array {
		$unmet = Oauth::unavailable();
		return array(
			'available' => null === $unmet,
			'reason'    => null === $unmet ? '' : (string) $unmet->get_error_code(),
		);
	}

	/** @return array{available:bool,reason:string} */
	public static function application_passwords(): array {
		if ( wp_is_application_passwords_available() ) {
			return array(
				'available' => true,
				'reason'    => '',
			);
		}
		return array(
			'available' => false,
			'reason'    => wp_is_application_passwords_supported() ? self::PASSWORDS_DISABLED : self::PASSWORDS_HTTPS_REQUIRED,
		);
	}
}
