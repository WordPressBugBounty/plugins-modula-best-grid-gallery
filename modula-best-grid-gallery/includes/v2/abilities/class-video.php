<?php
/** Explicit provider resolution and local Beta video composition are separate effects. */
namespace Modula\V2\Abilities;
use Modula\V2\Meta_Sync;
use Modula\V2\Images\Adapter;
use Modula_Pro\Extensions\Video\Video as Service;
defined( 'ABSPATH' ) || exit;
final class Video {
	public const RESOLVE = 'modula/resolve-video-source';
	public const UPDATE  = 'modula/update-gallery-videos';
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-video' ) && class_exists( Service::class );
	}
	public static function mutations(): array {
		return array( self::RESOLVE, self::UPDATE );
	}
	public static function callbacks(): array {
		return array(
			self::RESOLVE => array( self::class, 'resolve' ),
			self::UPDATE  => array( Update::class, 'execute' ),
		);
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'phase'    => array( 'type' => 'string' ),
				'sources'  => array(
					'type'     => 'array',
					'maxItems' => 100,
					'items'    => Contract::object(
						array(
							'video_url'   => array( 'type' => 'string' ),
							'title'       => array( 'type' => 'string' ),
							'description' => array( 'type' => 'string' ),
							'thumb'       => array( 'type' => 'string' ),
							'width'       => array( 'type' => 'integer' ),
							'height'      => array( 'type' => 'integer' ),
						),
						array( 'video_url', 'title', 'description', 'thumb', 'width', 'height' )
					),
				),
				'complete' => array( 'type' => 'boolean' ),
			),
			array( 'phase', 'sources', 'complete' )
		);
	}
	public static function definitions(): array {
		$base   = array(
			'id'         => array(
				'type'    => 'integer',
				'minimum' => 1,
			),
			'revision'   => Contract::revision_schema(),
			'request_id' => Contract::request_id_schema(),
		);
		$item   = array(
			'type'      => 'string',
			'pattern'   => '^video_template_[0-9]+$',
			'maxLength' => 80,
		);
		$fields = Composition::layout_fields() + array(
			'video_title'       => array(
				'type'      => 'string',
				'maxLength' => 1000,
			),
			'video_alt'         => array(
				'type'      => 'string',
				'maxLength' => 1000,
			),
			'video_description' => array(
				'type'      => 'string',
				'maxLength' => 10000,
			),
		);
		foreach ( array( 'autoplay_thumbnail', 'autoplay_lightbox', 'loop_video' ) as $key ) {
			$fields[ $key ] = array(
				'type' => 'string',
				'enum' => array( 'inherit', 'on', 'off' ),
			);
		}
		return array(
			self::RESOLVE => array(
				'label'         => 'Resolve an explicit video or playlist source',
				'description'   => 'Explicit provider effect, not a local read. Uses existing YouTube/Vimeo workflow and configured accounts; no credentials accepted or returned, no media downloader. Checks editable Beta gallery revision before provider work. max_sources bounds retained sources (1–100, default 100); incomplete responses are partial, interrupted requests uncertain. Resolution creates no gallery items or attachments. Apply selected source indexes separately with update-gallery-videos. Replay/recover never queries the provider again. 30-day retention.',
				'input_schema'  => Contract::object(
					$base + array(
						'kind'        => array(
							'type' => 'string',
							'enum' => array( 'video', 'playlist' ),
						),
						'url'         => array(
							'type'      => 'string',
							'maxLength' => 2000,
							'minLength' => 1,
						),
						'max_sources' => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 100,
							'default' => 100,
						),
					),
					array( 'id', 'revision', 'request_id', 'kind', 'url' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
			self::UPDATE  => array(
				'label'         => 'Patch Beta gallery video items',
				'description'   => '1–100 ordered add/update/move/remove changes. item_id is a video_template_N identity, never an attachment ID. Add supplies exactly one accessible local video attachment_id or a retained source_request_id plus zero-based source_index from resolve-video-source for this gallery. before_id identifies any existing gallery item. Fields alter gallery-local text, playback and layout only. Preserves other items and shared media. No provider calls during composition. Bound/classic galleries refused; revision and 30-day recovery required.',
				'input_schema'  => Contract::object(
					$base + array(
						'video_changes' => array(
							'type'     => 'array',
							'minItems' => 1,
							'maxItems' => 100,
							'items'    => Contract::object(
								array(
									'action'            => array(
										'type' => 'string',
										'enum' => array( 'add', 'update', 'move', 'remove' ),
									),
									'item_id'           => $item,
									'attachment_id'     => array(
										'type'    => 'integer',
										'minimum' => 1,
									),
									'source_request_id' => Contract::request_id_schema(),
									'source_index'      => array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 99,
									),
									'before_id'         => array( 'type' => array( 'integer', 'string' ) ),
									'fields'            => Contract::object( $fields ) + array( 'minProperties' => 1 ),
								),
								array( 'action', 'item_id' )
							),
						),
					),
					array( 'id', 'revision', 'request_id', 'video_changes' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
		);
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available() || ! Update::can_update( (int) $record['target'] ) ) {
			return false;
		}
		foreach ( $record['attachment_ids'] ?? array() as $id ) {
			if ( ! Attachments::can_read( (int) $id ) ) {
				return false;
			}
		}
		return true;
	}
	/** Only canonical supported provider endpoints; never accept a generic URL fetch. */
	public static function provider_url( string $url, bool $playlist = false ): bool {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) || 'https' !== ( $parts['scheme'] ?? '' ) || isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['port'] ) || isset( $parts['fragment'] ) ) {
			return false;
		}
		$host = strtolower( $parts['host'] ?? '' );
		$path = $parts['path'] ?? '';
		parse_str( $parts['query'] ?? '', $query );
		if ( in_array( $host, array( 'youtube.com', 'www.youtube.com', 'youtu.be' ), true ) ) {
			if ( $playlist ) {
				return in_array( $path, array( '/playlist', '/watch' ), true ) && isset( $query['list'] ) && is_string( $query['list'] ) && preg_match( '/^[A-Za-z0-9_-]{1,120}$/D', $query['list'] ) && ! array_diff( array_keys( $query ), array( 'v', 'list' ) );
			}
			return ! array_diff( array_keys( $query ), array( 'v' ) ) && (bool) Service::get_youtube_video_id( $url );
		}
		if ( $playlist && method_exists( Service::class, 'vimeo_collection_path' ) ) {
			return false !== Service::vimeo_collection_path( $url );
		}
		return in_array( $host, array( 'vimeo.com', 'www.vimeo.com' ), true ) && ! $query && (bool) preg_match( $playlist ? '~^/channels/[A-Za-z0-9_-]+/?$~D' : '~^/[0-9]+/?$~D', $path );
	}
	private static function clean_source( array $snap, string $url ): array {
		return array(
			'video_url'   => $url,
			'title'       => sanitize_text_field( (string) ( $snap['title'] ?? '' ) ),
			'description' => sanitize_textarea_field( (string) ( $snap['description'] ?? '' ) ),
			'thumb'       => esc_url_raw( (string) ( $snap['thumb'] ?? '' ), array( 'http', 'https' ) ),
			'width'       => max( 1, (int) ( $snap['width'] ?? 1920 ) ),
			'height'      => max( 1, (int) ( $snap['height'] ?? 1080 ) ),
		);
	}
	public static function resolve( array $input ): array {
		$existing = Requests::existing( $input, self::RESOLVE );
		if ( null !== $existing ) {
			return $existing;
		}
		$out = static function ( $status, $code = '' ) use ( $input ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Inspect retained sources; do not repeat an uncertain provider request.' : '', self::RESOLVE );
		};
		if ( ! self::can_recover( array( 'target' => $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' );
		}
		if ( ! \Modula\V2\Beta_Settings::is_beta_gallery( $input['id'] ) || 'trash' === get_post_status( $input['id'] ) || get_post_meta( $input['id'], '_modula_bind_target_type', true ) || ! self::provider_url( $input['url'], 'playlist' === $input['kind'] ) ) {
			return $out( 'rejected', 'unsupported_source_or_target' );
		}
		$existing = Requests::claim( $input, self::RESOLVE );
		if ( null !== $existing ) {
			return $existing;
		}
		$progress = array(
			'phase'    => 'provider_query',
			'sources'  => array(),
			'complete' => false,
		);
		$active   = false;
		try {
			Requests::context( $input['request_id'], array( 'video' => $progress ) );
			Revision::begin();
			$active = true;
			if ( Revision::state( $input['id'], true ) !== $input['revision'] ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision' ) );
			}
			if ( ! self::can_recover( array( 'target' => $input['id'] ) ) || ! \Modula\V2\Beta_Settings::is_beta_gallery( $input['id'] ) || 'trash' === get_post_status( $input['id'] ) || get_post_meta( $input['id'], '_modula_bind_target_type', true ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'forbidden', 'current_permission_denied' ) );
			}
			$complete = true;
			if ( 'playlist' === $input['kind'] ) {
				$snaps = Service::get_video_playlist_snap( $input['url'], $input['max_sources'] ?? 100, $complete );
			} else {
				$snap  = Service::get_video_snap( $input['url'], true );
				$snaps = is_array( $snap ) ? array( $snap + array( 'video_url' => $input['url'] ) ) : array();
			}
			Revision::end( true );
			$active = false;
			if ( ! is_array( $snaps ) || isset( $snaps['error'] ) || ! $snaps ) {
				return Requests::finish( $input['request_id'], $out( 'rejected', 'provider_source_unavailable' ) + array( 'video' => $progress ) );
			}
			foreach ( array_slice( $snaps, 0, 100 ) as $snap ) {
				if ( ! is_array( $snap ) || ! self::provider_url( (string) ( $snap['video_url'] ?? '' ) ) ) {
					$complete = false;
					continue;
				}
				$progress['sources'][] = self::clean_source( $snap, $snap['video_url'] );
				Requests::context( $input['request_id'], array( 'video' => $progress ) );
			}
			$progress['phase']    = 'resolved';
			$progress['complete'] = $complete && count( $snaps ) <= 100;
			return Requests::finish( $input['request_id'], $out( $progress['complete'] ? 'succeeded' : 'partial', $progress['complete'] ? '' : 'provider_incomplete' ) + array( 'video' => $progress ) );
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false );
			}
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'provider_unconfirmed' ) + array( 'video' => $progress ) );
		}
	}
	public static function referenced_attachment_ids( array $changes, int $gallery = 0 ): array {
		$ids     = array_column( $changes, 'attachment_id' );
		$targets = array_column( $changes, 'item_id' );
		foreach ( $gallery ? Meta_Sync::get_images_v2( $gallery ) : array() as $row ) {
			if ( ! in_array( $row['id'] ?? '', $targets, true ) ) {
				continue;
			}
			foreach ( array( 'video_url', 'video_thumbnail' ) as $field ) {
				$local = attachment_url_to_postid( $row[ $field ] ?? '' );
				if ( $local ) {
					$ids[] = $local;
				}
			}
		}
		foreach ( $ids as $id ) {
			$poster = get_post_thumbnail_id( $id );
			if ( $poster ) {
				$ids[] = $poster;
			}
		}
		return array_values( array_unique( array_map( 'intval', $ids ) ) );
	}
	private static function index( array $items, $id ): int {
		$found = array_keys(
			array_filter(
				$items,
				static function ( $row ) use ( $id ) {
					return (string) ( $row['id'] ?? '' ) === (string) $id;
				}
			)
		);
		return 1 === count( $found ) ? $found[0] : -1;
	}
	public static function prepare( int $id, array $changes ) {
		if ( ! self::available() ) {
			return new \WP_Error( 'video_unavailable', 'Active Video extension required.' );
		}
		foreach ( self::referenced_attachment_ids( $changes, $id ) as $attachment ) {
			if ( ! Attachments::can_read( $attachment ) ) {
				return new \WP_Error( 'video_attachment_forbidden', 'Current source and poster rights required.' );
			}
		}
		$items  = Meta_Sync::get_images_v2( $id );
		$placed = array();
		foreach ( $changes as $change ) {
			$action  = $change['action'];
			$item_id = $change['item_id'];
			$index   = self::index( $items, $item_id );
			if ( ( 'add' === $action && -1 !== $index ) || ( 'add' !== $action && ( $index < 0 || ! Adapter::is_video_template_row( $items[ $index ] ) ) ) ) {
				return new \WP_Error( 'invalid_video_identity', 'Add needs an absent identity; other actions need one existing video item.' );
			}
			$source_fields = isset( $change['attachment_id'] ) || isset( $change['source_request_id'] ) || isset( $change['source_index'] );
			if ( ( 'add' !== $action && $source_fields ) || ( isset( $change['fields'] ) && ! in_array( $action, array( 'add', 'update' ), true ) ) || ( isset( $change['before_id'] ) && ! in_array( $action, array( 'add', 'move' ), true ) ) || ( 'update' === $action && empty( $change['fields'] ) ) ) {
				return new \WP_Error( 'invalid_video_change', 'Source is add-only; fields are add/update-only; before_id is add/move-only.' );
			}
			if ( 'add' === $action ) {
				if ( isset( $change['attachment_id'] ) === isset( $change['source_request_id'] ) || ( isset( $change['source_request_id'] ) !== isset( $change['source_index'] ) ) ) {
					return new \WP_Error( 'invalid_video_source', 'Choose exactly one attachment or retained provider source.' );
				}
				if ( isset( $change['attachment_id'] ) ) {
					$attachment = $change['attachment_id'];
					if ( ! Attachments::can_read( $attachment ) || 'trash' === get_post_status( $attachment ) || strpos( (string) get_post_mime_type( $attachment ), 'video/' ) !== 0 ) {
						return new \WP_Error( 'video_attachment_forbidden', 'An accessible existing video attachment is required.' );
					}
					$snap = Service::get_video_snap_from_attachment( $attachment );
					$url  = wp_get_attachment_url( $attachment );
				} else {
					$record   = Requests::record( $change['source_request_id'] );
					$resolved = Requests::recover( array( 'request_id' => $change['source_request_id'] ) );
					if ( ! $record || self::RESOLVE !== $record['operation'] || $id !== (int) $record['target'] || ! in_array( $resolved['status'], array( 'succeeded', 'partial' ), true ) || ! isset( $resolved['video']['sources'][ $change['source_index'] ] ) ) {
						return new \WP_Error( 'video_source_unavailable', 'Use a confirmed retained source from this gallery and actor.' );
					}
					$snap = $resolved['video']['sources'][ $change['source_index'] ];
					$url  = $snap['video_url'];
				}
				$row = array(
					'id'                 => $item_id,
					'video_template'     => '1',
					'video_url'          => $url,
					'video_title'        => $snap['title'] ?? '',
					'video_alt'          => '',
					'video_description'  => $snap['description'] ?? '',
					'thumbnail'          => $snap['thumb'] ?? '',
					'video_thumbnail'    => $snap['thumb'] ?? '',
					'full'               => $snap['thumb'] ?? '',
					'title'              => $snap['title'] ?? '',
					'description'        => $snap['description'] ?? '',
					'width'              => 2,
					'height'             => 2,
					'video_width'        => $snap['width'] ?? 1920,
					'video_height'       => $snap['height'] ?? 1080,
					'autoplay_thumbnail' => 'inherit',
					'autoplay_lightbox'  => 'inherit',
					'loop_video'         => 'inherit',
					'halign'             => 'center',
					'valign'             => 'middle',
					'link'               => '',
					'target'             => '',
					'togglelightbox'     => '',
				);
			} else {
				$row = $items[ $index ];
			}
			// Recheck media rights on existing self-hosted rows too; row identities are not media permissions.
			$local_id = attachment_url_to_postid( $row['video_url'] ?? '' );
			if ( $local_id && ! Attachments::can_read( $local_id ) ) {
				return new \WP_Error( 'video_attachment_forbidden', 'Current video attachment rights required.' );
			}
			if ( 'remove' === $action ) {
				array_splice( $items, $index, 1 );
				continue;
			}
			$fields = $change['fields'] ?? array();
			$row    = array_replace( $row, $fields );
			foreach ( array(
				'video_title'       => 'title',
				'video_description' => 'description',
			) as $source => $target ) {
				if ( isset( $fields[ $source ] ) ) {
					$row[ $target ] = sanitize_textarea_field( $fields[ $source ] );
					$row[ $source ] = $row[ $target ];
				}
			}
			if ( isset( $fields['video_alt'] ) ) {
				$row['video_alt'] = sanitize_text_field( $fields['video_alt'] );
			}
			if ( array_intersect_key( $fields, Composition::layout_fields() ) ) {
				$placed[ $item_id ] = true;
			}
			if ( 'update' === $action ) {
				$items[ $index ] = $row;
				continue;
			}
			if ( 'move' === $action ) {
				array_splice( $items, $index, 1 );
			}
			$before = isset( $change['before_id'] ) ? self::index( $items, $change['before_id'] ) : count( $items );
			if ( $before < 0 ) {
				return new \WP_Error( 'invalid_video_anchor', 'before_id must identify one existing item.' );
			}
			array_splice( $items, $before, 0, array( Adapter::normalize_item_row( Adapter::strip_bootstrap_only_row_keys( $row ) ) ) );
		}
		return Composition::validate_cells( $items, $placed );
	}
}
