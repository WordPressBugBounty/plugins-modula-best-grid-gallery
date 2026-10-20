<?php
/**
 * The MCP activity log: recent tool calls made through connections, and connection events.
 *
 * A row holds the tool, the connection's label and kind, the time, whether it succeeded and,
 * for a failed call, a short reason code: never arguments, results, content, messages,
 * passwords or tokens. The newest MAX_ROWS rows live in
 * one option. Two calls finishing at the same moment can lose a row, which a view of recent
 * activity tolerates.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Abilities\Agent;
use Modula\V2\Abilities\Agent_Access;

defined( 'ABSPATH' ) || exit;

final class Activity {
	/**
	 * Newest first: array<int,array{id:string,time:int,event:string,tool:string,label:string,kind:string,ok:bool,reason?:string}>.
	 * Rows written before reasons were logged have no `reason`.
	 */
	public const OPTION = 'modula_mcp_activity';

	/** Events, as the activity table reports them. */
	public const CALL       = 'call';
	public const CONNECT    = 'connect';
	public const DISCONNECT = 'disconnect';
	public const REGENERATE = 'regenerate';
	public const TURNED_ON  = 'turned-on';
	public const TURNED_OFF = 'turned-off';

	/** The kind of a site-wide event's row, whose label is the administrator who acted. */
	public const ADMINISTRATOR = 'administrator';

	private const MAX_ROWS = 200;

	/**
	 * Modula outcome statuses (Contract's status enum) that mean nothing was done. The others
	 * count as succeeded: `succeeded`; `partial`, where part was done; and `in_progress`,
	 * `pending` and `uncertain`, where the effect may already have happened.
	 */
	private const FAILED_STATUSES = array( 'rejected', 'forbidden', 'conflict', 'not_found', 'expired' );

	/**
	 * The OAuth connection that authenticated this request, from Bearer_Auth; null for a password,
	 * which WordPress itself records.
	 *
	 * @var array{label:string,kind:string}|null
	 */
	private static $oauth_connection = null;

	/**
	 * The error code of the agent's last permission refusal in this request, from Agent_Access.
	 *
	 * @var string
	 */
	private static $refusal = '';

	public static function boot(): void {
		// Before Agent_Access::enter (5) and the permission checks, so a refusal belongs to this call only.
		add_filter( 'rest_request_before_callbacks', array( self::class, 'forget_refusal' ), 1, 3 );
		// After Agent_Access::leave (5), with the call's final response.
		add_filter( 'rest_request_after_callbacks', array( self::class, 'record_call' ), 20, 3 );
	}

	/**
	 * Attributes this request's calls to an OAuth connection; called by Bearer_Auth.
	 *
	 * @param array{label:string,kind:string} $connection Connections::describe_grant().
	 */
	public static function attribute_to( array $connection ): void {
		self::$oauth_connection = $connection;
	}

	/**
	 * Remembers why the agent was refused, for the call's row; called by Agent_Access.
	 *
	 * @param string|int $code WP_Error code of the refusal.
	 */
	public static function note_refusal( $code ): void {
		self::$refusal = self::reason_code( $code );
	}

	/**
	 * Starts each MCP request without a refusal from an earlier request in the same process.
	 *
	 * @param mixed            $response Response so far, passed through unchanged.
	 * @param array            $handler  Matched route handler.
	 * @param \WP_REST_Request $request  Request being dispatched.
	 * @return mixed
	 */
	public static function forget_refusal( $response, $handler, $request ) {
		if ( Adapter::is_default_server_route( $request->get_route() ) ) {
			self::$refusal = '';
		}
		return $response;
	}

	/**
	 * Logs a single tools/call the Modula agent made on the MCP route. Batches and other
	 * methods are not tool calls and are not logged.
	 *
	 * @param mixed            $response Callback result, passed through unchanged.
	 * @param array            $handler  Matched route handler.
	 * @param \WP_REST_Request $request  Request answered.
	 * @return mixed
	 */
	public static function record_call( $response, $handler, $request ) {
		if ( ! Agent::is_agent( get_current_user_id() ) || ! Adapter::is_default_server_route( $request->get_route() ) ) {
			return $response;
		}
		$tool       = self::tool_name( $request );
		$connection = self::$oauth_connection ?? self::password_connection();
		if ( null !== $tool && null !== $connection ) {
			$reason = self::failure_reason( $response );
			self::record( self::CALL, $connection, $tool, null === $reason, (string) $reason );
		}
		return $response;
	}

	/**
	 * Adds a row. A failed write loses only this row.
	 *
	 * @param string                          $event      One of the event constants.
	 * @param array{label:string,kind:string} $connection The connection the row is about.
	 * @param string                          $tool       Tool name for a call; empty for other events.
	 * @param bool                            $ok         Whether it succeeded.
	 * @param string                          $reason     Reason code of a failed call; empty when unknown or succeeded.
	 */
	public static function record( string $event, array $connection, string $tool = '', bool $ok = true, string $reason = '' ): void {
		$rows = self::rows();
		array_unshift(
			$rows,
			array(
				'id'     => bin2hex( random_bytes( 6 ) ),
				'time'   => time(),
				'event'  => $event,
				'tool'   => $tool,
				'label'  => $connection['label'],
				'kind'   => $connection['kind'],
				'ok'     => $ok,
				'reason' => $reason,
			)
		);
		update_option( self::OPTION, array_slice( $rows, 0, self::MAX_ROWS ), false );
	}

	/** @return array<int,array{id:string,time:int,event:string,tool:string,label:string,kind:string,ok:bool}> Newest first. */
	public static function rows(): array {
		$rows = get_option( self::OPTION, array() );
		return is_array( $rows ) ? $rows : array();
	}

	/** Empties the log, from Clear activity and on uninstall. An already empty log counts as cleared. */
	public static function delete_all(): bool {
		return delete_option( self::OPTION ) || array() === self::rows();
	}

	/** The agent password WordPress authenticated this request with; null for any other credential. */
	private static function password_connection(): ?array {
		$uuid = rest_get_authenticated_app_password();
		return is_string( $uuid ) && '' !== $uuid ? Connections::describe_password( $uuid ) : null;
	}

	/**
	 * The tool a single tools/call names; through execute-ability, the ability it asks for.
	 * Only the name is kept, never the arguments.
	 */
	private static function tool_name( \WP_REST_Request $request ): ?string {
		$call = Agent_Access::tool_call( $request );
		if ( null === $call ) {
			return null;
		}
		$name = $call['executes'] && null !== $call['ability'] ? $call['ability'] : $call['tool'];
		// Client input: keep a name's characters only, at a bounded length.
		return substr( (string) preg_replace( '#[^a-z0-9/_-]#i', '', $name ), 0, 100 );
	}

	/**
	 * Why the call did not do what it asked, or null when it did. It failed on a transport or
	 * JSON-RPC error, a tool error, or a Modula outcome saying nothing was done. The reason is
	 * the outcome's code, else the agent's permission refusal code, else empty when unknown.
	 *
	 * @param mixed $response Final response of the MCP request.
	 */
	private static function failure_reason( $response ): ?string {
		if ( ! $response instanceof \WP_REST_Response || $response->get_status() >= 400 ) {
			return self::$refusal;
		}
		$message = json_decode( (string) wp_json_encode( $response->get_data() ), true );
		if ( ! is_array( $message ) || isset( $message['error'] ) || ! empty( $message['result']['isError'] ) ) {
			return self::$refusal;
		}
		$content = $message['result']['structuredContent'] ?? array();
		// Execute-ability wraps the ability's result as {success, data}.
		$content = is_array( $content['data'] ?? null ) ? $content['data'] : $content;
		if ( ! in_array( $content['status'] ?? null, self::FAILED_STATUSES, true ) ) {
			return null;
		}
		$code = self::reason_code( $content['code'] ?? '' );
		return '' !== $code ? $code : self::$refusal;
	}

	/**
	 * A code's name characters only, at a bounded length; anything else gives an empty code.
	 *
	 * @param mixed $code Outcome or WP_Error code.
	 */
	private static function reason_code( $code ): string {
		if ( ! is_string( $code ) && ! is_int( $code ) ) {
			return '';
		}
		return substr( (string) preg_replace( '#[^a-z0-9_-]#i', '', (string) $code ), 0, 64 );
	}
}
