<?php
/** Optional WordPress Abilities API integration; MCP remains a separate transport. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Freeform_Catalog;
use Modula\V2\Meta_Sync;
use Modula\V2\Images\Adapter;
use Modula\V2\Mcp\Adapter as Mcp_Adapter;

defined( 'ABSPATH' ) || exit;

final class Integration {
	public const DISCOVER       = 'modula/discover';
	public const LIST_GALLERIES = 'modula/list-galleries';
	public const READ_GALLERY   = 'modula/read-gallery';
	public const CATEGORY       = 'modula';

	public static function init(): void {
		if ( ! function_exists( 'wp_register_ability' ) || ! function_exists( 'wp_register_ability_category' ) || ! function_exists( 'wp_get_ability' ) ) {
			return;
		}
		Attachment_Image::init();
		Galleries::boot();
		Intake::boot();
		Media::boot();
		Album_Explanation::boot();
		Preset_Explanation::boot();
		Intake_Explanation::boot();
		Collection_Explanation::boot();
		Storage_Explanation::boot();
		Transfer_Explanation::boot();
		Bound_Explanation::boot();
		Video_Explanation::boot();
		Instagram_Explanation::boot();
		Watermark_Explanation::boot();
		Proofing_Explanation::boot();
		Site_Settings::boot();
		Input_Context::boot();
		Agent_Access::boot();
		Site_Explanation::boot();
		add_action( 'modula_abilities_cleanup', array( Requests::class, 'cleanup' ) );
		add_action( 'wp_abilities_api_categories_init', array( __CLASS__, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( __CLASS__, 'register_abilities' ) );
		add_filter( 'mcp_adapter_default_server_config', array( __CLASS__, 'server_config' ) );
		add_filter( 'mcp_adapter_tools_list', array( __CLASS__, 'tools_list' ), 10, 3 );
	}

	/**
	 * Lists each MCP-public Modula ability as a direct tool on the adapter's default server,
	 * and describes the server with Modula's initialize instructions, on requests that serve
	 * the server (serves_server()).
	 *
	 * The adapter auto-discovers resources and prompts, but not tools. Exposure reads
	 * the `mcp.public` meta set at registration, so this list and the generic
	 * discover-abilities tool make the same decision. A read-only connection's tools/list
	 * drops writes (tools_list()); discover-abilities has no filter and still names them,
	 * but calling one is refused. The adapter sends the server description as the
	 * initialize instructions. Modula replaces the adapter's generic description on purpose,
	 * because the instructions describe the tools listed here.
	 *
	 * Over HTTP the server is built for one message, so it gets only the Modula tools that message
	 * reads (served_tools()); the instructions still describe every Modula tool.
	 *
	 * @param mixed $config Default server configuration; another filter may have broken its shape.
	 * @return mixed The configuration, unchanged when it has no tools list or the request does not serve the server.
	 */
	public static function server_config( $config ) {
		if ( ! is_array( $config ) || ! is_array( $config['tools'] ?? null ) || ! self::serves_server( $config ) ) {
			return $config;
		}
		$modula_tools = array();
		// wp_get_abilities() filters by category and meta only from WP 7.1; earlier versions ignore its $args.
		foreach ( wp_get_abilities() as $name => $ability ) {
			if ( self::is_mcp_tool( $ability ) && ! in_array( $name, $config['tools'], true ) ) {
				$modula_tools[ $name ] = $ability;
			}
		}
		$config['server_description'] = Server_Instructions::text( array_merge( $config['tools'], array_keys( $modula_tools ) ) );
		$config['tools']              = array_merge( $config['tools'], self::served_tools( $modula_tools ) );
		return $config;
	}

	/**
	 * The Modula tools the server lists for this request's JSON-RPC message.
	 *
	 * The adapter projects each listed tool through both MCP revisions, about 10 ms per Modula tool
	 * under Xdebug, so a message gets only what its answer reads:
	 * - tools/call: the called tool;
	 * - tools/list: listing views without output schemas (listing_tools());
	 * - initialize, ping and notifications: no Modula tool.
	 * WP-CLI (its STDIO server answers many messages), batches, unreadable bodies and every other
	 * method get every Modula tool.
	 *
	 * @param array<string,\WP_Ability> $tools Modula tools by ability name.
	 * @return array<int,string|\WP\MCP\Domain\Tools\McpTool> Ability names or tool instances, as the adapter accepts them.
	 */
	private static function served_tools( array $tools ): array {
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return array_keys( $tools );
		}
		$message = json_decode( \WP_REST_Server::get_raw_data() );
		$method  = Mcp_Adapter::message_method( $message );
		$called  = Mcp_Adapter::called_tool( $message );
		if ( null !== $called ) {
			return array_keys( self::tools_named( $tools, $called ) );
		}
		if ( 'tools/list' === $method ) {
			return self::listing_tools( $tools );
		}
		if ( self::reads_no_tools( $method ) ) {
			return array();
		}
		return array_keys( $tools );
	}

	/** Whether the adapter answers a JSON-RPC method without reading any tool. */
	private static function reads_no_tools( ?string $method ): bool {
		return in_array( $method, array( 'initialize', 'ping' ), true )
			|| ( null !== $method && 0 === strpos( $method, 'notifications/' ) );
	}

	/**
	 * Tools for a single tools/list, each built from a listing view of its ability without the
	 * output schema: tools_list() drops that schema anyway, and it is about 93% of what the adapter
	 * would project. The adapter's tools/list calls no tool's permission or execute callback, so
	 * the views refuse both. Their adapter metadata names the registered ability, which
	 * tool_ability() resolves. A view that cannot be built falls back to the registered tool.
	 *
	 * @param array<string,\WP_Ability> $tools Modula tools by ability name.
	 * @return array<int,string|\WP\MCP\Domain\Tools\McpTool>
	 */
	private static function listing_tools( array $tools ): array {
		$listed = array();
		foreach ( $tools as $name => $ability ) {
			$listed[] = self::listing_tool( $ability ) ?? $name;
		}
		return $listed;
	}

	/** @return \WP\MCP\Domain\Tools\McpTool|null The listing tool, or null when its view is invalid. */
	private static function listing_tool( \WP_Ability $ability ) {
		try {
			$view = new \WP_Ability(
				$ability->get_name(),
				array(
					'label'               => $ability->get_label(),
					'description'         => $ability->get_description(),
					'category'            => $ability->get_category(),
					'input_schema'        => $ability->get_input_schema(),
					'meta'                => $ability->get_meta(),
					'execute_callback'    => static function () {
						return new \WP_Error( 'modula_mcp_listing_view', __( 'This tool listing cannot run the tool.', 'modula-best-grid-gallery' ) );
					},
					'permission_callback' => '__return_false',
				)
			);
		} catch ( \InvalidArgumentException $error ) {
			return null;
		}
		$tool = \WP\MCP\Domain\Tools\McpTool::fromAbility( $view );
		return is_wp_error( $tool ) ? null : $tool;
	}

	/**
	 * The Modula tool the adapter names as the called tool: none, or one.
	 *
	 * The name comes from the adapter (McpTool::fromAbility()), so a tool renamed through the
	 * mcp_adapter_tool_name filter still matches. The ability whose name reads as the tool name
	 * ("/" as "-") is built first; the others only when it is not the one.
	 *
	 * @param array<string,\WP_Ability> $tools  Modula tools by ability name.
	 * @param string                    $called Tool name from the request.
	 * @return array<string,\WP_Ability>
	 */
	private static function tools_named( array $tools, string $called ): array {
		$likely = array();
		foreach ( $tools as $name => $ability ) {
			if ( str_replace( '/', '-', $name ) === $called ) {
				$likely[ $name ] = $ability;
			}
		}
		foreach ( $likely + $tools as $name => $ability ) {
			$tool = \WP\MCP\Domain\Tools\McpTool::fromAbility( $ability );
			if ( ! is_wp_error( $tool ) && $called === $tool->get_name() ) {
				return array( $name => $ability );
			}
		}
		return array();
	}

	/**
	 * Whether this request serves the configured server: a WP-CLI command, or a REST request to its route.
	 *
	 * The adapter builds its default server on every rest_api_init, whatever the route, and building
	 * each Modula tool costs about 10 ms under Xdebug. Other routes never read the server's tools.
	 * Adapter::is_default_server_route() cannot answer here: the server does not exist while its
	 * configuration is filtered.
	 *
	 * @param array $config Default server configuration.
	 */
	private static function serves_server( array $config ): bool {
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return true;
		}
		$route_namespace = $config['server_route_namespace'] ?? null;
		$route           = $config['server_route'] ?? null;
		return is_string( $route_namespace ) && is_string( $route )
			&& untrailingslashit( Mcp_Adapter::requested_route() ) === Mcp_Adapter::route( $route_namespace, $route );
	}

	/**
	 * Lists Modula tools without their output schema, and only reads on a read-only connection.
	 *
	 * Output schemas were about 90% of a 2.4 MB tools/list, which clients such as
	 * Cursor fail to load. Calls still return structured results. The output schema
	 * stays readable through get-ability-info and modula/discover. Image-only results
	 * have no structured content, so the image tool must not advertise one either.
	 *
	 * @param array<int,\WP\McpSchema\Record\Tool> $tools  Listed tools.
	 * @param \WP\MCP\Core\McpServer              $server Server answering the request.
	 * @param \WP\McpSchema\Schema                $schema Negotiated protocol schema.
	 * @return array<int,\WP\McpSchema\Record\Tool>
	 */
	public static function tools_list( array $tools, $server, $schema ): array {
		foreach ( $tools as $index => $tool ) {
			$ability = self::tool_ability( $server, $tool->getName() );
			if ( ! $ability ) {
				continue;
			}
			if ( ! Agent_Access::allows( $ability ) ) {
				unset( $tools[ $index ] );
				continue;
			}
			$data = (array) $tool->jsonSerialize();
			// Listing views (listing_tools()) carry no output schema and need no second projection.
			if ( ! array_key_exists( 'outputSchema', $data ) ) {
				continue;
			}
			unset( $data['outputSchema'] );
			$tools[ $index ] = $schema->fromArray( \WP\McpSchema\Record\Tool::class, $data );
		}
		// Reindexed, so a list with removed tools still encodes as a JSON array.
		return array_values( $tools );
	}

	/**
	 * The MCP-public Modula ability behind a tool on an adapter server.
	 *
	 * @param \WP\MCP\Core\McpServer $server    Adapter server listing the tool.
	 * @param string                 $tool_name Tool name as the client sends it.
	 */
	public static function tool_ability( $server, string $tool_name ): ?\WP_Ability {
		$mcp_tool = $server->get_mcp_tool( $tool_name );
		return $mcp_tool ? self::mcp_ability( $mcp_tool->get_adapter_meta()['ability'] ?? null ) : null;
	}

	/**
	 * A registered Modula ability exposed as an MCP tool, or null.
	 *
	 * @param mixed $name Ability name; callers may pass untrusted client input.
	 */
	public static function mcp_ability( $name ): ?\WP_Ability {
		if ( ! is_string( $name ) || ! wp_has_ability( $name ) ) {
			return null;
		}
		$ability = wp_get_ability( $name );
		return $ability && self::is_mcp_tool( $ability ) ? $ability : null;
	}

	private static function is_mcp_tool( \WP_Ability $ability ): bool {
		$mcp = $ability->get_meta_item( 'mcp', array() );
		return self::CATEGORY === $ability->get_category()
			&& true === ( $mcp['public'] ?? null )
			&& 'tool' === ( $mcp['type'] ?? null );
	}

	public static function abilities(): array {
		return array(
			self::DISCOVER       => array(
				'execute' => array( self::class, 'discover' ),
			),
			self::LIST_GALLERIES => array(
				'execute' => array( self::class, 'list_galleries' ),
			),
			self::READ_GALLERY   => array(
				'execute'    => array( self::class, 'read_gallery' ),
				'permission' => array( self::class, 'can_read_gallery' ),
			),
		);
	}

	/** @return array<int,class-string> */
	private static function owners(): array {
		return array(
			self::class,
			Batch::class,
			Embedded::class,
			Composition::class,
			Update::class,
			Creation::class,
			Requests::class,
			Lifecycle::class,
			Proofing_Email::class,
			Proofing_Selections::class,
			Proofing::class,
			Proofing_Clients::class,
			Instagram::class,
			Watermark::class,
			Video::class,
			Transfers::class,
			Bound::class,
			Storage::class,
			Replacement::class,
			Diagnostics::class,
			Intake::class,
			Site_Settings::class,
			Attachment_Lifecycle::class,
			Collections::class,
			Attachment_Image::class,
			Attachments::class,
			Media_Folders::class,
			Album_Lifecycle::class,
			Album_Members::class,
			Albums::class,
			Presets::class,
			Album_Presets::class,
		);
	}

	/**
	 * @return array<string,array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool}>
	 */
	private static function table(): array {
		static $table = null;
		if ( is_array( $table ) ) {
			return $table;
		}
		$table = Operation_Table::collect( self::owners() );
		return $table;
	}

	/**
	 * @return array<string,mixed>
	 */
	public static function operation( string $name ): array {
		return self::table()[ $name ] ?? array();
	}

	public static function callback_map(): array {
		$callbacks = array();
		foreach ( self::table() as $name => $row ) {
			$callbacks[ $name ] = $row['execute'];
		}
		return $callbacks;
	}

	public static function register_category(): void {
		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'Modula', 'modula-best-grid-gallery' ),
				'description' => __( 'Discover and administer Beta galleries.', 'modula-best-grid-gallery' ),
			)
		);
	}

	public static function register_abilities(): void {
		$callbacks = Providers::callbacks();
		$table     = self::table();
		foreach ( Contract::definitions() as $name => $definition ) {
			if ( ! isset( $callbacks[ $name ] ) ) {
				continue;
			}
			$row                               = isset( $table[ $name ] ) ? $table[ $name ] : array();
			$readonly                          = ! Contract::is_mutation( $name );
			$definition['category']            = self::CATEGORY;
			$definition['execute_callback']    = $callbacks[ $name ];
			$definition['permission_callback'] = Agent_Access::explain_refusal( isset( $row['permission'] ) ? $row['permission'] : array( self::class, 'can_discover' ), $readonly );
			if ( ! $readonly || ! empty( $row['outcome'] ) || Catalog::requires_compatible_pro( $name ) ) {
				$definition['ability_class'] = Outcome_Ability::class;
			}
			$definition['meta'] = array(
				'mcp'          => array(
					'public' => Folders_Dependency::operation_available( $name ),
					'type'   => 'tool',
				),
				'annotations'  => array(
					'readonly'    => $readonly,
					'destructive' => ! empty( $row['destructive'] ),
					'idempotent'  => true,
				),
				'show_in_rest' => true,
			);
			wp_register_ability( $name, $definition );
		}
	}

	public static function can_recover(): bool {
		return Proofing_Clients::can_manage() || self::can_discover() || Media_Folders::can_manage() || Site_Settings::can_manage() || Intake::can_upload();
	}

	/** Dynamic CPT primitive follows Roles customizations instead of assuming a role name. */
	public static function can_discover( $input = array() ): bool {
		if ( ! get_current_user_id() ) {
			return false;
		}
		if ( Site_Settings::can_manage() ) {
			return true;
		}
		$types = array( 'modula-gallery' );
		if ( Albums::available() ) {
			$types[] = 'modula-album';
		}
		if ( Album_Presets::available() ) {
			$types[] = 'defaults-albums';
		}
		if ( Presets::available() ) {
			$types[] = 'modula-defaults';
		}
		foreach ( $types as $name ) {
			$type = get_post_type_object( $name );
			if ( $type && current_user_can( $type->cap->edit_posts ) ) {
				return true;
			}
		}
		return false;
	}

	public static function can_read_gallery( $input ): bool {
		$id = is_array( $input ) && isset( $input['id'] ) ? (int) $input['id'] : 0;
		return self::can_discover() && self::can_read_post( $id );
	}

	public static function can_read_post( int $id ): bool {
		$post = get_post( $id );
		return $post && 'modula-gallery' === $post->post_type && current_user_can( 'edit_post', $id ) && ( 'private' !== $post->post_status || current_user_can( 'read_post', $id ) );
	}

	private static function denied(): \WP_Error {
		return new \WP_Error( 'modula_forbidden', __( 'You are not allowed to read this Modula resource.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
	}

	private static function page( array $input, int $total ): array {
		$page = isset( $input['page'] ) ? (int) $input['page'] : 1;
		$size = isset( $input['per_page'] ) ? (int) $input['per_page'] : 20;
		return array(
			'schema_version' => Contract::VERSION,
			'page'           => $page,
			'per_page'       => $size,
			'total'          => $total,
			'total_pages'    => (int) ceil( $total / $size ),
		);
	}

	public static function gallery( \WP_Post $post ): array {
		return array(
			'id'         => (int) $post->ID,
			'title'      => (string) $post->post_title,
			'status'     => (string) $post->post_status,
			'editor_url' => admin_url( 'post.php?post=' . $post->ID . '&action=edit' ),
			'shortcode'  => '[modula id="' . $post->ID . '"]',
		);
	}

	/** Pure inspection of stored feature state; no editor bootstrap or license checks. */
	private static function features(): array {
		return Feature_Snapshot::inspect();
	}

	public static function currently_executable( string $name ): bool {
		$row = self::operation( $name );
		if ( ! $row || ! Providers::executable( $name ) || ! wp_get_ability( $name ) || Availability::blockers( $name ) ) {
			return false;
		}
		// A read-only OAuth connection runs no writes, so discovery must not offer them.
		if ( Contract::is_mutation( $name ) && ! Agent_Access::writes_allowed() ) {
			return false;
		}
		foreach ( $row['gates'] ?? array() as $gate ) {
			if ( ! $gate( $name ) ) {
				return false;
			}
		}
		return true;
	}

	public static function discover( array $input ) {
		if ( ! self::can_discover() ) {
			return self::denied();
		}
		$operations = array();
		foreach ( Contract::definitions() as $name => $definition ) {
			$executable   = self::currently_executable( $name );
			$operations[] = array(
				'name'          => $name,
				'status'        => $executable ? 'available' : 'unavailable',
				'description'   => $definition['description'],
				'readonly'      => ! Contract::is_mutation( $name ),
				'input_schema'  => $definition['input_schema'],
				'output_schema' => $definition['output_schema'],
			) + Catalog::describe( $name, $executable );
		}
		// Classic editing stays excluded. It is not a registered ability and not a placeholder family.
		$operations[]                = array(
			'name'        => 'classic-mutations',
			'status'      => 'unavailable',
			'description' => 'Classic editing and automatic conversion are outside this integration.',
			'readonly'    => false,
		);
		$page                        = self::page( $input, count( $operations ) );
		$page['capability_protocol'] = Providers::PROTOCOL;
		return $page + array(
			'operations'       => array_slice( $operations, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ),
			'features'         => self::features(),
			'inventory'        => Catalog::inventory(),
			'gallery_settings' => Settings_Contract::projection(),
		);
	}

	public static function list_galleries( array $input ) {
		if ( ! self::can_discover() ) {
			return self::denied();
		}
		$status     = $input['status'] ?? 'any';
		$statuses   = 'any' === $status ? array( 'publish', 'draft', 'pending', 'private', 'future', 'trash' ) : array( $status );
		$accessible = array();
		// Fetch only IDs in bounded database pages; totals never count inaccessible targets.
		$scan_page = 1;
		do {
			$query = new \WP_Query(
				array(
					'post_type'              => 'modula-gallery',
					'post_status'            => $statuses,
					'posts_per_page'         => 200,
					'paged'                  => $scan_page++,
					'fields'                 => 'ids',
					'orderby'                => 'ID',
					'order'                  => 'ASC',
					'no_found_rows'          => true,
					'update_post_meta_cache' => false,
					'update_post_term_cache' => false,
					's'                      => $input['search'] ?? '',
					'meta_key'               => Beta_Settings::META_KEY,
					'meta_value'             => '1',
				)
			);
			foreach ( $query->posts as $id ) {
				if ( self::can_read_post( (int) $id ) && Beta_Settings::is_beta_gallery( $id ) ) {
					$accessible[] = (int) $id;
				}
			}
		} while ( 200 === count( $query->posts ) );
		$page      = self::page( $input, count( $accessible ) );
		$galleries = array();
		foreach ( array_slice( $accessible, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ) as $id ) {
			// Recheck the target immediately before projecting content.
			if ( self::can_read_post( $id ) ) {
				$galleries[] = self::gallery( get_post( $id ) );
			}
		}
		return $page + array( 'galleries' => $galleries );
	}

	public static function read_gallery( array $input ) {
		if ( ! self::can_read_gallery( $input ) ) {
			return self::denied();
		}
		$id = (int) $input['id'];
		if ( ! Beta_Settings::is_beta_gallery( $id ) ) {
			return new \WP_Error( 'modula_classic_unsupported', __( 'This operation supports Beta galleries only.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$revision = Revision::state( $id );
		$items    = array();
		$schema   = Contract::item_schema();
		$catalog  = array_filter( Meta_Sync::get_images_v2( $id ), 'is_array' );
		foreach ( Freeform_Catalog::identify( $catalog ) as $row ) {
			$item = self::project_item( $row, $schema );
			if ( null !== $item ) {
				$items[] = $item;
			}
		}
		$gallery             = self::gallery( get_post( $id ) );
		$gallery['settings'] = Contract::project( Meta_Sync::get_settings_v2( $id, false ), Contract::settings_schema() );
		$gallery['revision'] = Revision::state( $id );
		if ( ! hash_equals( $revision, $gallery['revision'] ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Gallery state changed during inspection. Read again.', array( 'status' => 409 ) );
		}
		$page = self::page( $input, count( $items ) );
		return $page + array(
			'gallery' => $gallery,
			'items'   => array_slice( $items, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ),
		);
	}

	/**
	 * @param array<string,mixed> $row
	 * @param array<string,mixed> $schema
	 * @return array<string,mixed>|null
	 */
	private static function project_item( array $row, array $schema ) {
		$kind = Adapter::get_item_kind( $row );
		if ( 'image' === $kind && ! Adapter::is_video_template_row( $row ) ) {
			$attachment_id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) || ! current_user_can( 'edit_post', $attachment_id ) ) {
				return null;
			}
			$row['id'] = $attachment_id;
		}
		$row['itemKind'] = $kind;
		foreach ( array( 'blockBackgroundImageId', 'afterAttachmentId' ) as $reference ) {
			$reference_id = isset( $row[ $reference ] ) ? (int) $row[ $reference ] : 0;
			if ( $reference_id && ( 'attachment' !== get_post_type( $reference_id ) || ! current_user_can( 'edit_post', $reference_id ) ) ) {
				unset( $row[ $reference ] );
			}
		}
		if ( ! isset( $row['id'] ) || ( ! is_int( $row['id'] ) && ! is_string( $row['id'] ) ) ) {
			return null;
		}
		return Contract::project( $row, $schema );
	}
}
