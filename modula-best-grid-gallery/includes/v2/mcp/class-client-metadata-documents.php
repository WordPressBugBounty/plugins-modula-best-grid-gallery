<?php
/**
 * OAuth client ID metadata documents: a client whose `client_id` is an https URL publishes
 * its metadata at that URL, and connects without dynamic registration (ADR 0044).
 *
 * The consent screen resolves a document before anyone logs in, so the site fetches
 * whatever URL a visitor names. The fetch refuses private and loopback addresses
 * (wp_safe_remote_get) and this site's own host, follows no redirects, times out quickly,
 * reads a bounded body and is rate limited per IP. wp_safe_remote_get checks the host's
 * address before connecting; a DNS answer that changes between that check and the
 * connection is not caught.
 */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Client_Metadata_Documents {
	private const CACHE_PREFIX = 'modula_mcp_oauth_document_';

	/** Longer than Oauth_Grants::CODE_TTL, so exchanging a code finds the document consent resolved. */
	private const CACHE_TTL = 15 * MINUTE_IN_SECONDS;

	private const UNREACHABLE      = 'modula_mcp_client_document_unreachable';
	private const RATE_LIMITED     = 'modula_mcp_client_document_rate_limited';
	private const TIMEOUT          = 5;
	private const MAX_BYTES        = 16 * KB_IN_BYTES;
	private const FETCHES_PER_HOUR = 30;

	/**
	 * Whether a client_id names a metadata document: an https URL with a path, and without
	 * credentials, a fragment or dot segments. Registered clients have UUIDs, never URLs.
	 */
	public static function is_document_id( string $client_id ): bool {
		$parts = wp_parse_url( $client_id );
		if ( ! is_array( $parts ) || isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['fragment'] ) ) {
			return false;
		}
		$path = $parts['path'] ?? '';
		return 'https' === strtolower( $parts['scheme'] ?? '' )
			&& '' !== ( $parts['host'] ?? '' )
			&& '' !== trim( $path, '/' )
			&& 1 !== preg_match( '#/\.{1,2}(/|$)#', $path );
	}

	/**
	 * The client a document describes, from the cache or a fresh fetch.
	 *
	 * @param string $url Document URL, which is also the client_id.
	 * @return array{name:string,redirect_uris:string[],created:int,connected:bool,document:string}|\WP_Error
	 *         Codes: UNREACHABLE when it could not be fetched, RATE_LIMITED, and `invalid_client_metadata`
	 *         when it is not a valid document. Every message suits the consent screen.
	 */
	public static function resolve( string $url ) {
		$key    = self::CACHE_PREFIX . md5( $url );
		$cached = get_transient( $key );
		if ( is_array( $cached ) ) {
			return $cached;
		}
		$document = self::fetch( $url );
		if ( is_wp_error( $document ) ) {
			return $document;
		}
		$client = self::client( $url, $document );
		if ( is_wp_error( $client ) ) {
			return $client;
		}
		set_transient( $key, $client, self::CACHE_TTL );
		return $client;
	}

	/**
	 * Fetches and decodes a document.
	 *
	 * @param string $url Document URL.
	 * @return array<string,mixed>|\WP_Error
	 */
	private static function fetch( string $url ) {
		// wp_safe_remote_get allows the site's own host whatever it resolves to; a client is never hosted here.
		if ( strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) ) === strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) ) ) {
			return self::invalid( __( 'it is published on this site.', 'modula-best-grid-gallery' ) );
		}
		if ( ! Rate_Limit::admit( 'document|' . Rate_Limit::client_ip(), self::FETCHES_PER_HOUR, HOUR_IN_SECONDS ) ) {
			return new \WP_Error( self::RATE_LIMITED, __( 'Too many AI client lookups from your network. Try again in an hour.', 'modula-best-grid-gallery' ) );
		}
		$response = wp_safe_remote_get(
			$url,
			array(
				'timeout'             => self::TIMEOUT,
				'redirection'         => 0,
				'limit_response_size' => self::MAX_BYTES,
				'headers'             => array( 'Accept' => 'application/json' ),
			)
		);
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return self::unreachable( $url );
		}
		// A body cut at MAX_BYTES does not decode, so an oversized document is refused here.
		$document = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $document ) ) {
			return self::invalid( __( 'it is not a JSON object of at most 16 KB.', 'modula-best-grid-gallery' ) );
		}
		return $document;
	}

	/**
	 * Validates a document into a client, with the rules registration uses.
	 *
	 * @param string              $url      Document URL.
	 * @param array<string,mixed> $document Decoded document.
	 * @return array{name:string,redirect_uris:string[],created:int,connected:bool,document:string}|\WP_Error
	 */
	private static function client( string $url, array $document ) {
		if ( ( $document['client_id'] ?? null ) !== $url ) {
			return self::invalid( __( 'its client_id is not its own URL.', 'modula-best-grid-gallery' ) );
		}
		// The token endpoint authenticates clients by PKCE only; a client expecting a secret or a key cannot connect.
		if ( 'none' !== ( $document['token_endpoint_auth_method'] ?? 'none' ) || isset( $document['client_secret'] ) ) {
			return self::invalid( __( 'it asks for client authentication, and this site supports public clients only.', 'modula-best-grid-gallery' ) );
		}
		$client = Oauth_Clients::from_metadata( $document );
		if ( is_wp_error( $client ) ) {
			return self::invalid( $client->get_error_message() );
		}
		$client['document'] = $url;
		return $client;
	}

	/** @param string $url Document URL. */
	private static function unreachable( string $url ): \WP_Error {
		return new \WP_Error(
			self::UNREACHABLE,
			/* translators: %s: host name of the AI client's metadata document */
			sprintf( __( 'The AI client’s details could not be loaded from %s. Try again in a few minutes.', 'modula-best-grid-gallery' ), (string) wp_parse_url( $url, PHP_URL_HOST ) )
		);
	}

	/** @param string $reason Why the document was refused. */
	private static function invalid( string $reason ): \WP_Error {
		return new \WP_Error(
			'invalid_client_metadata',
			/* translators: %s: why the document was refused */
			sprintf( __( 'The AI client’s metadata document cannot be used: %s', 'modula-best-grid-gallery' ), $reason )
		);
	}
}
