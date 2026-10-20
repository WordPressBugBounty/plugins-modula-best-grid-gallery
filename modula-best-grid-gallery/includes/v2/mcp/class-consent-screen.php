<?php
/**
 * The OAuth authorization endpoint: a consent screen on the site's login page (ADR 0044).
 *
 * Client and redirect URI problems are shown here and never redirected, so the screen
 * cannot send anyone to an unregistered address. A signed-out visitor logs in first;
 * only a `manage_options` user can approve, and the approval issues a code for the Modula agent.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Abilities\Agent;

defined( 'ABSPATH' ) || exit;

final class Consent_Screen {
	public const ACTION = 'modula_mcp_authorize';

	/** Parameters of the authorization request, carried from the query into the consent form. */
	private const PARAMS = array( 'response_type', 'client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'resource' );

	public static function boot(): void {
		add_action( 'login_form_' . self::ACTION, array( self::class, 'handle' ) );
	}

	/** The authorization endpoint advertised in the server metadata. */
	public static function url(): string {
		return add_query_arg( 'action', self::ACTION, wp_login_url() );
	}

	/** Answers the authorization request; wp-login.php must not go on to its own form. */
	public static function handle(): void {
		self::send_headers();
		$request = self::request();
		$client  = Oauth_Clients::lookup( $request['client_id'] );
		$problem = self::site_problem( $request, $client );
		if ( null !== $problem ) {
			self::render_problem( $problem );
			exit;
		}
		$invalid = self::invalid_request( $request );
		if ( null !== $invalid ) {
			self::redirect_to_client( $request, $invalid );
			exit;
		}
		if ( ! is_user_logged_in() ) {
			wp_safe_redirect( wp_login_url( self::request_url( $request ) ) );
			exit;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			self::render_problem( __( 'Only a site administrator can connect an AI client. Log in as an administrator to continue.', 'modula-best-grid-gallery' ), true );
			exit;
		}
		if ( self::is_decision() ) {
			self::decide( $request );
			exit;
		}
		self::render_consent( $request, $client );
		exit;
	}

	/** Not frameable, never cached. */
	private static function send_headers(): void {
		nocache_headers();
		header( 'X-Frame-Options: DENY' );
		header( "Content-Security-Policy: frame-ancestors 'none'" );
		header( 'Referrer-Policy: no-referrer' );
	}

	/**
	 * Request parameters, from the query or, for a decision, from the consent form.
	 *
	 * @return array<string,string>
	 */
	private static function request(): array {
		// phpcs:ignore WordPress.Security.NonceVerification -- Read for validation; decide() verifies the nonce before any write.
		$source  = self::is_decision() ? $_POST : $_GET;
		$request = array();
		foreach ( self::PARAMS as $param ) {
			$value             = isset( $source[ $param ] ) ? wp_unslash( $source[ $param ] ) : '';
			$request[ $param ] = is_string( $value ) ? $value : '';
		}
		return $request;
	}

	private static function is_decision(): bool {
		return isset( $_SERVER['REQUEST_METHOD'] ) && 'POST' === sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) );
	}

	/**
	 * What must be shown on the site rather than sent to the client: an unavailable site,
	 * an unknown client or unusable metadata document, or an unregistered redirect URI.
	 *
	 * @param array<string,string>                    $request Authorization request.
	 * @param array{redirect_uris:string[]}|\WP_Error $client  The client, or why it cannot connect.
	 */
	private static function site_problem( array $request, $client ): ?string {
		$unavailable = Oauth::unavailable();
		if ( $unavailable ) {
			return $unavailable->get_error_message();
		}
		if ( is_wp_error( $client ) ) {
			return $client->get_error_message();
		}
		if ( ! Oauth_Clients::allows_redirect( $client, $request['redirect_uri'] ) ) {
			return __( 'This AI client asked to return to an address it did not register. The connection was stopped.', 'modula-best-grid-gallery' );
		}
		return null;
	}

	/**
	 * Errors the client can handle, returned to its registered redirect URI.
	 *
	 * @param array<string,string> $request Authorization request.
	 * @return array{error:string,error_description:string}|null
	 */
	private static function invalid_request( array $request ): ?array {
		if ( 'code' !== $request['response_type'] ) {
			return array(
				'error'             => 'unsupported_response_type',
				'error_description' => __( 'Only the authorization code flow is supported.', 'modula-best-grid-gallery' ),
			);
		}
		if ( 'S256' !== $request['code_challenge_method'] || 1 !== preg_match( '/^[A-Za-z0-9_-]{43}$/', $request['code_challenge'] ) ) {
			return array(
				'error'             => 'invalid_request',
				'error_description' => __( 'PKCE with an S256 code challenge is required.', 'modula-best-grid-gallery' ),
			);
		}
		if ( '' !== $request['resource'] && ! Oauth::is_resource( $request['resource'] ) ) {
			return array(
				'error'             => 'invalid_target',
				'error_description' => __( 'The resource is not this site’s MCP endpoint.', 'modula-best-grid-gallery' ),
			);
		}
		return null;
	}

	/**
	 * This screen's URL for the request, so the login page can return to it.
	 *
	 * @param array<string,string> $request Authorization request.
	 */
	private static function request_url( array $request ): string {
		return add_query_arg( array_map( 'rawurlencode', array_filter( $request, 'strlen' ) ), self::url() );
	}

	/**
	 * Applies the administrator's decision from the consent form: a redirect, or a problem shown here.
	 *
	 * @param array<string,string> $request Authorization request, as the form carried it.
	 */
	private static function decide( array $request ): void {
		if ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ?? '' ) ), self::nonce_action( $request ) ) ) {
			self::render_problem( __( 'This consent screen expired. Start connecting again from the AI client.', 'modula-best-grid-gallery' ) );
			return;
		}
		if ( 'allow' !== sanitize_key( wp_unslash( $_POST['decision'] ?? '' ) ) ) {
			self::redirect_to_client(
				$request,
				array(
					'error'             => 'access_denied',
					'error_description' => __( 'The administrator denied access.', 'modula-best-grid-gallery' ),
				)
			);
			return;
		}
		$access = sanitize_key( wp_unslash( $_POST['access'] ?? '' ) );
		if ( ! in_array( $access, Connections::ACCESS_LEVELS, true ) ) {
			self::render_problem( __( 'Choose what the AI client may do, then allow access again.', 'modula-best-grid-gallery' ) );
			return;
		}
		$agent = Agent::ensure();
		if ( is_wp_error( $agent ) ) {
			self::render_problem( $agent->get_error_message() );
			return;
		}
		$code = Oauth_Grants::issue_code( $request, get_current_user_id(), $access );
		if ( is_wp_error( $code ) ) {
			self::render_problem( $code->get_error_message() );
			return;
		}
		self::redirect_to_client( $request, array( 'code' => $code ) );
	}

	/** @param array<string,string> $request Authorization request. */
	private static function nonce_action( array $request ): string {
		return self::ACTION . '|' . $request['client_id'];
	}

	/**
	 * Sends the result to the redirect URI, which site_problem() verified as registered.
	 *
	 * @param array<string,string> $request Authorization request.
	 * @param array<string,string> $result  Code or OAuth error.
	 */
	private static function redirect_to_client( array $request, array $result ): void {
		if ( '' !== $request['state'] ) {
			$result['state'] = $request['state'];
		}
		// A native app's own scheme or a loopback port is not a host wp_safe_redirect() knows.
		wp_redirect( add_query_arg( array_map( 'rawurlencode', $result ), $request['redirect_uri'] ) ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect
	}

	/**
	 * @param array<string,string>                                        $request Authorization request.
	 * @param array{name:string,redirect_uris:string[],document?:string} $client  The client.
	 */
	private static function render_consent( array $request, array $client ): void {
		$site = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$user = wp_get_current_user();
		login_header( __( 'Connect an AI client', 'modula-best-grid-gallery' ) );
		?>
		<form id="loginform" method="post" action="<?php echo esc_url( self::url() ); ?>">
			<p>
				<?php
				printf(
					/* translators: 1: AI client name, 2: site title */
					esc_html__( '%1$s wants to work with Modula on %2$s.', 'modula-best-grid-gallery' ),
					'<strong>' . esc_html( $client['name'] ) . '</strong>',
					'<strong>' . esc_html( $site ) . '</strong>'
				);
				?>
			</p>
			<p>
				<?php
				/* translators: %s: address the client returns to */
				printf( esc_html__( 'It will return to %s.', 'modula-best-grid-gallery' ), '<code>' . esc_html( self::redirect_label( $request['redirect_uri'] ) ) . '</code>' );
				?>
			</p>
			<?php if ( isset( $client['document'] ) ) : ?>
				<p>
					<?php
					// The name is the document's own claim; its host is what vouches for it.
					/* translators: %s: host that publishes the AI client's details */
					printf( esc_html__( 'Its name and addresses are published by %s.', 'modula-best-grid-gallery' ), '<code>' . esc_html( (string) wp_parse_url( $client['document'], PHP_URL_HOST ) ) . '</code>' );
					?>
				</p>
			<?php endif; ?>
			<p><?php esc_html_e( 'The client will act as the Modula agent, not as you. With Read & write, the Modula agent can:', 'modula-best-grid-gallery' ); ?></p>
			<ul style="list-style: disc; margin: 0.5em 0 1em 1.5em;">
				<li><?php esc_html_e( 'list, read, create, update and delete Modula galleries and albums;', 'modula-best-grid-gallery' ); ?></li>
				<li><?php esc_html_e( 'use images from the Media Library and upload new ones.', 'modula-best-grid-gallery' ); ?></li>
			</ul>
			<p><?php esc_html_e( 'It cannot change site settings, plugins or users, or edit posts and pages.', 'modula-best-grid-gallery' ); ?></p>
			<fieldset style="margin: 0 0 1em;">
				<legend><strong><?php esc_html_e( 'This connection may', 'modula-best-grid-gallery' ); ?></strong></legend>
				<p>
					<label>
						<input type="radio" name="access" value="<?php echo esc_attr( Connections::ACCESS_READ_WRITE ); ?>" checked />
						<?php esc_html_e( 'Read & write: everything listed above.', 'modula-best-grid-gallery' ); ?>
					</label>
				</p>
				<p>
					<label>
						<input type="radio" name="access" value="<?php echo esc_attr( Connections::ACCESS_READ_ONLY ); ?>" />
						<?php esc_html_e( 'Read only: list and read galleries, albums and media, without changing anything.', 'modula-best-grid-gallery' ); ?>
					</label>
				</p>
			</fieldset>
			<p>
				<?php
				/* translators: %s: display name of the signed-in administrator */
				printf( esc_html__( 'Signed in as %s. Allow access only if you started this connection yourself.', 'modula-best-grid-gallery' ), '<strong>' . esc_html( $user->display_name ) . '</strong>' );
				?>
			</p>
			<?php foreach ( $request as $param => $value ) : ?>
				<input type="hidden" name="<?php echo esc_attr( $param ); ?>" value="<?php echo esc_attr( $value ); ?>" />
			<?php endforeach; ?>
			<?php wp_nonce_field( self::nonce_action( $request ), '_wpnonce', false ); ?>
			<p class="submit" style="display: flex; gap: 8px; justify-content: flex-end;">
				<button type="submit" name="decision" value="deny" class="button button-large"><?php esc_html_e( 'Deny', 'modula-best-grid-gallery' ); ?></button>
				<button type="submit" name="decision" value="allow" class="button button-primary button-large"><?php esc_html_e( 'Allow access', 'modula-best-grid-gallery' ); ?></button>
			</p>
		</form>
		<?php
		login_footer();
	}

	/** The host a web client returns to, or the whole URI of a native app's scheme. */
	private static function redirect_label( string $redirect_uri ): string {
		$host = wp_parse_url( $redirect_uri, PHP_URL_HOST );
		return is_string( $host ) && '' !== $host ? $host : $redirect_uri;
	}

	/**
	 * @param string $message      What stopped the connection.
	 * @param bool   $switch_users Whether to offer logging in as another user.
	 */
	private static function render_problem( string $message, bool $switch_users = false ): void {
		login_header( __( 'Connect an AI client', 'modula-best-grid-gallery' ), '', new \WP_Error( 'modula_mcp_oauth', $message ) );
		if ( $switch_users ) {
			printf(
				'<p id="nav"><a href="%s">%s</a></p>',
				esc_url( wp_logout_url( wp_login_url( self::request_url( self::request() ) ) ) ),
				esc_html__( 'Log in as another user', 'modula-best-grid-gallery' )
			);
		}
		login_footer();
	}
}
