<?php
/**
 * Modula v2 REST: gallery listing index.
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Class Listing_Controller
 */
class Listing_Controller {

	const NAMESPACE = 'modula/v2';

	const PAGE_SLUG = 'modula-gallery-listing';

	const VIEW_META_KEY = 'modula_gallery_listing_view';

	/**
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_action( 'trashed_post', array( __CLASS__, 'clear_listing_totals_transient' ) );
		add_action( 'untrashed_post', array( __CLASS__, 'clear_listing_totals_transient' ) );
		add_action( 'before_delete_post', array( __CLASS__, 'clear_listing_totals_transient' ) );
	}

	/**
	 * Drop cached header totals after trash/restore/delete.
	 *
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public static function clear_listing_totals_transient( $post_id ) {
		$post_type = get_post_type( $post_id );
		if ( 'modula-gallery' !== $post_type && 'modula-album' !== $post_type ) {
			return;
		}
		delete_transient( 'modula_v2_listing_totals' );
		delete_transient( 'modula_v2_listing_status_counts' );
		delete_transient( 'modula_v2_galleries_in_albums' );
	}

	/**
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/listing',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_listing' ),
				'permission_callback' => array( __CLASS__, 'check_list_access' ),
				'args'                => array(
					'search'      => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'status'      => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'page'        => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
					),
					'per_page'    => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 20,
						'sanitize_callback' => 'absint',
					),
					'orderby'     => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => 'modified',
						'sanitize_callback' => 'sanitize_key',
					),
					'order'       => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => 'desc',
						'sanitize_callback' => 'sanitize_key',
					),
					'type'        => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					),
					'hasProofing' => array(
						'required' => false,
						'type'     => 'boolean',
						'default'  => false,
					),
					'hasPassword' => array(
						'required' => false,
						'type'     => 'boolean',
						'default'  => false,
					),
					'hasVideos'   => array(
						'required' => false,
						'type'     => 'boolean',
						'default'  => false,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/listing/view',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_listing_view' ),
					'permission_callback' => array( __CLASS__, 'check_list_access' ),
				),
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_listing_view' ),
					'permission_callback' => array( __CLASS__, 'check_list_access' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/listing/(?P<id>\d+)/duplicate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'duplicate_row' ),
				'permission_callback' => array( __CLASS__, 'check_duplicate_access' ),
				'args'                => array(
					'id'   => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
					'type' => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => 'gallery',
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/listing/(?P<id>\d+)/preview',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_listing_row_preview' ),
				'permission_callback' => array( __CLASS__, 'check_preview_access' ),
				'args'                => array(
					'id'   => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
					'type' => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => 'gallery',
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/listing/(?P<id>\d+)/classic-editor-preference',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'mark_classic_editor_preference' ),
				'permission_callback' => array( __CLASS__, 'check_gallery_edit_access' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/listing/(?P<id>\d+)/try-beta',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'try_beta_gallery' ),
				'permission_callback' => array( __CLASS__, 'check_gallery_edit_access' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/listing/(?P<id>\d+)/convert-beta',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'convert_beta_gallery' ),
				'permission_callback' => array( __CLASS__, 'check_gallery_edit_access' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	/**
	 * Admin URL for the gallery listing screen.
	 *
	 * @return string
	 */
	public static function admin_url() {
		return admin_url( 'edit.php?post_type=modula-gallery&page=' . self::PAGE_SLUG );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return bool|\WP_Error
	 */
	public static function check_list_access( $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to list galleries.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return bool|\WP_Error
	 */
	public static function check_duplicate_access( $request ) {
		$id = (int) $request['id'];
		if ( $id < 1 ) {
			return new \WP_Error(
				'rest_invalid_id',
				__( 'Invalid gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to duplicate this item.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return bool|\WP_Error
	 */
	public static function check_preview_access( $request ) {
		$id = (int) $request['id'];
		if ( $id < 1 ) {
			return new \WP_Error(
				'rest_invalid_id',
				__( 'Invalid listing row.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to preview this item.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return bool|\WP_Error
	 */
	public static function check_gallery_edit_access( $request ) {
		$id = (int) $request['id'];
		if ( $id < 1 ) {
			return new \WP_Error(
				'rest_invalid_id',
				__( 'Invalid listing item.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$type = get_post_type( $id );
		if ( 'modula-gallery' !== $type && 'modula-album' !== $type ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Item not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to edit this item.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function mark_classic_editor_preference( $request ) {
		$id   = (int) $request['id'];
		$type = get_post_type( $id );
		if ( 'modula-album' === $type ) {
			if ( \Modula\V2\Beta_Settings::is_beta_album( $id ) ) {
				return new \WP_Error(
					'rest_invalid_gallery',
					__( 'This album already uses the new editor.', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
			}
		} elseif ( \Modula\V2\Beta_Settings::is_beta_gallery( $id ) ) {
			return new \WP_Error(
				'rest_invalid_gallery',
				__( 'This gallery already uses the new editor.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		\Modula\V2\Beta_Settings::mark_classic_editor_preference( $id );
		self::clear_listing_totals_transient( $id );

		return rest_ensure_response(
			array(
				'ok' => true,
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function try_beta_gallery( $request ) {
		$id = (int) $request['id'];
		if ( 'modula-album' === get_post_type( $id ) ) {
			$result = \Modula\V2\Admin\Beta_Gallery_Admin::duplicate_as_beta_album( $id );
		} else {
			$result = \Modula\V2\Admin\Beta_Gallery_Admin::duplicate_as_beta_gallery( $id );
		}
		if ( is_wp_error( $result ) ) {
			$status = (int) $result->get_error_data( 'status' );
			if ( $status < 400 ) {
				$status = 500;
			}
			return new \WP_Error(
				$result->get_error_code(),
				$result->get_error_message(),
				array( 'status' => $status )
			);
		}

		self::clear_listing_totals_transient( $id );

		$edit_url = get_edit_post_link( $result, 'raw' );

		return rest_ensure_response(
			array(
				'id'      => $result,
				'editUrl' => $edit_url ? $edit_url : '',
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function convert_beta_gallery( $request ) {
		$id = (int) $request['id'];
		if ( 'modula-album' === get_post_type( $id ) ) {
			$result = \Modula\V2\Admin\Beta_Gallery_Admin::convert_to_beta_album( $id );
		} else {
			$result = \Modula\V2\Admin\Beta_Gallery_Admin::convert_to_beta_gallery( $id );
		}
		if ( is_wp_error( $result ) ) {
			$status = (int) $result->get_error_data( 'status' );
			if ( $status < 400 ) {
				$status = 500;
			}
			return new \WP_Error(
				$result->get_error_code(),
				$result->get_error_message(),
				array( 'status' => $status )
			);
		}

		self::clear_listing_totals_transient( $id );

		$edit_url = get_edit_post_link( $result, 'raw' );

		return rest_ensure_response(
			array(
				'id'      => $result,
				'editUrl' => $edit_url ? $edit_url : '',
			)
		);
	}

	/**
	 * @param string $type Listing row type.
	 * @return string
	 */
	private static function post_type_for_row_type( $type ) {
		return 'album' === $type ? 'modula-album' : 'modula-gallery';
	}

	/**
	 * Lazy listing row preview (album members or gallery item thumbs).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_listing_row_preview( $request ) {
		$id   = (int) $request['id'];
		$type = (string) $request->get_param( 'type' );
		if ( '' === $type ) {
			$type = 'gallery';
		}

		if ( ! in_array( $type, array( 'gallery', 'album' ), true ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Unsupported listing row type.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		if ( 'album' === $type && ! post_type_exists( 'modula-album' ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Album previews are not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$expected_post_type = self::post_type_for_row_type( $type );
		$post               = get_post( $id );
		if ( ! $post || $expected_post_type !== $post->post_type ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Listing row not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		if ( 'trash' === $post->post_status ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Trash rows have no preview.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( 'album' === $type ) {
			return rest_ensure_response( self::build_album_preview( $post ) );
		}

		return rest_ensure_response( self::build_gallery_preview( $post ) );
	}

	/**
	 * @param \WP_Post $post Album post.
	 * @return array<string, mixed>
	 */
	private static function build_album_preview( $post ) {
		$id      = (int) $post->ID;
		$members = get_post_meta( $id, 'modula-album-galleries', true );
		if ( ! is_array( $members ) ) {
			$members = array();
		}

		$rows  = array();
		$total = 0;
		foreach ( $members as $member ) {
			if ( ! is_array( $member ) || empty( $member['id'] ) || ! is_numeric( $member['id'] ) ) {
				continue;
			}
			$item_type = ! empty( $member['itemType'] ) ? (string) $member['itemType'] : 'modula-gallery';
			if ( 'modula-album' === $item_type ) {
				continue;
			}

			$gallery_id = (int) $member['id'];
			$gallery    = get_post( $gallery_id );
			if ( ! $gallery || 'modula-gallery' !== $gallery->post_type || 'trash' === $gallery->post_status ) {
				continue;
			}
			if ( ! current_user_can( 'edit_post', $gallery_id ) ) {
				continue;
			}

			++$total;
			if ( count( $rows ) >= 8 ) {
				continue;
			}

			$counts        = self::count_gallery_items( $gallery_id );
			$thumbnails    = self::get_gallery_thumbnail_urls( $gallery_id, 1 );
			$edit_url      = get_edit_post_link( $gallery_id, 'raw' );
			$member_status = $gallery->post_status;
			if ( ! in_array( $member_status, array( 'publish', 'draft', 'private' ), true ) ) {
				$member_status = 'draft';
			}
			$rows[]     = array(
				'id'                     => $gallery_id,
				'type'                   => 'gallery',
				'title'                  => self::listing_display_title( $gallery ),
				'thumbnailUrl'           => ! empty( $thumbnails[0] ) ? $thumbnails[0] : '',
				'itemsLabel'             => self::format_gallery_items_label( $counts ),
				'editUrl'                => $edit_url ? $edit_url : '',
				'isBeta'                 => \Modula\V2\Beta_Settings::is_beta_gallery( $gallery_id ),
				'classicEditorPreferred' => \Modula\V2\Beta_Settings::has_classic_editor_preference( $gallery_id ),
				'status'                 => $member_status,
			);
		}

		$edit_url = get_edit_post_link( $id, 'raw' );

		return array(
			'type'    => 'album',
			'id'      => $id,
			'title'   => self::listing_display_title( $post ),
			'editUrl' => $edit_url ? $edit_url : '',
			'total'   => $total,
			'members' => $rows,
		);
	}

	/**
	 * @param \WP_Post $post Gallery post.
	 * @return array<string, mixed>
	 */
	private static function build_gallery_preview( $post ) {
		$id     = (int) $post->ID;
		$counts = self::count_gallery_items( $id );
		$items  = self::get_gallery_preview_items( $id, 8 );
		$edit   = get_edit_post_link( $id, 'raw' );

		return array(
			'type'    => 'gallery',
			'id'      => $id,
			'title'   => self::listing_display_title( $post ),
			'editUrl' => $edit ? $edit : '',
			'total'   => (int) $counts['total'],
			'items'   => $items,
		);
	}

	/**
	 * @param array{images: int, videos: int, galleries: int, total: int} $counts Item counts.
	 * @return string
	 */
	private static function format_gallery_items_label( $counts ) {
		$images = (int) $counts['images'];
		$videos = (int) $counts['videos'];

		if ( $images > 0 && 0 === $videos ) {
			return sprintf(
				/* translators: %d: photo count */
				_n( '%d photo', '%d photos', $images, 'modula-best-grid-gallery' ),
				$images
			);
		}
		if ( $videos > 0 && 0 === $images ) {
			return sprintf(
				/* translators: %d: video count */
				_n( '%d video', '%d videos', $videos, 'modula-best-grid-gallery' ),
				$videos
			);
		}
		if ( $images > 0 && $videos > 0 ) {
			return sprintf(
				/* translators: 1: photo count label, 2: video count label */
				'%1$s · %2$s',
				sprintf(
					/* translators: %d: photo count */
					_n( '%d photo', '%d photos', $images, 'modula-best-grid-gallery' ),
					$images
				),
				sprintf(
					/* translators: %d: video count */
					_n( '%d video', '%d videos', $videos, 'modula-best-grid-gallery' ),
					$videos
				)
			);
		}

		$total = (int) $counts['total'];
		return sprintf(
			/* translators: %d: item count */
			_n( '%d item', '%d items', $total, 'modula-best-grid-gallery' ),
			$total
		);
	}

	/**
	 * @param int $gallery_id Gallery ID.
	 * @param int $limit      Max items.
	 * @return array<int, array{thumbnailUrl: string, kind: string}>
	 */
	private static function get_gallery_preview_items( $gallery_id, $limit = 8 ) {
		$limit  = max( 1, (int) $limit );
		$items  = array();
		$images = get_post_meta( $gallery_id, 'modula-images', true );
		if ( ! is_array( $images ) || empty( $images ) ) {
			if ( class_exists( '\Modula\V2\Meta_Sync', false ) ) {
				$images = \Modula\V2\Meta_Sync::get_images_v2( $gallery_id );
			}
		}
		if ( ! is_array( $images ) ) {
			return $items;
		}

		foreach ( $images as $row ) {
			if ( count( $items ) >= $limit ) {
				break;
			}
			if ( ! is_array( $row ) || ! isset( $row['id'] ) ) {
				continue;
			}

			$id_raw = (string) $row['id'];
			$kind   = 0 === strpos( $id_raw, 'video_' ) ? 'video' : 'image';
			$url    = '';

			if ( is_numeric( $row['id'] ) ) {
				$src = wp_get_attachment_image_src( (int) $row['id'], 'thumbnail' );
				if ( $src && ! empty( $src[0] ) ) {
					$url = $src[0];
				}
			} elseif ( ! empty( $row['video_thumbnail'] ) && is_string( $row['video_thumbnail'] ) ) {
				$url = $row['video_thumbnail'];
			}

			if ( '' === $url ) {
				continue;
			}

			$items[] = array(
				'thumbnailUrl' => $url,
				'kind'         => $kind,
			);
		}

		return $items;
	}

	/**
	 * Duplicate a listing row via the existing gallery duplicator.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function duplicate_row( $request ) {
		$id   = (int) $request['id'];
		$type = (string) $request->get_param( 'type' );
		if ( '' === $type ) {
			$type = 'gallery';
		}

		if ( ! in_array( $type, array( 'gallery', 'album' ), true ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Unsupported listing row type.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		if ( 'album' === $type && ! post_type_exists( 'modula-album' ) ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Album duplicates are not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$expected_post_type = self::post_type_for_row_type( $type );
		$post               = get_post( $id );
		if ( ! $post || $expected_post_type !== $post->post_type ) {
			return new \WP_Error(
				'rest_not_found',
				__( 'Listing row not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		if ( ! function_exists( 'modula_duplicate_gallery_create_duplicate' ) ) {
			$functions = MODULA_PATH . 'includes/features/duplicator/modula-duplicator-functions.php';
			if ( file_exists( $functions ) ) {
				require_once $functions;
			}
		}
		if ( ! function_exists( 'modula_duplicate_gallery_create_duplicate' ) ) {
			return new \WP_Error(
				'rest_duplicate_unavailable',
				__( 'Gallery duplicator is not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		$new_id = modula_duplicate_gallery_create_duplicate( $post, '' );
		if ( ! $new_id || is_wp_error( $new_id ) ) {
			return new \WP_Error(
				'rest_duplicate_failed',
				__( 'Could not duplicate listing row.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		delete_transient( 'modula_v2_listing_totals' );
		delete_transient( 'modula_v2_listing_status_counts' );

		$edit_url = get_edit_post_link( (int) $new_id, 'raw' );

		return rest_ensure_response(
			array(
				'id'      => (int) $new_id,
				'editUrl' => $edit_url ? $edit_url : '',
			)
		);
	}

	/**
	 * GET mixed listing document (galleries in ticket 01; albums when CPT exists later).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function get_listing( $request ) {
		$page         = max( 1, (int) $request->get_param( 'page' ) );
		$per_page     = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ) );
		$orderby      = (string) $request->get_param( 'orderby' );
		$order        = strtolower( (string) $request->get_param( 'order' ) ) === 'asc' ? 'ASC' : 'DESC';
		$search       = (string) $request->get_param( 'search' );
		$status       = (string) $request->get_param( 'status' );
		$row_type     = (string) $request->get_param( 'type' );
		$has_proofing = rest_sanitize_boolean( $request->get_param( 'hasProofing' ) );
		$has_password = rest_sanitize_boolean( $request->get_param( 'hasPassword' ) );
		$has_videos   = rest_sanitize_boolean( $request->get_param( 'hasVideos' ) );

		if ( 'album' === $row_type && ! post_type_exists( 'modula-album' ) ) {
			$meta = self::get_listing_index_meta();
			return rest_ensure_response(
				array(
					'rows'         => array(),
					'pagination'   => array(
						'total'   => 0,
						'pages'   => 0,
						'page'    => $page,
						'perPage' => $per_page,
					),
					'totals'       => $meta['totals'],
					'stack'        => $meta['stack'],
					'statusCounts' => self::get_listing_status_counts(),
				)
			);
		}

		if ( ! in_array( $orderby, array( 'date', 'title', 'modified' ), true ) ) {
			$orderby = 'modified';
		}

		$post_status = self::resolve_post_status( $status );
		if ( 'album' === $row_type ) {
			$post_types = 'modula-album';
		} elseif ( 'gallery' === $row_type ) {
			$post_types = 'modula-gallery';
		} elseif ( post_type_exists( 'modula-album' ) ) {
			$post_types = array( 'modula-gallery', 'modula-album' );
		} else {
			$post_types = 'modula-gallery';
		}

		$query_args = array(
			'post_type'              => $post_types,
			'post_status'            => $post_status,
			'posts_per_page'         => $per_page,
			'paged'                  => $page,
			'orderby'                => $orderby,
			'order'                  => $order,
			'ignore_sticky_posts'    => true,
			'no_found_rows'          => false,
			'update_post_meta_cache' => true,
			'update_post_term_cache' => false,
		);

		if ( $has_password ) {
			$query_args['modula_listing_has_password'] = true;
			add_filter( 'posts_where', array( __CLASS__, 'filter_posts_where_has_password' ), 10, 2 );
		}

		if ( $has_videos ) {
			$query_args['meta_query'][] = array(
				'key'     => 'modula-images',
				'value'   => 'video_',
				'compare' => 'LIKE',
			);
		}

		if ( $has_proofing ) {
			$query_args['modula_listing_has_proofing'] = true;
			add_filter( 'posts_clauses', array( __CLASS__, 'filter_posts_clauses_has_proofing' ), 10, 2 );
		}

		if ( '' !== $search ) {
			$query_args['s'] = $search;
			if ( ctype_digit( $search ) && (int) $search > 0 ) {
				$id_search = (int) $search;
				add_filter(
					'posts_search',
					static function ( $search_sql, $wp_query ) use ( $id_search ) {
						global $wpdb;
						if ( ! $wp_query->get( 'modula_listing_id_or' ) ) {
							return $search_sql;
						}
						$id_clause = $wpdb->prepare( "{$wpdb->posts}.ID = %d", $id_search );
						if ( '' === trim( (string) $search_sql ) ) {
							return " AND ({$id_clause}) ";
						}
						$inner = preg_replace( '/^\s*AND\s+/i', '', (string) $search_sql, 1 );
						return " AND ( ({$id_clause}) OR ({$inner}) ) ";
					},
					10,
					2
				);
				$query_args['modula_listing_id_or'] = true;
			}
		}

		$query = new \WP_Query( $query_args );

		if ( $has_password ) {
			remove_filter( 'posts_where', array( __CLASS__, 'filter_posts_where_has_password' ), 10 );
		}
		if ( $has_proofing ) {
			remove_filter( 'posts_clauses', array( __CLASS__, 'filter_posts_clauses_has_proofing' ), 10 );
		}

		$rows         = array();
		$in_album_map = array();
		if ( post_type_exists( 'modula-album' ) ) {
			$in_album_map = array_flip( self::get_gallery_ids_in_albums() );
		}
		foreach ( $query->posts as $post ) {
			if ( 'modula-album' === $post->post_type ) {
				$rows[] = self::build_album_row( $post );
				continue;
			}
			$rows[] = self::build_gallery_row(
				$post,
				isset( $in_album_map[ (int) $post->ID ] )
			);
		}

		$meta = self::get_listing_index_meta();

		return rest_ensure_response(
			array(
				'rows'         => $rows,
				'pagination'   => array(
					'total'   => (int) $query->found_posts,
					'pages'   => (int) $query->max_num_pages,
					'page'    => $page,
					'perPage' => $per_page,
				),
				'totals'       => $meta['totals'],
				'stack'        => $meta['stack'],
				'statusCounts' => self::get_listing_status_counts(),
			)
		);
	}

	/**
	 * GET persisted gallery listing view for the current user.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_listing_view() {
		$user_id = get_current_user_id();
		$stored  = get_user_meta( $user_id, self::VIEW_META_KEY, true );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		return rest_ensure_response( self::sanitize_persisted_view( $stored ) );
	}

	/**
	 * PUT persisted gallery listing view for the current user.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function update_listing_view( $request ) {
		$params    = $request->get_json_params();
		$sanitized = self::sanitize_persisted_view( is_array( $params ) ? $params : array() );
		update_user_meta( get_current_user_id(), self::VIEW_META_KEY, $sanitized );
		return rest_ensure_response( $sanitized );
	}

	/**
	 * @param array<string, mixed> $view Raw view payload.
	 * @return array<string, mixed>
	 */
	private static function sanitize_persisted_view( $view ) {
		$clean = array();

		if ( isset( $view['type'] ) && in_array( $view['type'], array( 'table', 'grid' ), true ) ) {
			$clean['type'] = $view['type'];
		}

		if ( isset( $view['fields'] ) && is_array( $view['fields'] ) ) {
			$clean['fields'] = array_values(
				array_filter(
					array_map( 'sanitize_key', $view['fields'] )
				)
			);
		}

		if ( isset( $view['sort'] ) && is_array( $view['sort'] ) ) {
			$field = isset( $view['sort']['field'] ) ? sanitize_key( $view['sort']['field'] ) : '';
			$dir   = isset( $view['sort']['direction'] ) ? strtolower( (string) $view['sort']['direction'] ) : 'desc';
			if ( '' !== $field ) {
				$clean['sort'] = array(
					'field'     => $field,
					'direction' => 'asc' === $dir ? 'asc' : 'desc',
				);
			}
		}

		if ( isset( $view['perPage'] ) ) {
			$clean['perPage'] = min( 100, max( 1, (int) $view['perPage'] ) );
		}

		if ( isset( $view['layout'] ) && is_array( $view['layout'] ) ) {
			$clean['layout'] = $view['layout'];
		}

		if ( ! empty( $view['titleField'] ) ) {
			$clean['titleField'] = sanitize_key( $view['titleField'] );
		}

		if ( ! empty( $view['mediaField'] ) ) {
			$clean['mediaField'] = sanitize_key( $view['mediaField'] );
		}

		return $clean;
	}

	/**
	 * @param string    $where   WHERE clause.
	 * @param \WP_Query $query   Query.
	 * @return string
	 */
	public static function filter_posts_where_has_password( $where, $query ) {
		if ( ! $query->get( 'modula_listing_has_password' ) ) {
			return $where;
		}
		global $wpdb;
		return $where . " AND {$wpdb->posts}.post_password != ''";
	}

	/**
	 * @param array     $clauses Query clauses.
	 * @param \WP_Query $query   Query.
	 * @return array
	 */
	public static function filter_posts_clauses_has_proofing( $clauses, $query ) {
		if ( ! $query->get( 'modula_listing_has_proofing' ) ) {
			return $clauses;
		}
		global $wpdb;
		$clauses['join']  .= " LEFT JOIN {$wpdb->postmeta} AS modula_proofing_flat ON ({$wpdb->posts}.ID = modula_proofing_flat.post_id AND modula_proofing_flat.meta_key = 'modula-settings')";
		$clauses['join']  .= " LEFT JOIN {$wpdb->postmeta} AS modula_proofing_v2 ON ({$wpdb->posts}.ID = modula_proofing_v2.post_id AND modula_proofing_v2.meta_key = 'modula_settings_v2')";
		$clauses['where'] .= " AND ( modula_proofing_flat.meta_value LIKE '%\"image_proofing\";i:1%' OR modula_proofing_flat.meta_value LIKE '%\"image_proofing\";s:1:\"1\"%' OR modula_proofing_v2.meta_value LIKE '%\"enabled\";b:1%' OR modula_proofing_v2.meta_value LIKE '%\"image_proofing\";b:1%' OR modula_proofing_v2.meta_value LIKE '%\"image_proofing\";i:1%' )";
		return $clauses;
	}

	/**
	 * @param string $status Request status (single or comma-separated).
	 * @return string|string[]
	 */
	private static function resolve_post_status( $status ) {
		if ( '' === $status ) {
			return array( 'publish', 'draft', 'private' );
		}
		$parts   = array_filter( array_map( 'sanitize_key', explode( ',', $status ) ) );
		$allowed = array( 'publish', 'draft', 'private', 'trash', 'pending', 'future' );
		$parts   = array_values( array_intersect( $parts, $allowed ) );
		if ( empty( $parts ) ) {
			return array( 'publish', 'draft', 'private' );
		}
		if ( 1 === count( $parts ) ) {
			return $parts[0];
		}
		return $parts;
	}

	/**
	 * Header totals plus mixed-stack flags for the listing index.
	 *
	 * @return array{totals: array{rows: int, items: int}, stack: array{hasClassicGalleries: bool, hasBetaGalleries: bool}}
	 */
	private static function get_listing_index_meta() {
		$totals = self::get_listing_totals();
		return array(
			'totals' => array(
				'rows'  => (int) $totals['rows'],
				'items' => (int) $totals['items'],
			),
			'stack'  => array(
				'hasClassicGalleries' => ! empty( $totals['hasClassicGalleries'] ),
				'hasBetaGalleries'    => ! empty( $totals['hasBetaGalleries'] ),
			),
		);
	}

	/**
	 * Non-trash listing totals for the header.
	 *
	 * @return array{rows: int, items: int, hasClassicGalleries: bool, hasBetaGalleries: bool}
	 */
	private static function get_listing_totals() {
		$cached = get_transient( 'modula_v2_listing_totals' );
		if (
			is_array( $cached )
			&& isset( $cached['rows'], $cached['items'], $cached['hasClassicGalleries'], $cached['hasBetaGalleries'] )
		) {
			return $cached;
		}

		$counts = wp_count_posts( 'modula-gallery' );
		$rows   = 0;
		foreach ( array( 'publish', 'draft', 'private', 'pending', 'future' ) as $st ) {
			if ( isset( $counts->$st ) ) {
				$rows += (int) $counts->$st;
			}
		}

		$item_total  = 0;
		$has_classic = false;
		$has_beta    = false;
		$ids         = get_posts(
			array(
				'post_type'              => 'modula-gallery',
				'post_status'            => array( 'publish', 'draft', 'private', 'pending', 'future' ),
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);
		foreach ( $ids as $id ) {
			$gallery_id  = (int) $id;
			$counts_row  = self::count_gallery_items( $gallery_id );
			$item_total += $counts_row['total'];
			if ( \Modula\V2\Beta_Settings::is_beta_gallery( $gallery_id ) ) {
				$has_beta = true;
			} else {
				$has_classic = true;
			}
		}

		if ( post_type_exists( 'modula-album' ) ) {
			$album_counts = wp_count_posts( 'modula-album' );
			foreach ( array( 'publish', 'draft', 'private', 'pending', 'future' ) as $st ) {
				if ( isset( $album_counts->$st ) ) {
					$rows += (int) $album_counts->$st;
				}
			}

			$album_ids = get_posts(
				array(
					'post_type'              => 'modula-album',
					'post_status'            => array( 'publish', 'draft', 'private', 'pending', 'future' ),
					'posts_per_page'         => -1,
					'fields'                 => 'ids',
					'no_found_rows'          => true,
					'update_post_meta_cache' => true,
					'update_post_term_cache' => false,
				)
			);
			foreach ( $album_ids as $album_id ) {
				$item_total += self::count_album_items( (int) $album_id )['total'];
			}
		}

		$totals = array(
			'rows'                => $rows,
			'items'               => $item_total,
			'hasClassicGalleries' => $has_classic,
			'hasBetaGalleries'    => $has_beta,
		);
		set_transient( 'modula_v2_listing_totals', $totals, 2 * MINUTE_IN_SECONDS );

		return $totals;
	}

	/**
	 * Row counts per status for the listing status filter menu.
	 *
	 * @return array{everything: int, publish: int, draft: int, private: int, trash: int}
	 */
	private static function get_listing_status_counts() {
		$cached = get_transient( 'modula_v2_listing_status_counts' );
		if ( is_array( $cached ) && isset( $cached['everything'] ) ) {
			return $cached;
		}

		$post_types = array( 'modula-gallery' );
		if ( post_type_exists( 'modula-album' ) ) {
			$post_types[] = 'modula-album';
		}

		$counts = array(
			'everything' => 0,
			'publish'    => 0,
			'draft'      => 0,
			'private'    => 0,
			'trash'      => 0,
		);

		foreach ( $post_types as $post_type ) {
			$post_counts = wp_count_posts( $post_type );
			foreach ( array( 'publish', 'draft', 'private', 'trash' ) as $status ) {
				if ( isset( $post_counts->$status ) ) {
					$counts[ $status ] += (int) $post_counts->$status;
				}
			}
		}

		$counts['everything'] = $counts['publish'] + $counts['draft'] + $counts['private'];

		set_transient( 'modula_v2_listing_status_counts', $counts, 2 * MINUTE_IN_SECONDS );

		return $counts;
	}

	/**
	 * Gallery post IDs referenced by at least one album (non-trash albums).
	 *
	 * @return int[]
	 */
	private static function get_gallery_ids_in_albums() {
		$cached = get_transient( 'modula_v2_galleries_in_albums' );
		if ( is_array( $cached ) ) {
			return array_map( 'intval', $cached );
		}

		$gallery_ids = array();
		if ( ! post_type_exists( 'modula-album' ) ) {
			set_transient( 'modula_v2_galleries_in_albums', $gallery_ids, 2 * MINUTE_IN_SECONDS );
			return $gallery_ids;
		}

		$album_ids = get_posts(
			array(
				'post_type'              => 'modula-album',
				'post_status'            => array( 'publish', 'draft', 'private' ),
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		foreach ( $album_ids as $album_id ) {
			$members = get_post_meta( (int) $album_id, 'modula-album-galleries', true );
			if ( ! is_array( $members ) ) {
				continue;
			}
			foreach ( $members as $member ) {
				if ( ! is_array( $member ) || empty( $member['id'] ) || ! is_numeric( $member['id'] ) ) {
					continue;
				}
				$item_type = ! empty( $member['itemType'] ) ? (string) $member['itemType'] : 'modula-gallery';
				if ( 'modula-album' === $item_type ) {
					continue;
				}
				$gallery_ids[ (int) $member['id'] ] = true;
			}
		}

		$result = array_map( 'intval', array_keys( $gallery_ids ) );
		set_transient( 'modula_v2_galleries_in_albums', $result, 2 * MINUTE_IN_SECONDS );

		return $result;
	}

	/**
	 * Listing row / preview title: authored text, not wptexturize HTML entities.
	 *
	 * @param \WP_Post $post Gallery or album post.
	 * @return string
	 */
	private static function listing_display_title( $post ) {
		$raw   = ( $post instanceof \WP_Post ) ? (string) $post->post_title : '';
		$title = html_entity_decode( $raw, ENT_QUOTES, 'UTF-8' );
		$title = trim( wp_strip_all_tags( $title ) );
		if ( '' === $title ) {
			return __( '(no title)', 'modula-best-grid-gallery' );
		}
		return $title;
	}

	/**
	 * @param \WP_Post $post     Gallery post.
	 * @param bool     $in_album Whether the gallery is referenced by an album.
	 * @return array<string, mixed>
	 */
	private static function build_gallery_row( $post, $in_album = false ) {
		$id           = (int) $post->ID;
		$item_counts  = self::count_gallery_items( $id );
		$thumbnails   = self::get_gallery_thumbnail_urls( $id, 3 );
		$layout_label = self::get_layout_label( $id );
		$author       = self::get_author_payload( (int) $post->post_author );
		$status       = $post->post_status;
		if ( ! in_array( $status, array( 'publish', 'draft', 'private', 'trash' ), true ) ) {
			$status = 'draft';
		}

		$restore_status = '';
		if ( 'trash' === $status ) {
			$meta_status    = get_post_meta( $id, '_wp_trash_meta_status', true );
			$restore_status = is_string( $meta_status ) && '' !== $meta_status
				? sanitize_key( $meta_status )
				: 'draft';
			if ( ! in_array( $restore_status, array( 'publish', 'draft', 'private' ), true ) ) {
				$restore_status = 'draft';
			}
		}

		$shortcode_rows = self::get_gallery_shortcode_rows( $id );
		$shortcode      = ! empty( $shortcode_rows[0]['code'] )
			? (string) $shortcode_rows[0]['code']
			: sprintf( '[modula id="%d"]', $id );

		return array(
			'id'                     => $id,
			'type'                   => 'gallery',
			'title'                  => self::listing_display_title( $post ),
			'status'                 => $status,
			'isBeta'                 => \Modula\V2\Beta_Settings::is_beta_gallery( $id ),
			'classicEditorPreferred' => \Modula\V2\Beta_Settings::has_classic_editor_preference( $id ),
			'hasPassword'            => '' !== (string) $post->post_password,
			'hasProofing'            => self::gallery_has_proofing( $id ),
			'inAlbum'                => (bool) $in_album,
			'thumbnailUrl'           => ! empty( $thumbnails[0] ) ? $thumbnails[0] : '',
			'thumbnailUrls'          => $thumbnails,
			'layoutLabel'            => $layout_label,
			'items'                  => $item_counts,
			'shortcode'              => $shortcode,
			'shortcodes'             => array(
				'rows' => $shortcode_rows,
			),
			'updatedAt'              => gmdate( 'c', strtotime( $post->post_modified_gmt . ' UTC' ) ),
			'createdAt'              => gmdate( 'c', strtotime( $post->post_date_gmt . ' UTC' ) ),
			'author'                 => $author,
			'editUrl'                => get_edit_post_link( $id, 'raw' ) ? get_edit_post_link( $id, 'raw' ) : '',
			'viewUrl'                => get_permalink( $id ) ? get_permalink( $id ) : '',
			'canEdit'                => current_user_can( 'edit_post', $id ),
			'canDelete'              => current_user_can( 'delete_post', $id ),
			'restoreStatus'          => $restore_status,
		);
	}

	/**
	 * @param \WP_Post $post Album post.
	 * @return array<string, mixed>
	 */
	private static function build_album_row( $post ) {
		$id           = (int) $post->ID;
		$item_counts  = self::count_album_items( $id );
		$members      = get_post_meta( $id, 'modula-album-galleries', true );
		$thumbnails   = self::get_album_thumbnail_urls( $id, is_array( $members ) ? $members : array(), 3 );
		$layout_label = self::get_album_layout_label( $id );
		$author       = self::get_author_payload( (int) $post->post_author );
		$status       = $post->post_status;
		if ( ! in_array( $status, array( 'publish', 'draft', 'private', 'trash' ), true ) ) {
			$status = 'draft';
		}

		$restore_status = '';
		if ( 'trash' === $status ) {
			$meta_status    = get_post_meta( $id, '_wp_trash_meta_status', true );
			$restore_status = is_string( $meta_status ) && '' !== $meta_status
				? sanitize_key( $meta_status )
				: 'draft';
			if ( ! in_array( $restore_status, array( 'publish', 'draft', 'private' ), true ) ) {
				$restore_status = 'draft';
			}
		}

		$shortcode      = sprintf( '[modula-album id="%d"]', $id );
		$shortcode_rows = array(
			array(
				'id'          => 'modula-album',
				'label'       => __( 'Embed album', 'modula-best-grid-gallery' ),
				'code'        => $shortcode,
				'description' => '',
			),
		);

		return array(
			'id'                     => $id,
			'type'                   => 'album',
			'title'                  => self::listing_display_title( $post ),
			'status'                 => $status,
			'isBeta'                 => \Modula\V2\Beta_Settings::is_beta_album( $id ),
			'classicEditorPreferred' => \Modula\V2\Beta_Settings::has_classic_editor_preference( $id ),
			'hasPassword'            => '' !== (string) $post->post_password,
			'hasProofing'            => false,
			'inAlbum'                => false,
			'thumbnailUrl'           => ! empty( $thumbnails[0] ) ? $thumbnails[0] : '',
			'thumbnailUrls'          => $thumbnails,
			'layoutLabel'            => $layout_label,
			'items'                  => $item_counts,
			'shortcode'              => $shortcode,
			'shortcodes'             => array(
				'rows' => $shortcode_rows,
			),
			'updatedAt'              => gmdate( 'c', strtotime( $post->post_modified_gmt . ' UTC' ) ),
			'createdAt'              => gmdate( 'c', strtotime( $post->post_date_gmt . ' UTC' ) ),
			'author'                 => $author,
			'editUrl'                => get_edit_post_link( $id, 'raw' ) ? get_edit_post_link( $id, 'raw' ) : '',
			'viewUrl'                => get_permalink( $id ) ? get_permalink( $id ) : '',
			'canEdit'                => current_user_can( 'edit_post', $id ),
			'canDelete'              => current_user_can( 'delete_post', $id ),
			'restoreStatus'          => $restore_status,
		);
	}

	/**
	 * Gallery shortcode rows for the listing shortcode cell (same source as gallery editor).
	 *
	 * @param int $gallery_id Gallery ID.
	 * @return list<array{id:string,label:string,code:string,description:string}>
	 */
	private static function get_gallery_shortcode_rows( $gallery_id ) {
		$gallery_id = (int) $gallery_id;
		if ( $gallery_id < 1 ) {
			return array();
		}

		if ( class_exists( '\Modula\V2\Admin\Settings_Editor_Metabox', false ) ) {
			$rows = \Modula\V2\Admin\Settings_Editor_Metabox::get_gallery_shortcode_rows_for_editor( $gallery_id );
			if ( is_array( $rows ) && ! empty( $rows ) ) {
				return array_values( $rows );
			}
		}

		return array(
			array(
				'id'          => 'modula',
				'label'       => __( 'Embed gallery', 'modula-best-grid-gallery' ),
				'code'        => sprintf( '[modula id="%d"]', $gallery_id ),
				'description' => '',
			),
		);
	}

	/**
	 * @param int $album_id Album ID.
	 * @return array{images: int, videos: int, galleries: int, total: int}
	 */
	private static function count_album_items( $album_id ) {
		$members = get_post_meta( $album_id, 'modula-album-galleries', true );
		if ( ! is_array( $members ) ) {
			return array(
				'images'    => 0,
				'videos'    => 0,
				'galleries' => 0,
				'total'     => 0,
			);
		}

		$galleries = 0;
		foreach ( $members as $member ) {
			if ( ! is_array( $member ) ) {
				continue;
			}
			++$galleries;
		}

		return array(
			'images'    => 0,
			'videos'    => 0,
			'galleries' => $galleries,
			'total'     => $galleries,
		);
	}

	/**
	 * @param int               $album_id Album ID.
	 * @param array<int, mixed> $members  Album members meta.
	 * @param int               $limit    Max URLs to return.
	 * @return string[]
	 */
	private static function get_album_thumbnail_urls( $album_id, $members, $limit = 3 ) {
		$limit = max( 1, (int) $limit );
		$urls  = array();

		$thumb_id = get_post_thumbnail_id( $album_id );
		if ( $thumb_id ) {
			$src = wp_get_attachment_image_src( (int) $thumb_id, 'thumbnail' );
			if ( $src && ! empty( $src[0] ) ) {
				$urls[] = $src[0];
			}
		}

		foreach ( $members as $member ) {
			if ( count( $urls ) >= $limit ) {
				break;
			}
			$url = self::get_album_member_thumbnail_url( $member );
			if ( $url && ! in_array( $url, $urls, true ) ) {
				$urls[] = $url;
			}
		}

		if ( count( $urls ) < $limit ) {
			foreach ( $members as $member ) {
				if ( count( $urls ) >= $limit ) {
					break;
				}
				if ( ! is_array( $member ) || empty( $member['id'] ) || ! is_numeric( $member['id'] ) ) {
					continue;
				}
				$item_type = ! empty( $member['itemType'] ) ? (string) $member['itemType'] : 'modula-gallery';
				if ( 'modula-album' === $item_type ) {
					continue;
				}
				$extra = self::get_gallery_thumbnail_urls( (int) $member['id'], $limit );
				foreach ( $extra as $url ) {
					if ( count( $urls ) >= $limit ) {
						break;
					}
					if ( ! in_array( $url, $urls, true ) ) {
						$urls[] = $url;
					}
				}
			}
		}

		return array_values( array_slice( $urls, 0, $limit ) );
	}

	/**
	 * @param int               $album_id Album ID.
	 * @param array<int, mixed> $members  Album members meta.
	 * @return string
	 */
	private static function get_album_thumbnail_url( $album_id, $members ) {
		$urls = self::get_album_thumbnail_urls( $album_id, $members, 1 );
		return ! empty( $urls[0] ) ? $urls[0] : '';
	}

	/**
	 * Resolve a thumbnail for one album member (gallery or nested album).
	 *
	 * @param mixed $member Album member meta row.
	 * @return string
	 */
	private static function get_album_member_thumbnail_url( $member ) {
		if ( ! is_array( $member ) ) {
			return '';
		}

		if ( ! empty( $member['coverThumb'] ) && is_string( $member['coverThumb'] ) ) {
			return $member['coverThumb'];
		}
		if ( ! empty( $member['thumb']['thumbnail'] ) && is_string( $member['thumb']['thumbnail'] ) ) {
			return $member['thumb']['thumbnail'];
		}
		if ( ! empty( $member['coverURL'] ) && is_string( $member['coverURL'] ) ) {
			return $member['coverURL'];
		}
		if ( ! empty( $member['thumb']['full'] ) && is_string( $member['thumb']['full'] ) ) {
			return $member['thumb']['full'];
		}

		if ( empty( $member['id'] ) || ! is_numeric( $member['id'] ) ) {
			return '';
		}

		$member_id = (int) $member['id'];
		$item_type = ! empty( $member['itemType'] ) ? (string) $member['itemType'] : 'modula-gallery';

		if ( 'modula-album' === $item_type ) {
			$nested_thumb_id = get_post_thumbnail_id( $member_id );
			if ( $nested_thumb_id ) {
				$src = wp_get_attachment_image_src( (int) $nested_thumb_id, 'thumbnail' );
				if ( $src && ! empty( $src[0] ) ) {
					return $src[0];
				}
			}

			if ( function_exists( 'modula_get_ablum_images_recursive' ) ) {
				$images = modula_get_ablum_images_recursive( $member_id );
				if ( is_array( $images ) ) {
					foreach ( $images as $row ) {
						if ( ! is_array( $row ) || empty( $row['id'] ) || ! is_numeric( $row['id'] ) ) {
							continue;
						}
						$src = wp_get_attachment_image_src( (int) $row['id'], 'thumbnail' );
						if ( $src && ! empty( $src[0] ) ) {
							return $src[0];
						}
					}
				}
			}

			$nested_members = get_post_meta( $member_id, 'modula-album-galleries', true );
			if ( is_array( $nested_members ) ) {
				foreach ( $nested_members as $nested_member ) {
					$url = self::get_album_member_thumbnail_url( $nested_member );
					if ( $url ) {
						return $url;
					}
				}
			}

			return '';
		}

		return self::get_first_thumbnail_url( $member_id );
	}

	/**
	 * @param int $album_id Album ID.
	 * @return string
	 */
	private static function get_album_layout_label( $album_id ) {
		$settings = get_post_meta( $album_id, 'modula-album-settings', true );
		$type     = '';
		if ( is_array( $settings ) ) {
			if ( ! empty( $settings['album_type'] ) ) {
				$type = (string) $settings['album_type'];
			} elseif ( ! empty( $settings['type'] ) ) {
				$type = (string) $settings['type'];
			}
		}

		$labels = array(
			'grid'        => __( 'Grid', 'modula-best-grid-gallery' ),
			'custom-grid' => __( 'Custom grid', 'modula-best-grid-gallery' ),
		);
		if ( isset( $labels[ $type ] ) ) {
			return $labels[ $type ];
		}
		if ( '' !== $type ) {
			return $type;
		}
		return __( 'Album', 'modula-best-grid-gallery' );
	}

	/**
	 * @param int $gallery_id Gallery ID.
	 * @return array{images: int, videos: int, galleries: int, total: int}
	 */
	private static function count_gallery_items( $gallery_id ) {
		$images = get_post_meta( $gallery_id, 'modula-images', true );
		if ( ! is_array( $images ) ) {
			return array(
				'images'    => 0,
				'videos'    => 0,
				'galleries' => 0,
				'total'     => 0,
			);
		}
		$image_count = 0;
		$video_count = 0;
		foreach ( $images as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['id'] ) ) {
				continue;
			}
			$id = (string) $row['id'];
			if ( 0 === strpos( $id, 'video_' ) ) {
				++$video_count;
			} else {
				++$image_count;
			}
		}
		return array(
			'images'    => $image_count,
			'videos'    => $video_count,
			'galleries' => 0,
			'total'     => $image_count + $video_count,
		);
	}

	/**
	 * @param int $gallery_id Gallery ID.
	 * @param int $limit      Max URLs to return.
	 * @return string[]
	 */
	private static function get_gallery_thumbnail_urls( $gallery_id, $limit = 3 ) {
		$limit = max( 1, (int) $limit );
		$urls  = array();

		$featured_id = get_post_thumbnail_id( $gallery_id );
		if ( $featured_id ) {
			$src = wp_get_attachment_image_src( (int) $featured_id, 'thumbnail' );
			if ( $src && ! empty( $src[0] ) ) {
				$urls[] = $src[0];
			}
		}

		$images = get_post_meta( $gallery_id, 'modula-images', true );
		if ( ! is_array( $images ) || empty( $images ) ) {
			if ( class_exists( '\Modula\V2\Meta_Sync', false ) ) {
				$images = \Modula\V2\Meta_Sync::get_images_v2( $gallery_id );
			}
		}
		if ( ! is_array( $images ) ) {
			return array_values( array_slice( $urls, 0, $limit ) );
		}

		foreach ( $images as $row ) {
			if ( count( $urls ) >= $limit ) {
				break;
			}
			if ( ! is_array( $row ) || ! isset( $row['id'] ) ) {
				continue;
			}
			$id = $row['id'];
			if ( is_numeric( $id ) ) {
				$src = wp_get_attachment_image_src( (int) $id, 'thumbnail' );
				if ( $src && ! empty( $src[0] ) && ! in_array( $src[0], $urls, true ) ) {
					$urls[] = $src[0];
					continue;
				}
			}
			if ( ! empty( $row['video_thumbnail'] ) && is_string( $row['video_thumbnail'] ) ) {
				$video_url = $row['video_thumbnail'];
				if ( ! in_array( $video_url, $urls, true ) ) {
					$urls[] = $video_url;
				}
			}
		}

		return array_values( array_slice( $urls, 0, $limit ) );
	}

	/**
	 * @param int $gallery_id Gallery ID.
	 * @return string
	 */
	private static function get_first_thumbnail_url( $gallery_id ) {
		$urls = self::get_gallery_thumbnail_urls( $gallery_id, 1 );
		return ! empty( $urls[0] ) ? $urls[0] : '';
	}

	/**
	 * @param int $gallery_id Gallery ID.
	 * @return string
	 */
	private static function get_layout_label( $gallery_id ) {
		$type = '';
		if ( class_exists( '\Modula\V2\Meta_Sync', false ) ) {
			$v2 = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id );
			if ( is_array( $v2 ) && isset( $v2['general']['type'] ) && is_string( $v2['general']['type'] ) ) {
				$type = $v2['general']['type'];
			}
		}
		if ( '' === $type ) {
			$flat = get_post_meta( $gallery_id, 'modula-settings', true );
			if ( is_array( $flat ) && isset( $flat['type'] ) ) {
				$type = (string) $flat['type'];
			}
		}
		if ( '' === $type ) {
			return '';
		}
		$labels = array(
			'creative-gallery' => __( 'Creative', 'modula-best-grid-gallery' ),
			'custom-grid'      => __( 'Custom grid', 'modula-best-grid-gallery' ),
			'grid'             => __( 'Grid', 'modula-best-grid-gallery' ),
			'masonry'          => __( 'Masonry', 'modula-best-grid-gallery' ),
			'slider'           => __( 'Slider', 'modula-best-grid-gallery' ),
			'video'            => __( 'Video', 'modula-best-grid-gallery' ),
			'bnb'              => __( 'BnB', 'modula-best-grid-gallery' ),
			'showcase'         => __( 'Showcase', 'modula-best-grid-gallery' ),
			'story'            => __( 'Story', 'modula-best-grid-gallery' ),
			'polaroid'         => __( 'Polaroid', 'modula-best-grid-gallery' ),
			'fit-grid'         => __( 'Fit grid', 'modula-best-grid-gallery' ),
			'uniform-grid'     => __( 'Uniform grid', 'modula-best-grid-gallery' ),
		);
		return isset( $labels[ $type ] ) ? $labels[ $type ] : $type;
	}

	/**
	 * @param int $gallery_id Gallery ID.
	 * @return bool
	 */
	private static function gallery_has_proofing( $gallery_id ) {
		$flat = get_post_meta( $gallery_id, 'modula-settings', true );
		if ( is_array( $flat ) && ! empty( $flat['image_proofing'] ) ) {
			return true;
		}
		if ( class_exists( '\Modula\V2\Meta_Sync', false ) ) {
			$v2 = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id );
			if ( is_array( $v2 ) && ! empty( $v2['imageProofing']['enabled'] ) ) {
				return true;
			}
			if ( is_array( $v2 ) && isset( $v2['general']['image_proofing'] ) && $v2['general']['image_proofing'] ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param int $user_id Author ID.
	 * @return array{name: string, initials: string}
	 */
	private static function get_author_payload( $user_id ) {
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return array(
				'name'     => '',
				'initials' => '',
			);
		}
		$name     = $user->display_name;
		$parts    = preg_split( '/\s+/', trim( $name ) );
		$initials = '';
		if ( is_array( $parts ) ) {
			foreach ( array_slice( $parts, 0, 2 ) as $part ) {
				$initials .= strtoupper( substr( $part, 0, 1 ) );
			}
		}
		return array(
			'name'     => $name,
			'initials' => $initials,
		);
	}
}
