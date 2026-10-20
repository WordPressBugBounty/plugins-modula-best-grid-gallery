<?php
/** Video ability descriptors and retained-source authorization. Pro owns provider and composition effects. */
namespace Modula\V2\Abilities;
use Modula\V2\Meta_Sync;
defined( 'ABSPATH' ) || exit;
final class Video {
	public const RESOLVE = 'modula/resolve-video-source';
	public const UPDATE  = 'modula/update-gallery-videos';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target gallery too. */
	private const RESULTS = array( 'video', 'gallery' );
	public static function available(): bool {
		return Settings_Contract::extension( 'modula-video' ) && Pro_Dependency::host_executor_ready( self::RESOLVE );
	}
	public static function mutations(): array {
		return array( self::RESOLVE, self::UPDATE );
	}
	/** @return array<int,string> */
	public static function names(): array {
		return array( self::RESOLVE, self::UPDATE );
	}
	/**
	 * Signature contract for the Pro video executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys( self::names(), array( 'run' => 2 ) );
	}
	/**
	 * Inspect only the declared executor signature; feature blockers are assessed separately.
	 * A Pro without the service URL check still calls the provider_url() Lite no longer ships.
	 */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		if ( ! isset( $methods[ $name ] ) ) {
			return false;
		}
		return Pro_Dependency::methods( '\Modula_Pro\Extensions\Video\Abilities\Video_Executor', $methods[ $name ] )
			&& Pro_Dependency::methods( '\Modula_Pro\Extensions\Video\Video', array( 'supported_provider_url' => 2 ) );
	}
	public static function callbacks(): array {
		return Video_Explanation::callbacks_for( self::names() );
	}
	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( self::class, 'available' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-video' ),
			)
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
				'output_schema' => Contract::outcome( self::RESOLVE, self::RESULTS ),
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
				'output_schema' => Contract::outcome( self::UPDATE, self::RESULTS ),
			),
		);
	}
	/**
	 * Retained inspection uses current gallery and attachment rights. It does not require Pro or a provider call.
	 *
	 * @param array<string,mixed> $record Stored request record.
	 */
	public static function can_recover( array $record ): bool {
		$target = isset( $record['target'] ) ? (int) $record['target'] : 0;
		if ( ! $target || ! Update::can_update( $target ) ) {
			return false;
		}
		if ( self::UPDATE === ( $record['operation'] ?? '' ) && ! array_key_exists( 'attachment_ids', $record ) ) {
			return false;
		}
		$attachments = $record['attachment_ids'] ?? array();
		if ( ! is_array( $attachments ) ) {
			return false;
		}
		foreach ( $attachments as $id ) {
			if ( ! is_numeric( $id ) || ! Attachments::can_read( (int) $id ) ) {
				return false;
			}
		}
		return true;
	}
	/**
	 * Commercial blockers only after gallery admission. Unauthorized calls do not receive an upgrade remedy.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( string $name, array $input ): array {
		if ( ! self::actor_admitted( $name, $input ) ) {
			return array( self::permission_blocker() );
		}
		return Availability::blockers( $name );
	}
	/**
	 * @param array<string,mixed> $input
	 */
	private static function actor_admitted( string $name, array $input ): bool {
		$id = $input['id'] ?? 0;
		if ( ! is_int( $id ) || ! Update::can_update( $id ) ) {
			return false;
		}
		if ( self::UPDATE !== $name ) {
			return true;
		}
		$changes = $input['video_changes'] ?? null;
		if ( ! is_array( $changes ) ) {
			return false;
		}
		foreach ( self::referenced_attachment_ids( $changes, $id ) as $attachment ) {
			if ( ! Attachments::can_read( $attachment ) ) {
				return false;
			}
		}
		return true;
	}
	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-video',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current gallery and video attachment permissions are required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
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
}
