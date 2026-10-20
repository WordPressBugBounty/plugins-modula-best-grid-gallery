<?php
/**
 * The MCP clients a Direct MCP connection is made for: one owner for each client's
 * label, OAuth steps and Password connection fallback config.
 */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Clients {
	public const CLAUDE_CODE    = 'claude-code';
	public const CLAUDE_DESKTOP = 'claude-desktop';
	public const CHATGPT        = 'chatgpt';
	public const CURSOR         = 'cursor';
	public const VSCODE         = 'vscode';
	public const CODEX          = 'codex';
	public const OTHER          = 'other';

	/**
	 * Client id => definition. Adding a client adds a row here.
	 *
	 * - `steps` builds the OAuth steps, each `{text, code?}`, from the endpoint and server name.
	 * - `cloud` marks clients that connect from their provider's servers and need a public HTTPS site.
	 * - `fallback` builds the Password connection config, or is null for a client that signs in only.
	 * - `install` builds a one-click install link from the endpoint and server name, or is null.
	 *   The link carries only the URL; the client signs in through OAuth on first use.
	 *
	 * Built per call, not cached, so labels follow the current locale.
	 *
	 * @return array<string,array{label:string,steps:callable,cloud:bool,fallback:?callable,install:?callable}>
	 */
	private static function definitions(): array {
		return array(
			self::CLAUDE_CODE    => array(
				'label'    => __( 'Claude Code', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'claude_code_steps' ),
				'cloud'    => false,
				'fallback' => array( self::class, 'claude_code_config' ),
				'install'  => null,
			),
			self::CLAUDE_DESKTOP => array(
				'label'    => __( 'Claude.ai & Claude Desktop', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'claude_desktop_steps' ),
				'cloud'    => true,
				'fallback' => array( self::class, 'claude_desktop_config' ),
				'install'  => null,
			),
			self::CHATGPT        => array(
				'label'    => __( 'ChatGPT', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'chatgpt_steps' ),
				'cloud'    => true,
				'fallback' => null,
				'install'  => null,
			),
			self::CURSOR         => array(
				'label'    => __( 'Cursor', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'cursor_steps' ),
				'cloud'    => false,
				'fallback' => array( self::class, 'cursor_config' ),
				'install'  => array( self::class, 'cursor_install_url' ),
			),
			self::VSCODE         => array(
				'label'    => __( 'VS Code', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'vscode_steps' ),
				'cloud'    => false,
				'fallback' => array( self::class, 'vscode_config' ),
				'install'  => array( self::class, 'vscode_install_url' ),
			),
			self::CODEX          => array(
				'label'    => __( 'Codex', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'codex_steps' ),
				'cloud'    => false,
				'fallback' => array( self::class, 'codex_config' ),
				'install'  => null,
			),
			self::OTHER          => array(
				'label'    => __( 'Other', 'modula-best-grid-gallery' ),
				'steps'    => array( self::class, 'other_steps' ),
				'cloud'    => false,
				'fallback' => array( self::class, 'other_config' ),
				'install'  => null,
			),
		);
	}

	/**
	 * What the panel shows per client: its OAuth steps for this site, its install link (null when it has none)
	 * and whether it has a password fallback.
	 *
	 * @return array<int,array{id:string,label:string,steps:array<int,array{text:string,code?:string}>,cloud:bool,install_url:?string,has_fallback:bool}>
	 */
	public static function options(): array {
		$endpoint = Adapter::endpoint();
		$name     = self::server_name();
		$options  = array();
		foreach ( self::definitions() as $id => $definition ) {
			$options[] = array(
				'id'           => $id,
				'label'        => $definition['label'],
				'steps'        => call_user_func( $definition['steps'], $endpoint, $name ),
				'cloud'        => $definition['cloud'],
				'install_url'  => null === $definition['install'] ? null : call_user_func( $definition['install'], $endpoint, $name ),
				'has_fallback' => null !== $definition['fallback'],
			);
		}
		return $options;
	}

	/** Whether the id names a client in the canonical set. */
	public static function exists( string $client ): bool {
		return isset( self::definitions()[ $client ] );
	}

	/** @return string[] Clients a Password connection can be created for. */
	public static function fallback_ids(): array {
		return array_keys(
			array_filter(
				self::definitions(),
				static function ( $definition ) {
					return null !== $definition['fallback'];
				}
			)
		);
	}

	/** Whether a Password connection can be created for the client; false for an unknown id. */
	public static function has_fallback( string $client ): bool {
		return in_array( $client, self::fallback_ids(), true );
	}

	/** The client's label, or the id itself when unknown. */
	public static function label( string $client ): string {
		return self::definitions()[ $client ]['label'] ?? $client;
	}

	/**
	 * The Password connection config for a client with a fallback.
	 *
	 * - `app` names the program the config is for, which may be narrower than the client label.
	 * - `locations` lists where the config goes, per platform; a command has none.
	 * - `note` is an extra requirement to show with it, or empty.
	 *
	 * @param string                                                 $client     Client id with a fallback.
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @return array{format:string,content:string,app:string,locations:array<string,string>,note:string}
	 */
	public static function config( string $client, array $credential ): array {
		$config = call_user_func( self::definitions()[ $client ]['fallback'], $credential, self::server_name() );
		return $config + array(
			'app'       => self::label( $client ),
			'locations' => array(),
			'note'      => '',
		);
	}

	/** `modula-<site host>`, so several sites can coexist in one client. */
	public static function server_name(): string {
		$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		$slug = trim( preg_replace( '/[^a-z0-9]+/', '-', strtolower( $host ) ), '-' );
		return 'modula-' . ( '' === $slug ? 'site' : $slug );
	}

	/**
	 * Claude Code: add the URL, then authenticate from /mcp.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function claude_code_steps( string $endpoint, string $name ): array {
		return array(
			self::step( __( 'Add the server in a terminal:', 'modula-best-grid-gallery' ), sprintf( 'claude mcp add --transport http %s "%s"', $name, $endpoint ) ),
			/* translators: %s: MCP server name, such as modula-example-com */
			self::step( sprintf( __( 'In Claude Code, run /mcp, choose %s and select Authenticate.', 'modula-best-grid-gallery' ), $name ) ),
			self::sign_in_step(),
		);
	}

	/**
	 * Claude.ai and Claude Desktop: a custom connector, added from Claude's own servers.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function claude_desktop_steps( string $endpoint, string $name ): array {
		return array(
			self::step( __( 'In Claude, open Settings → Connectors and choose Add custom connector.', 'modula-best-grid-gallery' ) ),
			/* translators: %s: MCP server name, such as modula-example-com */
			self::step( sprintf( __( 'Name it %s and paste this URL:', 'modula-best-grid-gallery' ), $name ), $endpoint ),
			self::step( __( 'Select Connect.', 'modula-best-grid-gallery' ) ),
			self::sign_in_step(),
		);
	}

	/**
	 * ChatGPT: a custom connector, added from OpenAI's servers.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function chatgpt_steps( string $endpoint, string $name ): array {
		return array(
			self::step( __( 'In ChatGPT settings, create a custom connector for a remote MCP server. Your plan or workspace may need developer mode turned on.', 'modula-best-grid-gallery' ) ),
			/* translators: %s: MCP server name, such as modula-example-com */
			self::step( sprintf( __( 'Name it %s, paste this URL and choose OAuth authentication:', 'modula-best-grid-gallery' ), $name ), $endpoint ),
			self::sign_in_step(),
		);
	}

	/**
	 * Cursor: the URL in mcp.json, then Connect.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function cursor_steps( string $endpoint, string $name ): array {
		return array(
			self::step( __( 'Add the server to ~/.cursor/mcp.json, or to .cursor/mcp.json in a project:', 'modula-best-grid-gallery' ), self::json( array( 'mcpServers' => array( $name => array( 'url' => $endpoint ) ) ) ) ),
			self::step( __( 'In Cursor Settings → MCP, the server shows that it needs sign-in. Select Connect.', 'modula-best-grid-gallery' ) ),
			self::sign_in_step(),
		);
	}

	/**
	 * VS Code: an HTTP server, then the sign-in VS Code offers.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function vscode_steps( string $endpoint, string $name ): array {
		$server = array(
			'type' => 'http',
			'url'  => $endpoint,
		);
		return array(
			self::step( __( 'Run MCP: Add Server from the Command Palette and choose HTTP, or add the server to .vscode/mcp.json or your user mcp.json:', 'modula-best-grid-gallery' ), self::json( array( 'servers' => array( $name => $server ) ) ) ),
			self::step( __( 'Start the server. When VS Code asks to sign in, allow it.', 'modula-best-grid-gallery' ) ),
			self::sign_in_step(),
		);
	}

	/**
	 * Cursor's MCP install deeplink: the server name and the base64 of `{url}`.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return string `cursor://` deeplink.
	 */
	private static function cursor_install_url( string $endpoint, string $name ): string {
		$config = base64_encode( (string) wp_json_encode( array( 'url' => $endpoint ), JSON_UNESCAPED_SLASHES ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Cursor's deeplink format.
		return 'cursor://anysphere.cursor-deeplink/mcp/install?' . http_build_query(
			array(
				'name'   => $name,
				'config' => $config,
			),
			'',
			'&',
			PHP_QUERY_RFC3986
		);
	}

	/**
	 * VS Code's MCP install URL: the URL-encoded `{name, type, url}`.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return string `vscode:` install URL.
	 */
	private static function vscode_install_url( string $endpoint, string $name ): string {
		$server = array(
			'name' => $name,
			'type' => 'http',
			'url'  => $endpoint,
		);
		return 'vscode:mcp/install?' . rawurlencode( (string) wp_json_encode( $server, JSON_UNESCAPED_SLASHES ) );
	}

	/**
	 * Codex: the URL in config.toml, then `codex mcp login`.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function codex_steps( string $endpoint, string $name ): array {
		return array(
			self::step( __( 'Add the server to ~/.codex/config.toml:', 'modula-best-grid-gallery' ), sprintf( "[mcp_servers.%s]\nurl = \"%s\"", $name, $endpoint ) ),
			self::step( __( 'Sign in from a terminal:', 'modula-best-grid-gallery' ), sprintf( 'codex mcp login %s', $name ) ),
			self::sign_in_step(),
		);
	}

	/**
	 * Any client implementing MCP authorization: the URL is enough.
	 *
	 * @param string $endpoint MCP endpoint.
	 * @param string $name     Server name; the client chooses its own.
	 * @return array<int,array{text:string,code?:string}>
	 */
	private static function other_steps( string $endpoint, string $name ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Same signature as every steps builder.
		return array(
			self::step( __( 'Add this URL as a remote MCP server (Streamable HTTP):', 'modula-best-grid-gallery' ), $endpoint ),
			self::step( __( 'Any client that supports MCP authorization opens this site’s consent screen to sign in. Select Allow access there.', 'modula-best-grid-gallery' ) ),
		);
	}

	/**
	 * A `claude mcp add` command for the HTTP transport with a Basic Authorization header.
	 *
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @param string                                                 $name       Server name.
	 * @return array{format:string,content:string}
	 */
	private static function claude_code_config( array $credential, string $name ): array {
		// Double quotes work in POSIX shells, PowerShell and cmd. Connections::site_unmet() refuses
		// endpoints a shell would expand; base64 never contains such characters.
		return array(
			'format'  => 'shell',
			'content' => sprintf(
				'claude mcp add --transport http %s "%s" --header "Authorization: %s"',
				$name,
				$credential['endpoint'],
				self::authorization( $credential )
			),
		);
	}

	/**
	 * Claude Desktop with a local site: its connectors connect from the cloud, and its config
	 * file cannot send a static header to a remote server; the WordPress MCP proxy can.
	 *
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @param string                                                 $name       Server name.
	 * @return array{format:string,content:string,app:string,locations:array<string,string>,note:string}
	 */
	private static function claude_desktop_config( array $credential, string $name ): array {
		$server = array(
			'command' => 'npx',
			'args'    => array( '-y', '@automattic/mcp-wordpress-remote@latest' ),
			'env'     => array(
				'WP_API_URL'      => $credential['endpoint'],
				'WP_API_USERNAME' => $credential['username'],
				'WP_API_PASSWORD' => $credential['password'],
				'OAUTH_ENABLED'   => 'false',
			),
		);
		return array(
			'format'    => 'json',
			'content'   => self::json( array( 'mcpServers' => array( $name => $server ) ) ),
			'app'       => __( 'Claude Desktop', 'modula-best-grid-gallery' ),
			'locations' => array(
				'macos'   => '~/Library/Application Support/Claude/claude_desktop_config.json',
				'windows' => '%APPDATA%\\Claude\\claude_desktop_config.json',
			),
			'note'      => __( 'For a local site. Claude Desktop runs the WordPress MCP proxy with npx, which needs Node.js 22 or newer on this computer. Restart Claude Desktop after saving. On a public HTTPS site, add a custom connector and sign in instead.', 'modula-best-grid-gallery' ),
		);
	}

	/**
	 * Cursor: an `mcpServers` entry with the URL and the Authorization header.
	 *
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @param string                                                 $name       Server name.
	 * @return array{format:string,content:string,locations:array<string,string>}
	 */
	private static function cursor_config( array $credential, string $name ): array {
		$server = array(
			'url'     => $credential['endpoint'],
			'headers' => array( 'Authorization' => self::authorization( $credential ) ),
		);
		return array(
			'format'    => 'json',
			'content'   => self::json( array( 'mcpServers' => array( $name => $server ) ) ),
			'locations' => array(
				'macos'   => '~/.cursor/mcp.json',
				'windows' => '%USERPROFILE%\\.cursor\\mcp.json',
			),
		);
	}

	/**
	 * VS Code: a `servers` entry of type http with the Authorization header.
	 *
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @param string                                                 $name       Server name.
	 * @return array{format:string,content:string,locations:array<string,string>}
	 */
	private static function vscode_config( array $credential, string $name ): array {
		$server = array(
			'type'    => 'http',
			'url'     => $credential['endpoint'],
			'headers' => array( 'Authorization' => self::authorization( $credential ) ),
		);
		return array(
			'format'    => 'json',
			'content'   => self::json( array( 'servers' => array( $name => $server ) ) ),
			'locations' => array(
				'macos'   => '~/Library/Application Support/Code/User/mcp.json',
				'windows' => '%APPDATA%\\Code\\User\\mcp.json',
			),
		);
	}

	/**
	 * Codex: TOML basic strings; Connections::site_unmet() refuses endpoints with quotes or backslashes.
	 *
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @param string                                                 $name       Server name.
	 * @return array{format:string,content:string,locations:array<string,string>}
	 */
	private static function codex_config( array $credential, string $name ): array {
		return array(
			'format'    => 'toml',
			'content'   => sprintf(
				"[mcp_servers.%1\$s]\nurl = \"%2\$s\"\n\n[mcp_servers.%1\$s.http_headers]\nAuthorization = \"%3\$s\"",
				$name,
				$credential['endpoint'],
				self::authorization( $credential )
			),
			'locations' => array(
				'macos'   => '~/.codex/config.toml',
				'windows' => '%USERPROFILE%\\.codex\\config.toml',
			),
		);
	}

	/**
	 * Any client: the values to configure by hand.
	 *
	 * @param array{endpoint:string,username:string,password:string} $credential Connection credential.
	 * @param string                                                 $name       Server name; the client chooses its own.
	 * @return array{format:string,content:string,note:string}
	 */
	private static function other_config( array $credential, string $name ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Same signature as every fallback builder.
		return array(
			'format'  => 'text',
			'content' => implode(
				"\n",
				array(
					/* translators: %s: MCP endpoint URL */
					sprintf( __( 'Endpoint: %s', 'modula-best-grid-gallery' ), $credential['endpoint'] ),
					/* translators: %s: username */
					sprintf( __( 'Username: %s', 'modula-best-grid-gallery' ), $credential['username'] ),
					/* translators: %s: Application Password */
					sprintf( __( 'Password: %s', 'modula-best-grid-gallery' ), $credential['password'] ),
					/* translators: %s: HTTP Authorization header value */
					sprintf( __( 'Authorization header: %s', 'modula-best-grid-gallery' ), self::authorization( $credential ) ),
				)
			),
			'note'    => __( 'Configure a remote MCP server (Streamable HTTP) that sends this Authorization header with every request.', 'modula-best-grid-gallery' ),
		);
	}

	/**
	 * One instruction, with an optional command, URL or config to copy.
	 *
	 * @param string $text What to do.
	 * @param string $code What to copy; empty for none.
	 * @return array{text:string,code?:string}
	 */
	private static function step( string $text, string $code = '' ): array {
		if ( '' === $code ) {
			return array( 'text' => $text );
		}
		return array(
			'text' => $text,
			'code' => $code,
		);
	}

	/**
	 * The consent step every OAuth client ends with.
	 *
	 * @return array{text:string}
	 */
	private static function sign_in_step(): array {
		return self::step( __( 'Your browser opens this site’s consent screen. Log in as an administrator if asked, then select Allow access.', 'modula-best-grid-gallery' ) );
	}

	/**
	 * Pretty-printed JSON with readable URLs, as a config file holds it.
	 *
	 * @param array<string,mixed> $config Config to print.
	 */
	private static function json( array $config ): string {
		return (string) wp_json_encode( $config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
	}

	/**
	 * The HTTP Basic header value for an Application Password.
	 *
	 * @param array{username:string,password:string} $credential Connection credential.
	 */
	private static function authorization( array $credential ): string {
		return 'Basic ' . base64_encode( $credential['username'] . ':' . $credential['password'] ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- HTTP Basic authentication header.
	}
}
