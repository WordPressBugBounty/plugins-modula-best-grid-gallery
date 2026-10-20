<?php
/**
 * OAuth clients: those registered through dynamic client registration (RFC 7591), and
 * those identified by a client ID metadata document (Client_Metadata_Documents).
 *
 * All clients are public: they authenticate with PKCE, never with a secret.
 * Registration is public, so it is rate limited per IP, the number of clients is
 * capped, and clients that never complete a connection expire. A document client is
 * not registered: its document is resolved at consent, and once it connects only its
 * name is kept, for the connections list.
 */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Oauth_Clients {
	/** Client id => array{name:string,redirect_uris:string[],created:int,connected:bool}. */
	public const OPTION = 'modula_mcp_oauth_clients';

	/** Document URL => client name, for document clients that connected. */
	public const DOCUMENT_NAMES_OPTION = 'modula_mcp_oauth_document_names';

	private const MAX_CLIENTS            = 100;
	private const MAX_REDIRECT_URIS      = 10;
	private const UNCONNECTED_TTL        = DAY_IN_SECONDS;
	private const REGISTRATIONS_PER_HOUR = 10;
	private const MAX_NAME_LENGTH        = 100;

	/**
	 * Schemes a native app must not claim: they run code, read local data, reach browser internals
	 * or hand off to other apps. Native apps' own schemes (cursor://, vscode://) are not reverse-DNS,
	 * so RFC 8252's private-use form cannot be required.
	 */
	private const REFUSED_SCHEMES = array( 'javascript', 'data', 'vbscript', 'file', 'about', 'blob', 'filesystem', 'ftp', 'ws', 'wss', 'mailto', 'tel', 'sms', 'intent', 'jar', 'view-source', 'chrome', 'chrome-extension', 'moz-extension', 'resource', 'res', 'ms-settings', 'shell' );

	private const LOOPBACK_HOSTS = array( 'localhost', '127.0.0.1', '[::1]' );

	/**
	 * Registers a client and returns its RFC 7591 registration response.
	 *
	 * @param mixed  $metadata Decoded client metadata.
	 * @param string $ip       Address the registration came from.
	 * @return array<string,mixed>|\WP_Error Error codes are OAuth error codes.
	 */
	public static function register( $metadata, string $ip ) {
		$client = self::from_metadata( $metadata );
		if ( is_wp_error( $client ) ) {
			return $client;
		}
		if ( ! Rate_Limit::admit( 'register|' . $ip, self::REGISTRATIONS_PER_HOUR, HOUR_IN_SECONDS ) ) {
			return new \WP_Error( 'too_many_requests', __( 'Too many client registrations. Try again later.', 'modula-best-grid-gallery' ), array( 'status' => 429 ) );
		}
		$clients = self::without_expired( self::all() );
		if ( count( $clients ) >= self::MAX_CLIENTS ) {
			return new \WP_Error( 'temporarily_unavailable', __( 'This site has too many registered AI clients. Disconnect unused ones first.', 'modula-best-grid-gallery' ), array( 'status' => 503 ) );
		}
		$client_id             = wp_generate_uuid4();
		$clients[ $client_id ] = $client;
		if ( ! update_option( self::OPTION, $clients, false ) ) {
			return new \WP_Error( 'server_error', __( 'The client could not be registered.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		return array(
			'client_id'                  => $client_id,
			'client_id_issued_at'        => $client['created'],
			'client_name'                => $client['name'],
			'redirect_uris'              => $client['redirect_uris'],
			'grant_types'                => Oauth_Grants::GRANT_TYPES,
			'response_types'             => array( 'code' ),
			'token_endpoint_auth_method' => 'none',
		);
	}

	/**
	 * Drops registrations that never completed a connection; runs with the daily transient
	 * cleanup. A failed write is retried by the next run, and find() already ignores them.
	 */
	public static function prune(): void {
		$clients = self::all();
		$kept    = self::without_expired( $clients );
		if ( count( $kept ) !== count( $clients ) ) {
			update_option( self::OPTION, $kept, false );
		}
	}

	/** Deletes every registered client and every document client's name, for uninstall. */
	public static function delete_all(): void {
		delete_option( self::OPTION );
		delete_option( self::DOCUMENT_NAMES_OPTION );
	}

	/**
	 * The client an id names: a registration, or the client a metadata document describes,
	 * which may be fetched. A document client also carries `document`, its URL.
	 *
	 * @return array{name:string,redirect_uris:string[],created:int,connected:bool,document?:string}|\WP_Error
	 *         The error says why the client cannot connect, for the consent screen.
	 */
	public static function lookup( string $client_id ) {
		if ( Client_Metadata_Documents::is_document_id( $client_id ) ) {
			return Client_Metadata_Documents::resolve( $client_id );
		}
		$client = self::all()[ $client_id ] ?? null;
		if ( ! is_array( $client ) || self::is_expired( $client ) ) {
			return new \WP_Error( 'invalid_client', __( 'This AI client is not registered on this site, or its registration expired. Start connecting again from the client.', 'modula-best-grid-gallery' ) );
		}
		return $client;
	}

	/**
	 * lookup() without the reason; may fetch a document client's document.
	 *
	 * @return array{name:string,redirect_uris:string[],created:int,connected:bool,document?:string}|null
	 */
	public static function find( string $client_id ): ?array {
		$client = self::lookup( $client_id );
		return is_wp_error( $client ) ? null : $client;
	}

	/**
	 * Whether a client may call the token endpoint; never fetches. A document client needs no
	 * fetch here: a code is bound to the client and redirect URI its document allowed at consent,
	 * and a refresh token to its grant.
	 */
	public static function can_request_tokens( string $client_id ): bool {
		return Client_Metadata_Documents::is_document_id( $client_id ) || null !== self::find( $client_id );
	}

	/** The client's name as stored when it registered or connected, for the connections list; never fetched. */
	public static function name( string $client_id ): string {
		return self::all()[ $client_id ]['name'] ?? self::document_names()[ $client_id ] ?? self::unnamed();
	}

	/**
	 * Whether a redirect URI was registered by the client. A loopback URI matches on any port
	 * (RFC 8252), because native apps listen on whichever port is free.
	 *
	 * @param array{redirect_uris:string[]} $client Registered client.
	 */
	public static function allows_redirect( array $client, string $redirect_uri ): bool {
		if ( in_array( $redirect_uri, $client['redirect_uris'], true ) ) {
			return true;
		}
		if ( ! self::is_loopback( $redirect_uri ) ) {
			return false;
		}
		$requested = self::without_port( $redirect_uri );
		foreach ( $client['redirect_uris'] as $registered ) {
			if ( self::is_loopback( $registered ) && self::without_port( $registered ) === $requested ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * A registered client that completed a connection no longer expires, and a document client's
	 * name is kept for the connections list; false when that could not be recorded.
	 */
	public static function mark_connected( string $client_id ): bool {
		if ( Client_Metadata_Documents::is_document_id( $client_id ) ) {
			return self::remember_document_name( $client_id );
		}
		$clients = self::all();
		if ( ! isset( $clients[ $client_id ] ) ) {
			return false;
		}
		if ( $clients[ $client_id ]['connected'] ) {
			return true;
		}
		$clients[ $client_id ]['connected'] = true;
		return update_option( self::OPTION, $clients, false );
	}

	/**
	 * Validates RFC 7591 metadata, from a registration or a metadata document, into a client.
	 *
	 * @param mixed $metadata Decoded client metadata.
	 * @return array{name:string,redirect_uris:string[],created:int,connected:bool}|\WP_Error
	 */
	public static function from_metadata( $metadata ) {
		if ( ! is_array( $metadata ) ) {
			return new \WP_Error( 'invalid_client_metadata', __( 'Client metadata must be a JSON object.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$redirect_uris = $metadata['redirect_uris'] ?? null;
		if ( ! is_array( $redirect_uris ) || ! $redirect_uris || count( $redirect_uris ) > self::MAX_REDIRECT_URIS ) {
			/* translators: %d: maximum number of redirect URIs */
			return new \WP_Error( 'invalid_redirect_uri', sprintf( __( 'Register between one and %d redirect URIs.', 'modula-best-grid-gallery' ), self::MAX_REDIRECT_URIS ), array( 'status' => 400 ) );
		}
		foreach ( $redirect_uris as $redirect_uri ) {
			if ( ! is_string( $redirect_uri ) || ! self::is_allowed_redirect_uri( $redirect_uri ) ) {
				return new \WP_Error( 'invalid_redirect_uri', __( 'Redirect URIs must use https, loopback http or a native app scheme, without a fragment.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
			}
		}
		$grant_types = $metadata['grant_types'] ?? array( 'authorization_code' );
		if ( ! is_array( $grant_types ) || ! in_array( 'authorization_code', $grant_types, true ) ) {
			return new \WP_Error( 'invalid_client_metadata', __( 'Clients must use the authorization code grant.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$name = is_string( $metadata['client_name'] ?? null ) ? sanitize_text_field( $metadata['client_name'] ) : '';
		return array(
			'name'          => '' !== $name ? mb_substr( $name, 0, self::MAX_NAME_LENGTH ) : self::unnamed(),
			'redirect_uris' => array_values( array_unique( $redirect_uris ) ),
			'created'       => time(),
			'connected'     => false,
		);
	}

	/**
	 * Keeps a document client's name. The code being exchanged was issued at consent, which
	 * resolved the document, and the document stays cached longer than a code lives.
	 *
	 * @param string $url Document URL.
	 */
	private static function remember_document_name( string $url ): bool {
		$client = self::find( $url );
		if ( ! $client ) {
			return false;
		}
		$names = self::document_names();
		if ( ( $names[ $url ] ?? null ) === $client['name'] ) {
			return true;
		}
		$names[ $url ] = $client['name'];
		return update_option( self::DOCUMENT_NAMES_OPTION, $names, false );
	}

	/** @return array<string,string> Document URL => client name. */
	private static function document_names(): array {
		$names = get_option( self::DOCUMENT_NAMES_OPTION, array() );
		return is_array( $names ) ? $names : array();
	}

	private static function unnamed(): string {
		return __( 'Unnamed AI client', 'modula-best-grid-gallery' );
	}

	/** https, loopback http, or a native app's own scheme; never a fragment or a refused scheme. */
	private static function is_allowed_redirect_uri( string $uri ): bool {
		$parts = wp_parse_url( $uri );
		if ( ! is_array( $parts ) || isset( $parts['fragment'] ) || ! isset( $parts['scheme'] ) ) {
			return false;
		}
		$scheme = strtolower( $parts['scheme'] );
		if ( 'https' === $scheme ) {
			return isset( $parts['host'] );
		}
		if ( 'http' === $scheme ) {
			return self::is_loopback( $uri );
		}
		return 1 === preg_match( '/^[a-z][a-z0-9+.-]*$/', $scheme ) && ! in_array( $scheme, self::REFUSED_SCHEMES, true );
	}

	private static function is_loopback( string $uri ): bool {
		$parts = wp_parse_url( $uri );
		return is_array( $parts )
			&& 'http' === strtolower( $parts['scheme'] ?? '' )
			&& in_array( strtolower( $parts['host'] ?? '' ), self::LOOPBACK_HOSTS, true );
	}

	private static function without_port( string $uri ): string {
		return (string) preg_replace( '#^(http://(?:\[::1\]|[^/:\[]+)):\d+#i', '$1', $uri );
	}

	/** @return array<string,array{name:string,redirect_uris:string[],created:int,connected:bool}> */
	private static function all(): array {
		$clients = get_option( self::OPTION, array() );
		return is_array( $clients ) ? $clients : array();
	}

	/**
	 * @param array<string,array{created:int,connected:bool}> $clients Registered clients.
	 * @return array<string,array{created:int,connected:bool}>
	 */
	private static function without_expired( array $clients ): array {
		return array_filter(
			$clients,
			static function ( $client ) {
				return ! self::is_expired( $client );
			}
		);
	}

	/** @param array{created:int,connected:bool} $client Registered client. */
	private static function is_expired( array $client ): bool {
		return ! $client['connected'] && $client['created'] + self::UNCONNECTED_TTL < time();
	}
}
