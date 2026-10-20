<?php
/** Contains the Modula agent: MCP only, with Modula capabilities only while a Modula tool runs. */
namespace Modula\V2\Abilities;

use Modula\V2\Mcp\Activity;
use Modula\V2\Mcp\Adapter;
use Modula\V2\Mcp\Connection_Switch;

defined( 'ABSPATH' ) || exit;

final class Agent_Access {
	private const EXECUTE_ABILITY = 'mcp-adapter/execute-ability';

	/** Modula post types plus attachments; their capability names follow Roles customizations. */
	private const POST_TYPES = array( 'modula-gallery', 'modula-album', 'modula-defaults', 'defaults-albums', 'attachment' );

	/** Meta capabilities stay mapped per object by map_meta_cap(). */
	private const META_CAPS = array( 'edit_post', 'read_post', 'delete_post' );

	/** Per-object checks that limit_objects() confines to Modula objects and attachments. */
	private const OBJECT_CAPS = array( 'edit_post', 'read_post', 'delete_post', 'publish_post', 'edit_page', 'read_page', 'delete_page' );

	/** Never granted, even if a post type maps one of its capabilities to them. */
	private const WITHHELD = array( 'manage_options', 'activate_plugins' );

	/**
	 * One frame per REST request being dispatched; true while it runs a Modula tool for the agent.
	 * A Modula ability may dispatch nested REST requests, which inherit its grant.
	 * WordPress offers no finally around REST callbacks: an uncaught throw ends the HTTP request
	 * and its PHP process with it. Outcome abilities catch their own throws.
	 *
	 * @var array<int,bool>
	 */
	private static $frames = array();

	/** Whether this request came through a read-only OAuth connection; it lasts the PHP request. */
	private static $reads_only = false;

	public static function boot(): void {
		// Before callbacks runs ahead of the route and tool permission checks; after callbacks runs whatever the callback returned.
		add_filter( 'rest_request_before_callbacks', array( self::class, 'enter' ), 5, 3 );
		add_filter( 'rest_request_after_callbacks', array( self::class, 'leave' ), 5 );
		add_filter( 'user_has_cap', array( self::class, 'grant' ), 10, 4 );
		add_filter( 'map_meta_cap', array( self::class, 'limit_objects' ), 10, 4 );
		add_filter( 'wp_authenticate_application_password_errors', array( self::class, 'refuse_xmlrpc' ), 10, 2 );
	}

	/**
	 * Keeps the grant on Modula objects and attachments.
	 *
	 * Modula post types share the `post` capabilities, so the primitive grant alone
	 * would also cover core posts and pages.
	 *
	 * @param string[] $caps    Primitive capabilities the meta capability maps to.
	 * @param string   $cap     Capability being checked.
	 * @param int      $user_id User being checked.
	 * @param array    $args    Capability arguments; the object ID comes first.
	 * @return string[]
	 */
	public static function limit_objects( $caps, $cap, $user_id, $args ) {
		if ( ! in_array( $cap, self::OBJECT_CAPS, true ) || ! self::is_granting() || ! Agent::is_agent( (int) $user_id ) ) {
			return $caps;
		}
		$post_type = get_post_type( (int) ( $args[0] ?? 0 ) );
		return in_array( $post_type, self::POST_TYPES, true ) ? $caps : array( 'do_not_allow' );
	}

	/** Limits this request to Modula tools annotated read-only; called for a read-only OAuth grant. */
	public static function restrict_to_reads(): void {
		self::$reads_only = true;
	}

	/** False on a read-only connection; Modula writes are then neither listed nor run. */
	public static function writes_allowed(): bool {
		return ! self::$reads_only;
	}

	/** Whether this request may list and run an ability: a read-only connection runs reads only. */
	public static function allows( \WP_Ability $ability ): bool {
		return true === ( $ability->get_meta_item( 'annotations', array() )['readonly'] ?? null ) || self::writes_allowed();
	}

	/**
	 * Wraps an ability permission callback so a refusal tells the agent's client why.
	 *
	 * A write on a read-only connection is refused first. This is the gate for every route
	 * to the ability, direct or through execute-ability; allows() only shapes listing and
	 * the capability grant. Otherwise the callback decides; only a `false` for the Modula
	 * agent becomes an explanation, which the MCP Adapter shows instead of a bare
	 * "Permission denied". The adapter passes on only the message, so the agent's refusal
	 * code goes to the activity log here.
	 *
	 * @param callable $permission Ability permission callback.
	 * @param bool     $is_read    Whether the ability only reads; registration sets its readonly annotation from the same value.
	 */
	public static function explain_refusal( callable $permission, bool $is_read ): callable {
		return static function ( $input = null ) use ( $permission, $is_read ) {
			$allowed = self::decide( $permission, $is_read, $input );
			if ( is_wp_error( $allowed ) && Agent::is_agent( get_current_user_id() ) ) {
				Activity::note_refusal( $allowed->get_error_code() );
			}
			return $allowed;
		};
	}

	/**
	 * Whether the agent or a person may run the ability, or a WP_Error that explains why not.
	 *
	 * @param callable $permission Ability permission callback.
	 * @param bool     $is_read    Whether the ability only reads.
	 * @param mixed    $input      Ability input.
	 * @return bool|\WP_Error
	 */
	private static function decide( callable $permission, bool $is_read, $input ) {
		if ( ! $is_read && ! self::writes_allowed() ) {
			return new \WP_Error(
				'modula_agent_read_only',
				__( 'This connection is read-only: the administrator who connected it allowed reading Modula galleries, albums, media and settings, not changing them. To make changes, connect again and choose Read & write.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$allowed = call_user_func( $permission, $input );
		if ( false !== $allowed || ! Agent::is_agent( get_current_user_id() ) ) {
			return $allowed;
		}
		return new \WP_Error(
			'modula_agent_permission_denied',
			__( 'The Modula agent does not have permission for this. It can work only with Modula galleries, albums and media it is allowed to edit, and with Modula settings and extensions; WordPress settings, Diagnostics and other administrator changes need a site administrator in WordPress.', 'modula-best-grid-gallery' ),
			array( 'status' => 403 )
		);
	}

	/**
	 * Application Passwords also authenticate XML-RPC; the agent works through MCP only.
	 *
	 * @param \WP_Error $error Authentication errors so far.
	 * @param \WP_User  $user  User the password belongs to.
	 * @return \WP_Error
	 */
	public static function refuse_xmlrpc( $error, $user ) {
		if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST && $user instanceof \WP_User && Agent::is_agent( (int) $user->ID ) ) {
			$error->add( 'modula_agent_mcp_only', __( 'The Modula agent can only use Modula tools through MCP.', 'modula-best-grid-gallery' ) );
		}
		return $error;
	}

	/**
	 * Opens a grant frame for a Modula tool call, and refuses the agent anywhere but MCP.
	 *
	 * @param mixed            $response Response so far; a WP_Error skips the callback.
	 * @param array            $handler  Matched route handler.
	 * @param \WP_REST_Request $request  Request being dispatched.
	 * @return mixed
	 */
	public static function enter( $response, $handler, $request ) {
		$inherited = self::is_granting();
		if ( $inherited || ! Agent::is_agent( get_current_user_id() ) ) {
			self::$frames[] = $inherited;
			return $response;
		}
		if ( ! Adapter::is_default_server_route( $request->get_route() ) ) {
			self::$frames[] = false;
			return new \WP_Error( 'modula_agent_mcp_only', __( 'The Modula agent can only use Modula tools through MCP.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
		}
		$off = Connection_Switch::unmet();
		if ( $off ) {
			self::$frames[] = false;
			return $off;
		}
		$ability        = self::called_ability( Adapter::default_server(), $request );
		self::$frames[] = null !== $ability && self::allows( $ability );
		return $response;
	}

	/**
	 * @param mixed $response Callback result, passed through unchanged.
	 * @return mixed
	 */
	public static function leave( $response ) {
		array_pop( self::$frames );
		return $response;
	}

	/**
	 * @param array<string,bool> $allcaps Capabilities the user has.
	 * @param string[]           $caps    Primitive capabilities being checked.
	 * @param array              $args    Requested capability and its arguments.
	 * @param \WP_User           $user    User being checked.
	 * @return array<string,bool>
	 */
	public static function grant( $allcaps, $caps, $args, $user ) {
		if ( ! self::is_granting() || ! $user instanceof \WP_User || ! Agent::is_agent( (int) $user->ID ) ) {
			return $allcaps;
		}
		foreach ( self::granted_caps() as $capability ) {
			$allcaps[ $capability ] = true;
		}
		foreach ( self::WITHHELD as $capability ) {
			$allcaps[ $capability ] = false;
		}
		return $allcaps;
	}

	private static function is_granting(): bool {
		return in_array( true, self::$frames, true );
	}

	/**
	 * Primitive capabilities of the Modula post types and attachments, plus upload_files and the
	 * Modula settings and extension capabilities (ADR 0045).
	 * Post types are registered on init, before any REST dispatch, so one list serves the request.
	 *
	 * @return string[]
	 */
	private static function granted_caps(): array {
		static $caps = null;
		if ( null !== $caps ) {
			return $caps;
		}
		$caps = array_merge( array( 'upload_files' ), Site_Settings::capabilities() );
		foreach ( self::POST_TYPES as $post_type ) {
			$object = get_post_type_object( $post_type );
			if ( ! $object ) {
				continue;
			}
			$type_caps = (array) $object->cap;
			$caps      = array_merge( $caps, array_values( array_diff_key( $type_caps, array_flip( self::META_CAPS ) ) ) );
		}
		$caps = array_values( array_diff( array_unique( $caps ), self::WITHHELD ) );
		return $caps;
	}

	/**
	 * What a single JSON-RPC tools/call on the default server targets. `executes` marks a call
	 * through execute-ability, and `ability` is the ability name it asks for: unchecked client
	 * input, or null when it is not a string. Null for batches, other methods and unknown tools.
	 *
	 * @param \WP_REST_Request $request MCP request.
	 * @return array{tool:string,executes:bool,ability:string|null}|null
	 */
	public static function tool_call( \WP_REST_Request $request ): ?array {
		$message = json_decode( (string) $request->get_body() );
		$name    = Adapter::called_tool( $message );
		if ( null === $name ) {
			return null;
		}
		$server = Adapter::default_server();
		$tool   = $server ? $server->get_mcp_tool( $name ) : null;
		if ( ! $tool ) {
			return null;
		}
		$ability = $message->params->arguments->ability_name ?? null;
		return array(
			'tool'     => $name,
			'executes' => self::EXECUTE_ABILITY === ( $tool->get_adapter_meta()['ability'] ?? null ),
			'ability'  => is_string( $ability ) ? $ability : null,
		);
	}

	/**
	 * The Modula ability a single JSON-RPC tools/call targets, directly or through execute-ability.
	 * Batches and other methods get no grant.
	 */
	private static function called_ability( $server, \WP_REST_Request $request ): ?\WP_Ability {
		$call = self::tool_call( $request );
		if ( null === $call ) {
			return null;
		}
		if ( $call['executes'] ) {
			return Integration::mcp_ability( $call['ability'] );
		}
		return Integration::tool_ability( $server, $call['tool'] );
	}
}
