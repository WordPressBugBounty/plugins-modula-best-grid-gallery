<?php
/**
 * Bound gallery: Beta gallery whose tiles follow a bind target.
 *
 * @package Modula
 */

namespace Modula\Bound_Gallery;

use Modula\V2\Beta_Settings;
use WPChill\Folders\Folders\Folder_Repository;
use WPChill\Folders\Memberships\Membership_Service;
use WPChill\Folders\Rest\Connections_Controller;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Rest\Memberships_Controller;
use WPChill\Folders\Rest\Source_Groups_Controller;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/core/helpers/modula-compatible-pro.php';

/**
 * Class Bound_Gallery
 */
final class Bound_Gallery {

	/**
	 * Host row action id on the media_folder slot.
	 */
	const ACTION_ID = 'create-bound-gallery';

	/**
	 * Bind target type post meta.
	 */
	const META_TARGET_TYPE = '_modula_bind_target_type';

	/**
	 * Bind target id/prefix post meta.
	 */
	const META_TARGET_ID = '_modula_bind_target_id';

	/**
	 * Media folder bind target type.
	 */
	const TARGET_TYPE_MEDIA_FOLDER = 'media_folder';

	/**
	 * Remote prefix bind target type.
	 */
	const TARGET_TYPE_REMOTE_PREFIX = 'remote_prefix';

	/**
	 * Per-gallery hidden source attachments (bound-gallery exclusions).
	 */
	const META_EXCLUSIONS = '_modula_bound_exclusions';

	/**
	 * @var Folder_Repository|null
	 */
	private static $folder_repository = null;

	/**
	 * @var Membership_Service|null
	 */
	private static $membership_service = null;

	/**
	 * @var bool|null Test override for is_entitled().
	 */
	private static $entitled_override = null;

	/**
	 * @param Folder_Repository $repository Folder store override (tests).
	 * @return void
	 */
	public static function set_folder_repository( Folder_Repository $repository ) {
		self::$folder_repository = $repository;
	}

	/**
	 * @param Membership_Service $service Membership service override (tests).
	 * @return void
	 */
	public static function set_membership_service( Membership_Service $service ) {
		self::$membership_service = $service;
	}

	/**
	 * @param bool|null $entitled Entitlement override for tests; null clears.
	 * @return void
	 */
	public static function set_entitled_override( $entitled ) {
		self::$entitled_override = null === $entitled ? null : (bool) $entitled;
	}

	/**
	 * Whether Compatible Pro is active (bound gallery is Pro-only).
	 *
	 * @return bool
	 */
	public static function is_entitled() {
		if ( null !== self::$entitled_override ) {
			return self::$entitled_override;
		}

		return modula_is_compatible_pro();
	}

	/**
	 * Create a Beta bound gallery from a media folder's direct attachment members.
	 *
	 * @param int $folder_id Media folder id.
	 * @return int|\WP_Error Gallery post ID on success.
	 */
	public static function create_from_media_folder( $folder_id ) {
		if ( ! self::is_entitled() ) {
			return new \WP_Error(
				'modula_bound_gallery_pro_required',
				__( 'Creating a bound gallery requires Modula Pro.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'modula_bound_gallery_forbidden',
				__( 'You are not allowed to create galleries.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		$folder_id = absint( $folder_id );
		if ( $folder_id < 1 ) {
			return new \WP_Error(
				'modula_bound_gallery_invalid_folder',
				__( 'Invalid media folder.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$folder = self::folder_repository()->find( $folder_id );
		if ( null === $folder ) {
			return new \WP_Error(
				'modula_bound_gallery_folder_not_found',
				__( 'Media folder not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$attachment_ids = self::direct_attachment_ids( $folder_id );
		$title          = isset( $folder['name'] ) ? sanitize_text_field( (string) $folder['name'] ) : '';
		if ( '' === $title ) {
			/* translators: %d: media folder id */
			$title = sprintf( __( 'Bound gallery #%d', 'modula-best-grid-gallery' ), $folder_id );
		}

		return self::insert_bound_gallery(
			$title,
			self::TARGET_TYPE_MEDIA_FOLDER,
			(string) $folder_id,
			$attachment_ids
		);
	}

	/**
	 * Ingest missing direct keys in a remote prefix, then create or open the Beta bound gallery.
	 *
	 * @param string $connection_id Storage connection id.
	 * @param string $prefix        Remote prefix key (required; not the bucket root).
	 * @return int|\WP_Error Gallery post ID on success.
	 */
	public static function create_from_remote_prefix( $connection_id, $prefix ) {
		if ( ! self::is_entitled() ) {
			return new \WP_Error(
				'modula_bound_gallery_pro_required',
				__( 'Creating a bound gallery requires Modula Pro.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			return new \WP_Error(
				'modula_bound_gallery_forbidden',
				__( 'You are not allowed to create galleries.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		$connection_id = (string) $connection_id;
		$prefix        = (string) $prefix;
		if ( '' === $connection_id || '' === $prefix ) {
			return new \WP_Error(
				'modula_bound_gallery_invalid_prefix',
				__( 'A remote prefix is required.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		if ( ! class_exists( Connections_Controller::class, false ) ) {
			return new \WP_Error(
				'modula_bound_gallery_storage_unavailable',
				__( 'Storage is not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$connection = Connections_Controller::service()->find( $connection_id );
		if ( null === $connection ) {
			return new \WP_Error(
				'modula_bound_gallery_connection_not_found',
				__( 'Storage connection not found.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$attachment_ids = self::ingest_direct_prefix_keys( $connection_id, $prefix );
		if ( is_wp_error( $attachment_ids ) ) {
			return $attachment_ids;
		}

		$target_id = self::remote_prefix_target_id( $connection_id, $prefix );
		$existing  = self::find_existing_bound_gallery( self::TARGET_TYPE_REMOTE_PREFIX, $target_id );
		if ( $existing > 0 ) {
			self::refresh_bound_image_rows( $existing, $attachment_ids );
			return $existing;
		}

		return self::insert_bound_gallery(
			self::title_from_prefix( $prefix ),
			self::TARGET_TYPE_REMOTE_PREFIX,
			$target_id,
			$attachment_ids
		);
	}

	/**
	 * Whether this post is a bound gallery (Beta + bind target meta).
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return bool
	 */
	public static function is_bound( $gallery_id ) {
		$gallery_id = absint( $gallery_id );
		if ( $gallery_id < 1 ) {
			return false;
		}

		if ( ! Beta_Settings::is_beta_gallery( $gallery_id ) ) {
			return false;
		}

		$type = (string) get_post_meta( $gallery_id, self::META_TARGET_TYPE, true );
		$id   = (string) get_post_meta( $gallery_id, self::META_TARGET_ID, true );

		return '' !== $type && '' !== $id;
	}

	/**
	 * Whether the bind target is a media folder.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return bool
	 */
	public static function is_media_folder_bound( $gallery_id ) {
		if ( ! self::is_bound( $gallery_id ) ) {
			return false;
		}

		$type = (string) get_post_meta( $gallery_id, self::META_TARGET_TYPE, true );
		$id   = absint( get_post_meta( $gallery_id, self::META_TARGET_ID, true ) );

		return self::TARGET_TYPE_MEDIA_FOLDER === $type && $id > 0;
	}

	/**
	 * Whether the bind target is a remote prefix.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return bool
	 */
	public static function is_remote_prefix_bound( $gallery_id ) {
		if ( ! self::is_bound( $gallery_id ) ) {
			return false;
		}

		$type = (string) get_post_meta( $gallery_id, self::META_TARGET_TYPE, true );
		if ( self::TARGET_TYPE_REMOTE_PREFIX !== $type ) {
			return false;
		}

		return null !== self::parse_remote_prefix_target( (string) get_post_meta( $gallery_id, self::META_TARGET_ID, true ) );
	}

	/**
	 * Bind-target id stored on the gallery (connection id + prefix view token).
	 *
	 * @param string $connection_id Storage connection id.
	 * @param string $prefix        Remote prefix key.
	 * @return string
	 */
	public static function remote_prefix_target_id( $connection_id, $prefix ) {
		return (string) $connection_id . '::' . (string) $prefix;
	}

	/**
	 * @param string $target_id Stored bind target id.
	 * @return array{connection_id:string,prefix:string}|null
	 */
	public static function parse_remote_prefix_target( $target_id ) {
		$target_id = (string) $target_id;
		$pos       = strpos( $target_id, '::' );
		if ( false === $pos ) {
			return null;
		}

		$connection_id = substr( $target_id, 0, $pos );
		$prefix        = substr( $target_id, $pos + 2 );
		if ( '' === $connection_id || '' === $prefix ) {
			return null;
		}

		return array(
			'connection_id' => $connection_id,
			'prefix'        => $prefix,
		);
	}

	/**
	 * Bound-gallery exclusions for this gallery (attachment ids).
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return int[]
	 */
	public static function get_exclusions( $gallery_id ) {
		$gallery_id = absint( $gallery_id );
		if ( $gallery_id < 1 ) {
			return array();
		}

		$raw = get_post_meta( $gallery_id, self::META_EXCLUSIONS, true );
		if ( ! is_array( $raw ) ) {
			return array();
		}

		$ids = array();
		foreach ( $raw as $id ) {
			$id = absint( $id );
			if ( $id > 0 ) {
				$ids[ $id ] = $id;
			}
		}

		return array_values( $ids );
	}

	/**
	 * Hide a source attachment in this gallery only. Does not unassign the media folder or delete the file.
	 *
	 * @param int $gallery_id    Gallery post ID.
	 * @param int $attachment_id Attachment ID.
	 * @return bool
	 */
	public static function exclude_attachment( $gallery_id, $attachment_id ) {
		$gallery_id    = absint( $gallery_id );
		$attachment_id = absint( $attachment_id );
		if ( $gallery_id < 1 || $attachment_id < 1 || ! self::is_bound( $gallery_id ) ) {
			return false;
		}

		$exclusions = self::get_exclusions( $gallery_id );
		if ( ! in_array( $attachment_id, $exclusions, true ) ) {
			$exclusions[] = $attachment_id;
			update_post_meta( $gallery_id, self::META_EXCLUSIONS, $exclusions );
		}

		return true;
	}

	/**
	 * Write bound-gallery exclusions for source attachment ids present in $previous_items but omitted from $kept_items.
	 * Used by save-merged (bulk Hide). Gallery-local rows are ignored. Unbound galleries are a no-op.
	 *
	 * @param int   $gallery_id      Gallery post ID.
	 * @param array $previous_items  Catalog rows before the omit (modula-images / merged).
	 * @param array $kept_items      Catalog rows being persisted.
	 * @return int[] Newly written exclusion attachment ids.
	 */
	public static function exclude_omitted_source_attachments( $gallery_id, array $previous_items, array $kept_items ) {
		$gallery_id = absint( $gallery_id );
		if ( $gallery_id < 1 || ! self::is_bound( $gallery_id ) ) {
			return array();
		}

		$previous_ids = self::source_attachment_ids_from_rows( $previous_items );
		$kept_ids     = self::source_attachment_ids_from_rows( $kept_items );
		$kept_lookup  = array();
		foreach ( $kept_ids as $id ) {
			$kept_lookup[ $id ] = true;
		}

		$written = array();
		foreach ( $previous_ids as $id ) {
			if ( isset( $kept_lookup[ $id ] ) ) {
				continue;
			}
			if ( self::exclude_attachment( $gallery_id, $id ) ) {
				$written[] = $id;
			}
		}

		return $written;
	}

	/**
	 * Clear one bound-gallery exclusion for this gallery only.
	 *
	 * @param int $gallery_id    Gallery post ID.
	 * @param int $attachment_id Attachment ID.
	 * @return bool True when the exclusion was cleared or was already absent on a bound gallery.
	 */
	public static function restore_attachment( $gallery_id, $attachment_id ) {
		$gallery_id    = absint( $gallery_id );
		$attachment_id = absint( $attachment_id );
		if ( $gallery_id < 1 || $attachment_id < 1 || ! self::is_bound( $gallery_id ) ) {
			return false;
		}

		$exclusions = self::get_exclusions( $gallery_id );
		$next       = array();
		foreach ( $exclusions as $id ) {
			if ( $id !== $attachment_id ) {
				$next[] = $id;
			}
		}

		if ( count( $next ) === count( $exclusions ) ) {
			return true;
		}

		if ( array() === $next ) {
			delete_post_meta( $gallery_id, self::META_EXCLUSIONS );
		} else {
			update_post_meta( $gallery_id, self::META_EXCLUSIONS, $next );
		}

		return true;
	}

	/**
	 * Hidden-from-gallery list rows for the badge popover (identity only).
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return array<int, array{id:int,title:string,thumbnailUrl:string}>
	 */
	public static function get_hidden_from_gallery_items( $gallery_id ) {
		$gallery_id = absint( $gallery_id );
		if ( $gallery_id < 1 || ! self::is_bound( $gallery_id ) ) {
			return array();
		}

		$items = array();
		foreach ( self::get_exclusions( $gallery_id ) as $attachment_id ) {
			$attachment = get_post( $attachment_id );
			$title      = '';
			if ( $attachment && isset( $attachment->post_title ) ) {
				$title = sanitize_text_field( (string) $attachment->post_title );
			}
			if ( '' === $title ) {
				/* translators: %d: attachment id */
				$title = sprintf( __( 'Attachment #%d', 'modula-best-grid-gallery' ), $attachment_id );
			}

			$thumb = '';
			if ( function_exists( 'wp_get_attachment_image_url' ) ) {
				$thumb = (string) wp_get_attachment_image_url( $attachment_id, 'thumbnail' );
				if ( '' === $thumb ) {
					$thumb = (string) wp_get_attachment_image_url( $attachment_id, 'full' );
				}
			}

			$items[] = array(
				'id'           => $attachment_id,
				'title'        => $title,
				'thumbnailUrl' => $thumb,
			);
		}

		return $items;
	}

	/**
	 * Compact bind summary for gallery editor bootstrap (badge + Hide gates).
	 * Null when the gallery is not bound.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return array{
	 *   bound:bool,
	 *   entitled:bool,
	 *   targetType:string,
	 *   displayName:string,
	 *   missing:bool,
	 *   openInMediaLibraryUrl:?string,
	 *   hiddenItems:array
	 * }|null
	 */
	public static function get_bind_summary( $gallery_id ) {
		$gallery_id = absint( $gallery_id );
		if ( $gallery_id < 1 || ! self::is_bound( $gallery_id ) ) {
			return null;
		}

		$type    = (string) get_post_meta( $gallery_id, self::META_TARGET_TYPE, true );
		$id_raw  = (string) get_post_meta( $gallery_id, self::META_TARGET_ID, true );
		$missing = true;
		$name    = '';
		$open    = null;

		if ( self::TARGET_TYPE_MEDIA_FOLDER === $type ) {
			$folder_id = absint( $id_raw );
			$folder    = $folder_id > 0 ? self::folder_repository()->find( $folder_id ) : null;
			if ( is_array( $folder ) ) {
				$missing = false;
				$name    = isset( $folder['name'] ) ? sanitize_text_field( (string) $folder['name'] ) : '';
				if ( function_exists( 'admin_url' ) && function_exists( 'add_query_arg' ) ) {
					$open = add_query_arg(
						'wpchill_folder',
						(string) $folder_id,
						admin_url( 'upload.php' )
					);
				}
			}
		} elseif ( self::TARGET_TYPE_REMOTE_PREFIX === $type ) {
			$parsed = self::parse_remote_prefix_target( $id_raw );
			if ( null !== $parsed ) {
				$name = self::title_from_prefix( $parsed['prefix'] );
				if ( class_exists( Connections_Controller::class, false ) ) {
					$connection = Connections_Controller::service()->find( $parsed['connection_id'] );
					if ( null !== $connection ) {
						$missing = false;
						if ( function_exists( 'admin_url' ) && function_exists( 'add_query_arg' ) ) {
							$view = self::remote_prefix_target_id( $parsed['connection_id'], $parsed['prefix'] );
							$open = add_query_arg(
								'wpchill_folder',
								$view,
								admin_url( 'upload.php' )
							);
						}
					}
				} else {
					// Storage unavailable in this process — treat as missing for Open link only.
					$missing = true;
				}
			}
		}

		if ( '' === $name && ! $missing ) {
			$name = __( 'Bound target', 'modula-best-grid-gallery' );
		}
		if ( '' === $name && $missing ) {
			$name = __( 'Bound target missing', 'modula-best-grid-gallery' );
		}

		$entitled = self::is_entitled();

		return array(
			'bound'                  => true,
			'entitled'               => $entitled,
			'targetType'             => $type,
			'displayName'            => $name,
			'missing'                => $missing,
			'openInMediaLibraryUrl'  => ( $missing || ! $entitled ) ? null : $open,
			'hiddenItems'            => $entitled ? self::get_hidden_from_gallery_items( $gallery_id ) : array(),
		);
	}

	/**
	 * Derive the bound catalog: source ids − exclusions + gallery-local chrome, overlay attachment text.
	 * Unbound / classic galleries are returned unchanged.
	 *
	 * @param int   $gallery_id  Gallery post ID.
	 * @param array $stored_rows Stored gallery items (modula-images and/or v2 mixed rows).
	 * @return array
	 */
	public static function apply_derived_catalog( $gallery_id, $stored_rows ) {
		if ( ! is_array( $stored_rows ) ) {
			$stored_rows = array();
		}

		$gallery_id = absint( $gallery_id );
		$source_ids = null;
		if ( self::is_media_folder_bound( $gallery_id ) ) {
			$folder_id  = absint( get_post_meta( $gallery_id, self::META_TARGET_ID, true ) );
			$source_ids = self::direct_attachment_ids( $folder_id );
		} elseif ( self::is_remote_prefix_bound( $gallery_id ) ) {
			$parsed = self::parse_remote_prefix_target( (string) get_post_meta( $gallery_id, self::META_TARGET_ID, true ) );
			if ( null === $parsed ) {
				return $stored_rows;
			}
			$source_ids = self::direct_prefix_attachment_ids( $parsed['connection_id'], $parsed['prefix'] );
			if ( is_wp_error( $source_ids ) ) {
				return $stored_rows;
			}
		}

		if ( ! is_array( $source_ids ) ) {
			return $stored_rows;
		}

		$derived = self::merge_source_with_gallery_rows(
			$stored_rows,
			$source_ids,
			self::get_exclusions( $gallery_id )
		);
		$derived = self::overlay_attachment_text( $derived );
		return self::strip_catalog_file_urls( $derived );
	}

	/**
	 * Stored `modula-images` after bound-catalog derive (writes and canonical indexes).
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return array[]
	 */
	public static function get_image_rows( $gallery_id ) {
		$raw = get_post_meta( absint( $gallery_id ), 'modula-images', true );
		if ( ! is_array( $raw ) ) {
			$raw = array();
		}

		return self::apply_derived_catalog( $gallery_id, $raw );
	}

	/**
	 * Drop stored gallery item file URL snapshots from bound catalog rows.
	 *
	 * @param array $rows Rows.
	 * @return array
	 */
	private static function strip_catalog_file_urls( array $rows ) {
		if ( class_exists( '\Modula\V2\Images\Adapter', false ) ) {
			return \Modula\V2\Images\Adapter::strip_catalog_file_urls_from_items( $rows );
		}
		return $rows;
	}

	/**
	 * Direct attachment members of a media folder (no nested children).
	 *
	 * @param int $folder_id Media folder id.
	 * @return int[]
	 */
	public static function direct_attachment_ids( $folder_id ) {
		$folder_id = absint( $folder_id );
		if ( $folder_id < 1 ) {
			return array();
		}

		$objects = self::membership_service()->list_objects( $folder_id, 'attachment' );
		$ids     = array();
		foreach ( $objects as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['object_id'] ) ) {
				continue;
			}
			$id = absint( $row['object_id'] );
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}

		return $ids;
	}

	/**
	 * Ingested attachments for direct object keys in a remote prefix (no nested prefixes).
	 *
	 * @param string $connection_id Storage connection id.
	 * @param string $prefix        Remote prefix key.
	 * @return int[]|\WP_Error
	 */
	public static function direct_prefix_attachment_ids( $connection_id, $prefix ) {
		$children = self::list_prefix_children( $connection_id, $prefix );
		if ( is_wp_error( $children ) ) {
			return $children;
		}

		if ( ! class_exists( Source_Groups_Controller::class, false ) ) {
			return array();
		}

		$maps = Source_Groups_Controller::provider_maps();
		$ids  = array();
		foreach ( $children as $row ) {
			if ( ! self::is_direct_object_row( $row ) ) {
				continue;
			}
			$id = $maps->find_attachment_id( $connection_id, (string) $row['key'] );
			$id = absint( $id );
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}

		return $ids;
	}

	/**
	 * @param int[]  $attachment_ids Attachment ids in append order.
	 * @return array[]
	 */
	private static function build_image_rows( array $attachment_ids ) {
		$rows = array();
		foreach ( $attachment_ids as $attachment_id ) {
			$attachment_id = absint( $attachment_id );
			$attachment    = get_post( $attachment_id );
			if ( ! $attachment ) {
				continue;
			}

			$rows[] = array(
				'id'          => $attachment_id,
				'alt'         => sanitize_text_field( get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ) ),
				'title'       => sanitize_text_field( $attachment->post_title ),
				'description' => function_exists( 'wp_filter_post_kses' )
					? wp_filter_post_kses( $attachment->post_content )
					: (string) $attachment->post_content,
				'halign'      => 'center',
				'valign'      => 'middle',
				'link'        => '',
				'target'      => '',
				'width'       => 2,
				'height'      => 2,
				'filters'     => '',
			);
		}

		return $rows;
	}

	/**
	 * Keep gallery-local chrome in stored order, drop excluded / departed members, append never-seen source ids.
	 *
	 * @param array $stored_rows Stored gallery items.
	 * @param int[] $source_ids  Direct bind-target attachment ids.
	 * @param int[] $exclusions  Bound-gallery exclusions.
	 * @return array
	 */
	private static function merge_source_with_gallery_rows( array $stored_rows, array $source_ids, array $exclusions ) {
		$excluded = array();
		foreach ( $exclusions as $id ) {
			$id = absint( $id );
			if ( $id > 0 ) {
				$excluded[ $id ] = true;
			}
		}

		$visible = array();
		foreach ( $source_ids as $id ) {
			$id = absint( $id );
			if ( $id > 0 && ! isset( $excluded[ $id ] ) ) {
				$visible[ $id ] = true;
			}
		}

		$result = array();
		$seen   = array();
		foreach ( $stored_rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			if ( self::is_gallery_local_row( $row ) ) {
				$result[] = $row;
				continue;
			}

			$id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( $id < 1 || ! isset( $visible[ $id ] ) ) {
				continue;
			}

			$result[]    = $row;
			$seen[ $id ] = true;
		}

		foreach ( $source_ids as $id ) {
			$id = absint( $id );
			if ( $id < 1 || ! isset( $visible[ $id ] ) || isset( $seen[ $id ] ) ) {
				continue;
			}
			foreach ( self::build_image_rows( array( $id ) ) as $new_row ) {
				$result[]    = $new_row;
				$seen[ $id ] = true;
			}
		}

		return $result;
	}

	/**
	 * Title / alt / caption live on the attachment, not the modula-images cache.
	 *
	 * @param array $rows Catalog rows.
	 * @return array
	 */
	private static function overlay_attachment_text( array $rows ) {
		foreach ( $rows as $i => $row ) {
			if ( ! is_array( $row ) || self::is_gallery_local_row( $row ) ) {
				continue;
			}

			$id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( $id < 1 ) {
				continue;
			}

			$attachment = get_post( $id );
			if ( ! $attachment || ( isset( $attachment->post_type ) && 'attachment' !== $attachment->post_type ) ) {
				continue;
			}

			$row['title']       = sanitize_text_field( $attachment->post_title );
			$row['alt']         = sanitize_text_field( get_post_meta( $id, '_wp_attachment_image_alt', true ) );
			$row['description'] = function_exists( 'wp_filter_post_kses' )
				? wp_filter_post_kses( $attachment->post_content )
				: (string) $attachment->post_content;
			if ( isset( $attachment->post_excerpt ) ) {
				$row['caption'] = $attachment->post_excerpt;
			}

			$rows[ $i ] = $row;
		}

		return $rows;
	}

	/**
	 * Source attachment ids from catalog rows (skips gallery-local chrome).
	 *
	 * @param array $rows Catalog rows.
	 * @return int[]
	 */
	private static function source_attachment_ids_from_rows( array $rows ) {
		$ids = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) || self::is_gallery_local_row( $row ) ) {
				continue;
			}
			$id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( $id > 0 ) {
				$ids[ $id ] = $id;
			}
		}

		return array_values( $ids );
	}

	/**
	 * Content blocks, shortcodes, and video templates stay on the gallery; they are not bind-target members.
	 *
	 * @param array $row Catalog row.
	 * @return bool
	 */
	private static function is_gallery_local_row( array $row ) {
		if ( class_exists( '\Modula\V2\Images\Adapter', false ) ) {
			if ( \Modula\V2\Images\Adapter::is_embedded_gallery_item( $row ) || \Modula\V2\Images\Adapter::is_video_template_row( $row ) ) {
				return true;
			}
		}

		$kind = isset( $row['itemKind'] ) ? (string) $row['itemKind'] : '';
		if ( 'content_block' === $kind || 'shortcode' === $kind ) {
			return true;
		}

		if ( ! empty( $row['video_template'] ) ) {
			return true;
		}

		if ( isset( $row['id'] ) && is_string( $row['id'] ) && 0 === strpos( $row['id'], 'video_template_' ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Create the Beta gallery post and seed settings / image rows.
	 *
	 * @param string $title           Gallery title.
	 * @param string $target_type     Bind target type.
	 * @param string $target_id       Bind target id.
	 * @param int[]  $attachment_ids  Direct source attachment ids.
	 * @return int|\WP_Error
	 */
	private static function insert_bound_gallery( $title, $target_type, $target_id, array $attachment_ids ) {
		$gallery_id = wp_insert_post(
			array(
				'post_type'   => 'modula-gallery',
				'post_status' => 'publish',
				'post_title'  => $title,
			),
			true
		);

		if ( is_wp_error( $gallery_id ) ) {
			return $gallery_id;
		}

		$gallery_id = (int) $gallery_id;
		if ( $gallery_id < 1 ) {
			return new \WP_Error(
				'modula_bound_gallery_create_failed',
				__( 'Could not create the bound gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		Beta_Settings::mark_as_beta_gallery( $gallery_id );
		update_post_meta( $gallery_id, self::META_TARGET_TYPE, $target_type );
		update_post_meta( $gallery_id, self::META_TARGET_ID, (string) $target_id );

		$defaults = array();
		if ( class_exists( 'Modula_CPT_Fields_Helper', false ) ) {
			$defaults = \Modula_CPT_Fields_Helper::get_defaults();
			if ( ! is_array( $defaults ) ) {
				$defaults = array();
			}
		}
		update_post_meta( $gallery_id, 'modula-settings', $defaults );
		$image_rows = self::build_image_rows( $attachment_ids );
		update_post_meta( $gallery_id, 'modula-images', $image_rows );

		if ( class_exists( '\Modula\V2\Meta_Sync', false ) ) {
			\Modula\V2\Meta_Sync::ensure_default_settings( $gallery_id );
			\Modula\V2\Meta_Sync::sync_modula_images_v2_from_list( $gallery_id, $image_rows );
		}

		return $gallery_id;
	}

	/**
	 * Ingest missing direct object keys in a remote prefix (not descendants).
	 *
	 * @param string $connection_id Storage connection id.
	 * @param string $prefix        Remote prefix key.
	 * @return int[]|\WP_Error
	 */
	private static function ingest_direct_prefix_keys( $connection_id, $prefix ) {
		$children = self::list_prefix_children( $connection_id, $prefix );
		if ( is_wp_error( $children ) ) {
			return $children;
		}

		$ids = array();
		foreach ( $children as $row ) {
			if ( ! self::is_direct_object_row( $row ) ) {
				continue;
			}

			$result = Source_Groups_Controller::ingest_service()->ingest( $connection_id, (string) $row['key'] );
			if ( self::is_folders_error( $result ) ) {
				return self::folders_value_to_wp_error( $result );
			}

			$id = isset( $result['attachment_id'] ) ? absint( $result['attachment_id'] ) : 0;
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}

		return $ids;
	}

	/**
	 * Direct children of a remote prefix (prefixes and objects). Does not ingest.
	 *
	 * @param string $connection_id Storage connection id.
	 * @param string $prefix        Remote prefix key.
	 * @return array[]|\WP_Error
	 */
	private static function list_prefix_children( $connection_id, $prefix ) {
		if ( ! class_exists( Source_Groups_Controller::class, false ) ) {
			return new \WP_Error(
				'modula_bound_gallery_storage_unavailable',
				__( 'Storage is not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$payload = Source_Groups_Controller::get_children_payload(
			self::folders_request(
				array(
					'id'         => $connection_id,
					'parent_key' => $prefix,
				)
			)
		);
		if ( self::is_folders_error( $payload ) ) {
			return self::folders_value_to_wp_error( $payload );
		}

		$children = isset( $payload['children'] ) && is_array( $payload['children'] ) ? $payload['children'] : array();
		return $children;
	}

	/**
	 * @param string $type      Bind target type.
	 * @param string $target_id Bind target id.
	 * @return int Existing gallery id, or 0.
	 */
	private static function find_existing_bound_gallery( $type, $target_id ) {
		if ( ! function_exists( 'get_posts' ) ) {
			return 0;
		}

		$found = get_posts(
			array(
				'post_type'      => 'modula-gallery',
				'post_status'    => 'any',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_query'     => array(
					'relation' => 'AND',
					array(
						'key'   => self::META_TARGET_TYPE,
						'value' => (string) $type,
					),
					array(
						'key'   => self::META_TARGET_ID,
						'value' => (string) $target_id,
					),
				),
			)
		);

		if ( ! is_array( $found ) || array() === $found ) {
			return 0;
		}

		$id = absint( $found[0] );
		return $id > 0 ? $id : 0;
	}

	/**
	 * Persist ingested source ids onto stored catalog rows (create/open path).
	 *
	 * @param int   $gallery_id      Gallery post ID.
	 * @param int[] $attachment_ids  Direct prefix attachment ids.
	 * @return void
	 */
	private static function refresh_bound_image_rows( $gallery_id, array $attachment_ids ) {
		$gallery_id = absint( $gallery_id );
		if ( $gallery_id < 1 ) {
			return;
		}

		$stored = get_post_meta( $gallery_id, 'modula-images', true );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		$merged = self::strip_catalog_file_urls(
			self::merge_source_with_gallery_rows(
				$stored,
				$attachment_ids,
				self::get_exclusions( $gallery_id )
			)
		);
		update_post_meta( $gallery_id, 'modula-images', $merged );

		if ( class_exists( '\Modula\V2\Meta_Sync', false ) ) {
			\Modula\V2\Meta_Sync::sync_modula_images_v2_from_list( $gallery_id, $merged );
		}
	}

	/**
	 * @param mixed $row List child row.
	 * @return bool
	 */
	private static function is_direct_object_row( $row ) {
		return is_array( $row ) && isset( $row['kind'], $row['key'] ) && 'object' === $row['kind'] && '' !== (string) $row['key'];
	}

	/**
	 * @param string $prefix Remote prefix key.
	 * @return string
	 */
	private static function title_from_prefix( $prefix ) {
		$relative = trim( str_replace( '\\', '/', (string) $prefix ), '/' );
		$parts    = explode( '/', $relative );
		$name     = end( $parts );
		$title    = sanitize_text_field( false === $name ? (string) $prefix : (string) $name );
		if ( '' === $title ) {
			$title = __( 'Bound gallery', 'modula-best-grid-gallery' );
		}

		return $title;
	}

	/**
	 * @param array $params Request params.
	 * @return object Request with get_param().
	 */
	private static function folders_request( array $params ) {
		return new class( $params ) {
			/**
			 * @var array
			 */
			private $params;

			/**
			 * @param array $params Params.
			 */
			public function __construct( array $params ) {
				$this->params = $params;
			}

			/**
			 * @param string $key Key.
			 * @return mixed
			 */
			public function get_param( $key ) {
				return array_key_exists( $key, $this->params ) ? $this->params[ $key ] : null;
			}
		};
	}

	/**
	 * @param mixed $value Folders seam return.
	 * @return bool
	 */
	private static function is_folders_error( $value ) {
		if ( is_object( $value ) && is_a( $value, 'WP_Error' ) ) {
			return true;
		}

		return is_array( $value ) && isset( $value['code'], $value['message'] );
	}

	/**
	 * @param mixed $value Folders error.
	 * @return \WP_Error
	 */
	private static function folders_value_to_wp_error( $value ) {
		if ( is_object( $value ) && is_a( $value, 'WP_Error' ) ) {
			return $value;
		}

		$code    = is_array( $value ) && isset( $value['code'] ) ? (string) $value['code'] : 'modula_bound_gallery_storage_error';
		$message = is_array( $value ) && isset( $value['message'] ) ? (string) $value['message'] : __( 'Storage request failed.', 'modula-best-grid-gallery' );

		return new \WP_Error( $code, $message, array( 'status' => 400 ) );
	}

	/**
	 * @return Folder_Repository
	 */
	private static function folder_repository() {
		if ( null !== self::$folder_repository ) {
			return self::$folder_repository;
		}

		return Folders_Controller::folder_repository();
	}

	/**
	 * @return Membership_Service
	 */
	private static function membership_service() {
		if ( null !== self::$membership_service ) {
			return self::$membership_service;
		}

		return Memberships_Controller::service();
	}
}
