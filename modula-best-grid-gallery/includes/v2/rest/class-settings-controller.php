<?php

/**
 * Modula v2 REST: gallery settings and images (v2 format).
 * GET gallery settings v2 / images v2 with optional filter by group(s) or single key.
 * PUT/PATCH settings v2 (grouped body); sanitizes, saves modula_settings_v2, syncs flat modula-settings.
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Class Settings_Controller
 */
class Settings_Controller {


	const NAMESPACE = 'modula/v2';

	/**
	 * Register REST routes.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register routes for gallery settings v2 and images v2.
	 */
	public static function register_routes() {
		$gallery_id_args = array(
			'id' => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $param ) {
					return $param > 0;
				},
			),
		);

		$read_args = array_merge(
			$gallery_id_args,
			array(
				'group'  => array(
					'required'          => false,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_key',
					'description'       => __( 'Return only this group (e.g. lightbox, general).', 'modula-best-grid-gallery' ),
				),
				'groups' => array(
					'required'          => false,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'description'       => __( 'Comma-separated group names. Return only these groups.', 'modula-best-grid-gallery' ),
				),
				'key'    => array(
					'required'          => false,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'description'       => __( 'Return only this key: group.key (e.g. lightbox.keyboard).', 'modula-best-grid-gallery' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/gallery/(?P<id>\d+)/settings',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_settings' ),
					'permission_callback' => array( __CLASS__, 'check_gallery_access' ),
					'args'                => $read_args,
				),
				array(
					'methods'             => array( 'PUT', 'PATCH' ),
					'callback'            => array( __CLASS__, 'update_settings' ),
					'permission_callback' => array( __CLASS__, 'check_gallery_edit' ),
					'args'                => $gallery_id_args,
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/gallery/(?P<id>\d+)/images',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_images' ),
				'permission_callback' => array( __CLASS__, 'check_gallery_access' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return $param > 0;
						},
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/gallery/(?P<id>\d+)/bootstrap',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_bootstrap' ),
				'permission_callback' => array( __CLASS__, 'check_gallery_access' ),
				'args'                => array(
					'id'      => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return $param > 0;
						},
					),
					'align'   => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => __( 'Gallery alignment (shortcode align attribute).', 'modula-best-grid-gallery' ),
					),
					'context' => array(
						'required'          => false,
						'type'              => 'string',
						'enum'              => array( 'public', 'settings_editor' ),
						'default'           => 'public',
						'sanitize_callback' => 'sanitize_key',
						'description'       => __( 'Bootstrap shape: settings_editor = full grid for admin preview (requires edit access).', 'modula-best-grid-gallery' ),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/gallery/(?P<id>\d+)/items',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_items_page' ),
				'permission_callback' => array( __CLASS__, 'check_gallery_access' ),
				'args'                => array(
					'id'           => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return $param > 0;
						},
					),
					'page'         => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
					),
					'per_page'     => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 12,
						'sanitize_callback' => 'absint',
					),
					'filters'      => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => function ( $value ) {
							return is_string( $value ) ? wp_unslash( $value ) : '';
						},
						'description'       => __( 'JSON array of {key,value} filter objects.', 'modula-best-grid-gallery' ),
					),
					'shuffle_seed' => array(
						'required'          => false,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => __( 'Shuffle seed from gallery bootstrap metadata (keeps paginated order stable within one page load).', 'modula-best-grid-gallery' ),
					),
					'all'          => array(
						'required'          => false,
						'type'              => 'boolean',
						'default'           => false,
						'sanitize_callback' => function ( $value ) {
							return (bool) filter_var( $value, FILTER_VALIDATE_BOOLEAN );
						},
						'description'       => __( 'When true, return the full filtered catalog (lightbox show-all) instead of a page slice.', 'modula-best-grid-gallery' ),
					),
				),
			)
		);
	}

	/**
	 * Permission: allow read for published galleries or if user can edit.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool|\WP_Error
	 */
	public static function check_gallery_access( $request ) {
		$id   = (int) $request['id'];
		$post = get_post( $id );
		if ( ! $post || 'modula-gallery' !== $post->post_type ) {
			return new \WP_Error( 'rest_not_found', __( 'Gallery not found.', 'modula-best-grid-gallery' ), array( 'status' => 404 ) );
		}
		if ( 'publish' === $post->post_status ) {
			return true;
		}
		return current_user_can( 'edit_post', $id );
	}

	/**
	 * Permission: only users who can edit the gallery (PUT/PATCH settings).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool|\WP_Error
	 */
	public static function check_gallery_edit( $request ) {
		$id   = (int) $request['id'];
		$post = get_post( $id );
		if ( ! $post || 'modula-gallery' !== $post->post_type ) {
			return new \WP_Error( 'rest_not_found', __( 'Gallery not found.', 'modula-best-grid-gallery' ), array( 'status' => 404 ) );
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			return new \WP_Error(
				'rest_cannot_edit',
				__( 'Sorry, you are not allowed to edit this gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		if ( ! \Modula\V2\Beta_Settings::is_beta_gallery( $id ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'The modern gallery editor is only available for Beta galleries.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * Strip sensitive grouped settings before public/unauthenticated reads.
	 *
	 * @param array<string, array<string, mixed>> $data Grouped v2 settings.
	 * @return array<string, array<string, mixed>>
	 */
	public static function redact_settings_for_public( array $data ) {
		if ( isset( $data['passwordProtect'] ) && is_array( $data['passwordProtect'] ) ) {
			unset( $data['passwordProtect']['password'] );
		}
		return $data;
	}

	/**
	 * GET gallery settings v2. Optional: group, groups, or key to filter.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_settings( $request ) {
		$id = (int) $request['id'];
		if ( current_user_can( 'edit_post', $id ) ) {
			\Modula\V2\Meta_Sync::ensure_settings_v2_from_flat( $id );
			\Modula\V2\Meta_Sync::ensure_default_settings( $id );
		}
		$data = \Modula\V2\Meta_Sync::get_settings_v2( $id );
		/**
		 * Filter gallery settings v2 after load (e.g. Pro prefill for empty proofing fields).
		 *
		 * @param array<string, mixed> $data Grouped settings.
		 * @param int                  $id   Gallery post ID.
		 */
		$data = apply_filters( 'modula_v2_gallery_settings', $data, $id );
		if ( is_array( $data ) ) {
			\Modula\V2\Settings\Adapter::enrich_video_media_urls( $data );
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			$data = self::redact_settings_for_public( $data );
		}

		$key = $request->get_param( 'key' );
		if ( '' !== $key && is_string( $key ) ) {
			$parts = explode( '.', $key, 2 );
			if ( 2 === count( $parts ) ) {
				$group = $parts[0];
				$k     = $parts[1];
				if ( isset( $data[ $group ][ $k ] ) ) {
					return new \WP_REST_Response( array( 'value' => $data[ $group ][ $k ] ), 200 );
				}
				return new \WP_REST_Response( array( 'value' => null ), 200 );
			}
		}

		$group      = $request->get_param( 'group' );
		$groups     = $request->get_param( 'groups' );
		$group_str  = is_string( $group ) ? $group : '';
		$groups_str = is_string( $groups ) ? $groups : '';
		if ( '' !== $groups_str ) {
			$want = array_map( 'trim', array_filter( explode( ',', $groups_str ) ) );
		} elseif ( '' !== $group_str ) {
			$want = array( $group_str );
		} else {
			$want = null;
		}

		if ( null !== $want ) {
			$data = array_intersect_key( $data, array_flip( $want ) );
		}

		return new \WP_REST_Response( $data, 200 );
	}

	/**
	 * PUT/PATCH: save grouped settings v2. Body: JSON object { "groupName": { "camelKey": value, ... }, ... }.
	 * Merged onto existing v2 settings, then sanitized. Writes modula_settings_v2 and syncs flat modula-settings.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function update_settings( $request ) {
		$id = (int) $request['id'];

		$title            = '';
		$incoming_preview = $request->get_json_params();
		if ( is_array( $incoming_preview ) && isset( $incoming_preview['postTitle'] ) && is_string( $incoming_preview['postTitle'] ) ) {
			$title = $incoming_preview['postTitle'];
		}

		$prepared = \Modula\V2\Gallery_Post::ensure_persistable( $id, $title );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$id = $prepared;

		\Modula\V2\Meta_Sync::ensure_settings_v2_from_flat( $id );

		$raw = $request->get_body();
		if ( '' === trim( (string) $raw ) ) {
			return new \WP_Error(
				'rest_empty_request',
				__( 'Request body must contain a JSON object of grouped settings.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$incoming = $request->get_json_params();
		if ( ! is_array( $incoming ) ) {
			$decoded = json_decode( $raw, true );
			if ( JSON_ERROR_NONE !== json_last_error() || ! is_array( $decoded ) ) {
				return new \WP_Error(
					'rest_invalid_json',
					__( 'Invalid JSON body. Send a JSON object of settings groups.', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
			}
			$incoming = $decoded;
		}

		foreach ( $incoming as $group => $keys ) {
			if ( ! is_string( $group ) || '' === $group ) {
				return new \WP_Error(
					'rest_invalid_param',
					__( 'Each top-level key must be a non-empty settings group name (string).', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
			}
			if ( null !== $keys && ! is_array( $keys ) ) {
				return new \WP_Error(
					'rest_invalid_param',
					sprintf(
						/* translators: %s: settings group name */
						__( 'Group "%s" must be a JSON object of settings.', 'modula-best-grid-gallery' ),
						$group
					),
					array( 'status' => 400 )
				);
			}
		}

		$existing  = \Modula\V2\Meta_Sync::get_settings_v2( $id );
		$merged    = self::merge_grouped_settings( $existing, $incoming );
		$sanitized = \Modula\V2\Settings\Sanitizer::sanitize_grouped( $merged );

		$json = wp_json_encode( $sanitized, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		update_post_meta( $id, \Modula\V2\Meta_Sync::SETTINGS_V2_META_KEY, wp_slash( false !== $json ? $json : '{}' ) );

		$flat = \Modula\V2\Settings\Adapter::to_flat( $sanitized );
		update_post_meta( $id, 'modula-settings', $flat );

		/**
		 * Fires after gallery settings are saved via the v2 REST settings editor.
		 *
		 * Use this to sync WordPress post fields (e.g. post_password) that are not
		 * stored only in modula-settings / modula_settings_v2.
		 *
		 * @since 3.0.0
		 *
		 * @param int                                 $id        Gallery post ID.
		 * @param array<string, array<string, mixed>> $sanitized Grouped v2 settings.
		 * @param array<string, mixed>                $flat      Flat modula-settings.
		 */
		do_action( 'modula_gallery_settings_v2_updated', $id, $sanitized, $flat );

		$response = array_merge(
			$sanitized,
			\Modula\V2\Gallery_Post::rest_response_meta( $id )
		);

		return new \WP_REST_Response( $response, 200 );
	}

	/**
	 * Merge incoming grouped PATCH into existing grouped settings (per-group shallow key merge).
	 *
	 * @param array<string, array<string, mixed>> $base     Existing grouped settings.
	 * @param array<string, array<string, mixed>> $incoming Incoming grouped overrides.
	 * @return array<string, array<string, mixed>>
	 */
	private static function merge_grouped_settings( array $base, array $incoming ) {
		foreach ( $incoming as $group => $keys ) {
			if ( ! is_string( $group ) || ! is_array( $keys ) ) {
				continue;
			}
			if ( ! isset( $base[ $group ] ) || ! is_array( $base[ $group ] ) ) {
				$base[ $group ] = array();
			}
			$base[ $group ] = array_merge( $base[ $group ], $keys );
		}
		return $base;
	}

	/**
	 * GET gallery images v2.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function get_images( $request ) {
		$id   = (int) $request['id'];
		$data = \Modula\V2\Meta_Sync::get_images_v2( $id );
		if ( ! is_array( $data ) ) {
			$data = array();
		}
		if ( class_exists( '\Modula\Bound_Gallery\Bound_Gallery', false ) ) {
			$data = \Modula\Bound_Gallery\Bound_Gallery::apply_derived_catalog( $id, $data );
		}
		return new \WP_REST_Response( $data, 200 );
	}

	/**
	 * GET full gallery bootstrap payload (grouped settings + processed items) matching shortcode JSON.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_bootstrap( $request ) {
		$id = (int) $request['id'];
		if ( current_user_can( 'edit_post', $id ) ) {
			\Modula\V2\Meta_Sync::ensure_settings_v2_from_flat( $id );
		}

		$align = $request->get_param( 'align' );
		$align = is_string( $align ) ? $align : '';

		$context = $request->get_param( 'context' );
		$context = is_string( $context ) ? sanitize_key( $context ) : 'public';
		if ( 'settings_editor' === $context && ! current_user_can( 'edit_post', $id ) ) {
			$context = 'public';
		}

		$shortcode = new \Modula\V2\Shortcode\Shortcode( false );
		$payload   = $shortcode->get_bootstrap_payload( $id, $align, $context );

		if ( null === $payload ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Gallery not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		return new \WP_REST_Response( $payload, 200 );
	}

	/**
	 * GET paginated, filterable gallery items (modern stack). Applies filters globally, then slices (§6.2 / §12.3).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_items_page( $request ) {
		$id = (int) $request['id'];

		if ( current_user_can( 'edit_post', $id ) ) {
			\Modula\V2\Meta_Sync::ensure_settings_v2_from_flat( $id );
		}

		$grouped = \Modula\V2\Meta_Sync::get_settings_v2( $id );
		if ( empty( $grouped ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Gallery not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$flat               = \Modula\V2\Settings\Adapter::to_flat( $grouped );
		$flat               = wp_parse_args( $flat, \Modula_CPT_Fields_Helper::get_defaults() );
		$flat['gallery_id'] = 'modula-' . $id;
		$flat['type']       = $flat['type'] ?? 'creative-gallery';

		$return_all = (bool) $request->get_param( 'all' );
		$page       = max( 1, (int) $request->get_param( 'page' ) );
		$per        = (int) $request->get_param( 'per_page' );
		if ( $per < 1 ) {
			$per = 12;
		}
		$per = min( 100, $per );

		$filters = \Modula\V2\Images\Catalog_Service::parse_filters_param( $request->get_param( 'filters' ) );

		$shortcode    = new \Modula\V2\Shortcode\Shortcode( false );
		$shuffle_seed = (int) $request->get_param( 'shuffle_seed' );
		if ( $shuffle_seed <= 0 ) {
			$shuffle_seed = null;
		}
		$all = $shortcode->get_gallery_images( $id, $flat, 'public', $shuffle_seed );
		if ( ! is_array( $all ) ) {
			$all = array();
		}

		$filtered = \Modula\V2\Images\Catalog_Service::apply_filters_to_rows( $all, $filters );
		$total    = count( $filtered );

		if ( $return_all ) {
			$slice       = $filtered;
			$page        = 1;
			$per         = $total > 0 ? $total : 1;
			$total_pages = 1;
		} else {
			$total_pages = (int) max( 1, ceil( $total / $per ) );
			$offset      = ( $page - 1 ) * $per;
			$slice       = array_slice( $filtered, $offset, $per );
		}

		$items = $shortcode->build_bootstrap_items_batch( $id, $flat, $slice, $all );

		return new \WP_REST_Response(
			array(
				'items'      => $items,
				'pagination' => array(
					'totalItems'  => $total,
					'totalPages'  => $total_pages,
					'currentPage' => $page,
					'perPage'     => $per,
					'hasMore'     => $page < $total_pages,
				),
			),
			200
		);
	}
}
