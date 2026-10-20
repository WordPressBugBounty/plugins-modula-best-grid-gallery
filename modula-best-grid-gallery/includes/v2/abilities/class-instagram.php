<?php
/** Instagram ability descriptors and retained-result authorization. Pro owns provider and import effects. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;

defined( 'ABSPATH' ) || exit;

final class Instagram {
	public const READ = 'modula/read-instagram-state';
	public const SYNC = 'modula/sync-instagram-gallery';

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target gallery too. */
	private const RESULTS = array( 'instagram', 'gallery' );

	/** @return array<int,string> */
	public static function names(): array {
		return array( self::READ, self::SYNC );
	}

	/**
	 * Signature contract for the Pro Instagram executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		// account_configured marks an executor that owns the account checks Lite no longer ships.
		return array_fill_keys(
			self::names(),
			array(
				'run'                => 2,
				'account_configured' => 0,
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
		return Pro_Dependency::methods( '\Modula_Pro\Extensions\Instagram\Abilities\Instagram_Executor', $methods[ $name ] );
	}

	public static function available(): bool {
		return Settings_Contract::extension( 'modula-instagram' ) && Pro_Dependency::host_executor_ready( self::SYNC );
	}

	public static function callbacks(): array {
		return Instagram_Explanation::callbacks_for( self::names() );
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'available'      => array( self::class, 'available' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'features'       => array( 'modula-instagram' ),
			)
		);
	}

	/**
	 * Retained inspection uses current gallery and attachment rights. It does not require Pro or a provider call.
	 *
	 * @param array<string,mixed> $record Stored request record.
	 */
	public static function can_recover( array $record ): bool {
		$target = isset( $record['target'] ) ? (int) $record['target'] : 0;
		if ( $target < 1 || ! Update::can_update( $target ) || ! current_user_can( 'upload_files' ) ) {
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

	public static function target_eligible( int $id ): bool {
		return Beta_Settings::is_beta_gallery( $id ) && 'trash' !== get_post_status( $id ) && ! get_post_meta( $id, '_modula_bind_target_type', true );
	}

	public static function result_schema(): array {
		return Contract::object(
			array(
				'phase'          => array( 'type' => 'string' ),
				'attachment_ids' => array(
					'type'  => 'array',
					'items' => array( 'type' => 'integer' ),
				),
				'added_ids'      => array(
					'type'  => 'array',
					'items' => array( 'type' => 'integer' ),
				),
				'failed'         => array( 'type' => 'integer' ),
				'complete'       => array( 'type' => 'boolean' ),
				'after'          => array( 'type' => 'string' ),
			),
			array( 'phase', 'attachment_ids', 'added_ids', 'failed', 'complete' )
		);
	}

	public static function definitions(): array {
		$id = array(
			'id' => array(
				'type'    => 'integer',
				'minimum' => 1,
			),
		);
		return array(
			self::READ => array(
				'label'         => 'Read local Instagram account and gallery state',
				'description'   => 'Sanitized local configured/expired state and account/gallery revision. No tokens, account refresh, provider calls, cache mutation or synchronization. Requires editable Beta gallery and active eligible Instagram extension.',
				'input_schema'  => Contract::object( $id, array( 'id' ) ),
				'output_schema' => Contract::admitting(
					Contract::object(
						array(
							'configured' => array( 'type' => 'boolean' ),
							'revision'   => Contract::revision_schema(),
						),
						array( 'configured', 'revision' )
					)
				),
			),
			self::SYNC => array(
				'label'         => 'Explicitly sync Instagram media into a Beta gallery',
				'description'   => 'Uses only the existing configured account and existing image intake services. No credentials or arbitrary source URLs accepted. One provider page, at most 50 supported images; max_items defaults to 20. refresh=true bypasses the shared image cache; false can reuse it. after continues a returned cursor with a NEW request and current state revision after inspecting partial results. Imports retain Instagram attachment identities and gallery upload-position ordering. No automatic/background sync is enabled. Media files may remain after gallery conflicts; results list retained attachments and confirmed added IDs. Partial/uncertain effects never retry on replay. Recover the same request_id for 30 days.',
				'input_schema'  => Contract::object(
					$id + array(
						'revision'   => Contract::revision_schema(),
						'request_id' => Contract::request_id_schema(),
						'max_items'  => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 50,
							'default' => 20,
						),
						'refresh'    => array(
							'type'    => 'boolean',
							'default' => true,
						),
						'after'      => array(
							'type'      => 'string',
							'maxLength' => 2000,
							'pattern'   => '^[A-Za-z0-9_=-]+$',
						),
					),
					array( 'id', 'revision', 'request_id' )
				),
				'output_schema' => Contract::outcome( self::SYNC, self::RESULTS ),
			),
		);
	}

	/**
	 * Permission and target blockers precede commercial and configuration remedies.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( string $name, array $input ): array {
		if ( ! self::actor_admitted( $name, $input ) ) {
			return array( self::permission_blocker() );
		}
		$id = (int) $input['id'];
		if ( ! self::target_eligible( $id ) ) {
			return array( self::unsupported_blocker() );
		}
		return Availability::blockers( $name );
	}

	/**
	 * @param array<string,mixed> $input
	 */
	private static function actor_admitted( string $name, array $input ): bool {
		$id = $input['id'] ?? 0;
		if ( ! in_array( $name, self::names(), true ) || ! is_int( $id ) || ! Update::can_update( $id ) || ! current_user_can( 'upload_files' ) ) {
			return false;
		}
		return true;
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'modula-instagram',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current gallery and upload permissions are required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
	}

	/** @return array{reason:string,feature:string,remedy:array{action:string,explanation:string}} */
	private static function unsupported_blocker(): array {
		return array(
			'reason'  => 'unsupported_context',
			'feature' => 'modula-instagram',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Instagram sync applies to an editable Beta gallery that is not bound to another source.', 'modula-best-grid-gallery' ),
			),
		);
	}
}
