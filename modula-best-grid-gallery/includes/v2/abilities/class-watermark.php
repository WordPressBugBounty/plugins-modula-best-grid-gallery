<?php
/** Watermark ability descriptors and retained-result authorization. Pro owns file effects. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;

defined( 'ABSPATH' ) || exit;

final class Watermark {
	public const READ   = 'modula/read-watermark-state';
	public const APPLY  = 'modula/apply-watermark';
	public const REMOVE = 'modula/remove-watermark';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target gallery. */
	private const RESULTS = array( 'watermark' );

	public static function available( string $name = self::READ ): bool {
		if ( ! in_array( $name, self::names(), true ) ) {
			return false;
		}
		return Settings_Contract::extension( 'modula-watermark' ) && Pro_Dependency::host_executor_ready( $name );
	}

	/** @return array<int,string> */
	public static function mutations(): array {
		return array( self::APPLY, self::REMOVE );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return array( self::READ, self::APPLY, self::REMOVE );
	}

	/**
	 * Signature contract for the Pro watermark executor. Lite checks it without constructing Pro.
	 * An executor without referenced_attachment_ids still expects the settings helpers Lite no longer ships.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys(
			self::names(),
			array(
				'run'                       => 2,
				'referenced_attachment_ids' => 2,
			)
		);
	}

	/**
	 * Inspect only the declared executor signature; feature blockers are assessed separately.
	 */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		if ( ! isset( $methods[ $name ] ) ) {
			return false;
		}
		return Pro_Dependency::methods( '\Modula_Pro\Extensions\Watermark\Abilities\Watermark_Executor', $methods[ $name ] );
	}

	/** @return array<string,callable> */
	public static function callbacks(): array {
		return Watermark_Explanation::callbacks_for( self::names() );
	}

	/** @return array<string,array<string,mixed>> */
	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( self::class, 'available' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-watermark' ),
			),
			array(
				self::APPLY  => array( 'destructive' => true ),
				self::REMOVE => array( 'destructive' => true ),
			)
		);
	}

	/** @return array<string,mixed> */
	public static function result_schema(): array {
		return Contract::object(
			array(
				'attachment_id'   => array( 'type' => 'integer' ),
				'revision'        => Contract::revision_schema(),
				'sha256'          => Contract::revision_schema(),
				'original_sha256' => Contract::revision_schema(),
				'backup'          => array( 'type' => 'boolean' ),
				'applied'         => array( 'type' => 'boolean' ),
				'original'        => array( 'type' => 'string' ),
				'derivatives'     => array( 'type' => 'string' ),
				'phase'           => array( 'type' => 'string' ),
			),
			array( 'attachment_id', 'phase', 'original', 'derivatives' )
		);
	}

	/** @return array<string,array<string,mixed>> */
	public static function definitions(): array {
		$fields      = array(
			'id'            => array(
				'type'    => 'integer',
				'minimum' => 1,
			),
			'attachment_id' => array(
				'type'    => 'integer',
				'minimum' => 1,
			),
		);
		$definitions = array(
			self::READ => array(
				'label'         => 'Inspect watermark file state',
				'description'   => 'Pure local file and backup inspection for one explicit attachment in an editable Beta gallery. Revision covers gallery settings, shared files and backup bytes. No filesystem paths returned. Requires the editor Watermark extension; Lite explains that requirement before reading files.',
				'input_schema'  => Contract::object( $fields, array_keys( $fields ) ),
				'output_schema' => Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'watermark'      => self::result_schema(),
						),
						array( 'schema_version', 'watermark' )
					)
				),
			),
		);
		foreach ( self::mutations() as $name ) {
			$definitions[ $name ] = array(
				'label'         => self::APPLY === $name ? 'Apply shared watermark' : 'Restore shared watermark backup',
				'description'   => 'One explicit local JPEG/PNG/GIF/WebP image (at most 80 MiB, 40 million pixels) in a Beta gallery; current extension and gallery/attachment rights required. First save watermark settings separately with update-gallery. Rewrites the shared original and regenerates derivatives through the existing Watermark service. Every gallery using this attachment sees the effect; text and composition stay intact. Removal/reapply requires a safe existing backup. Partial or interrupted file effects are retained as uncertain and never retried by replay. Use read-watermark-state revision. Recover for 30 days. Requires the editor Watermark extension; Lite explains that requirement before rewriting files.',
				'input_schema'  => Contract::object(
					$fields + array(
						'revision'   => Contract::revision_schema(),
						'request_id' => Contract::request_id_schema(),
					),
					array( 'id', 'attachment_id', 'revision', 'request_id' )
				),
				'output_schema' => Contract::outcome( $name, self::RESULTS ),
			);
		}
		return $definitions;
	}

	/**
	 * Attachment recorded for a Lite rejection. Pro records the mark image too when it applies a watermark.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,int>
	 */
	public static function referenced_attachment_ids( array $input ): array {
		return array( (int) $input['attachment_id'] );
	}

	/**
	 * Retained inspection uses current gallery and attachment rights. It does not require Pro or another file effect.
	 *
	 * @param array<string,mixed> $record Stored request record.
	 */
	public static function can_recover( array $record ): bool {
		$target = isset( $record['target'] ) ? (int) $record['target'] : 0;
		if ( $target < 1 || ! Update::can_update( $target ) ) {
			return false;
		}
		$attachments = $record['attachment_ids'] ?? null;
		if ( ! is_array( $attachments ) || array() === $attachments ) {
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
	 * Permission and target blockers precede commercial remedies.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( string $name, array $input ): array {
		if ( ! self::actor_admitted( $name, $input ) ) {
			return array( self::permission_blocker() );
		}
		if ( ! self::target_eligible( $input ) ) {
			return array( self::unsupported_blocker() );
		}
		return Availability::blockers( $name );
	}

	/**
	 * @param array<string,mixed> $input
	 */
	private static function actor_admitted( string $name, array $input ): bool {
		if ( ! in_array( $name, self::names(), true ) ) {
			return false;
		}
		$id         = $input['id'] ?? null;
		$attachment = $input['attachment_id'] ?? null;
		return is_int( $id ) && is_int( $attachment ) && Update::can_update( $id ) && Attachments::can_read( $attachment );
	}

	/**
	 * Gallery membership only. File hashes and the watermark service stay on the Pro executor.
	 *
	 * @param array<string,mixed> $input
	 */
	private static function target_eligible( array $input ): bool {
		$id         = (int) $input['id'];
		$attachment = (int) $input['attachment_id'];
		if ( ! Beta_Settings::is_beta_gallery( $id ) || 'trash' === get_post_status( $id ) || self::is_bound_gallery( $id ) ) {
			return false;
		}
		foreach ( Meta_Sync::get_images_v2( $id ) as $row ) {
			if ( (string) ( $row['id'] ?? '' ) === (string) $attachment ) {
				return true;
			}
		}
		return false;
	}

	public static function is_bound_gallery( int $id ): bool {
		$bound = get_post_meta( $id, '_modula_bind_target_type', true );
		return is_string( $bound ) && '' !== $bound;
	}

	/**
	 * Pro reuses it when the actor cannot read the configured mark image.
	 *
	 * @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}}
	 */
	public static function permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-watermark',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current gallery and attachment permissions are required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function unsupported_blocker(): array {
		return array(
			'reason'  => 'unsupported_context',
			'feature' => 'modula-watermark',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Watermark inspection applies to one image in an editable Beta gallery that is not bound to another source.', 'modula-best-grid-gallery' ),
			),
		);
	}
}
