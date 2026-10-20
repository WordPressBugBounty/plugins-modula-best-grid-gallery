<?php
/** Explicit WordPress media intake with durable progress before optional gallery composition. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;
final class Intake {
	public const PROVIDER = 'modula-lite-intake';
	public const UPLOAD   = 'modula/upload-image';
	public const ZIP      = 'modula/import-zip';
	/** Outcome results every intake operation sets, server import included; Contract::outcome() adds the target gallery. */
	public const RESULTS = array( 'intake' );

	/** @return array<int,string> */
	public static function premium(): array {
		return array_keys( self::executor_methods() );
	}

	/**
	 * Signature contract for the Pro intake executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array(
			self::ZIP             => array(
				'zip'        => 1,
				'operations' => 0,
			),
			Server_Import::BROWSE => array(
				'browse'     => 1,
				'operations' => 0,
			),
			Server_Import::IMPORT => array(
				'import'     => 1,
				'operations' => 0,
			),
		);
	}

	/**
	 * Inspect the executor signature without constructing a service.
	 * An executor without its own MAX_EXPANDED still reads the archive limits Lite no longer ships.
	 */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Abilities\Intake_Executor', $methods[ $name ] ) && defined( '\Modula_Pro\Abilities\Intake_Executor::MAX_EXPANDED' );
	}

	public static function operations(): array {
		return array( self::UPLOAD, self::ZIP, Server_Import::IMPORT );
	}

	public static function boot(): void {
		Providers::contribute(
			array(
				'provider'   => self::PROVIDER,
				'protocol'   => Providers::PROTOCOL,
				'operations' => array(
					self::UPLOAD => array( 'execute' => array( self::class, 'upload' ) ),
				),
			)
		);
		Outcomes::register_recovery( self::UPLOAD, array( self::class, 'can_recover' ) );
	}

	public static function callbacks(): array {
		return array(
			self::UPLOAD => array( self::class, 'upload' ),
		) + Intake_Explanation::callbacks_for( self::premium() );
	}
	public static function abilities(): array {
		$upload = array(
			'permission' => array( self::class, 'can_upload' ),
			'available'  => array( self::class, 'can_upload' ),
		);
		// requires_pro already reports the editor's Compatible Pro gate before any executor runs.
		$premium = array(
			'permission'     => array( self::class, 'can_upload' ),
			'requires_pro'   => true,
			'executor_ready' => array( self::class, 'executor_ready' ),
			'gates'          => array(
				array( self::class, 'can_upload' ),
			),
		);
		$import  = array(
			'permission'     => array( Server_Import::class, 'can_import' ),
			'requires_pro'   => true,
			'executor_ready' => array( self::class, 'executor_ready' ),
			'gates'          => array(
				array( Server_Import::class, 'can_import' ),
				array( self::class, 'can_upload' ),
			),
		);
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(),
			array(
				Server_Import::BROWSE => $import,
				Server_Import::IMPORT => $import + array( 'destructive' => true ),
				self::UPLOAD          => $upload,
				self::ZIP             => $premium,
			)
		);
	}
	public static function can_upload(): bool {
		return get_current_user_id() && current_user_can( 'upload_files' );
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'phase'                  => array(
					'type' => 'string',
					'enum' => array( 'validation', 'import', 'composition', 'completed' ),
				),
				'attachment_ids'         => array(
					'type'  => 'array',
					'items' => array( 'type' => 'integer' ),
				),
				'objects'                => array(
					'type'  => 'array',
					'items' => Contract::object(
						array(
							'filename'      => array( 'type' => 'string' ),
							'attachment_id' => array( 'type' => 'integer' ),
							'status'        => array( 'type' => 'string' ),
							'code'          => array( 'type' => 'string' ),
							'source'        => array( 'type' => 'string' ),
							'source_status' => array(
								'type' => 'string',
								'enum' => array( 'retained', 'deleted', 'delete_failed', 'uncertain' ),
							),
						),
						array( 'filename', 'attachment_id', 'status', 'code' )
					),
				),
				'composition_request_id' => array( 'type' => 'string' ),
				'composition_status'     => array( 'type' => 'string' ),
			),
			array( 'phase', 'attachment_ids', 'objects' )
		);
	}
	public static function definitions(): array {
		$input       = Contract::object(
			array(
				'request_id'     => Contract::request_id_schema(),
				'filename'       => array(
					'type'      => 'string',
					'minLength' => 1,
					'maxLength' => 180,
				),
				'content_base64' => array(
					'type'      => 'string',
					'minLength' => 4,
					'maxLength' => 11184812,
				),
				'id'             => array(
					'type'    => 'integer',
					'minimum' => 1,
				),
				'revision'       => Contract::revision_schema(),
			),
			array( 'request_id', 'filename', 'content_base64' )
		);
		$description = 'Explicit byte intake via WordPress sideload, upload_files required. Canonical base64 only, no remote URL or server path. Up to min(8 MiB, WordPress upload limit) and 40 million pixels per image; existing Modula/WordPress image MIME allowlists apply. Optional id plus revision explicitly append successes through gallery composition; no publication. Recover the same identity for 30 days, never reimport successes. Retained IDs and failed phase survive partial failures; bytes and paths never enter the journal.';
		return array(
			self::UPLOAD => array(
				'label'         => 'Upload one image',
				'description'   => $description,
				'input_schema'  => $input,
				'output_schema' => Contract::outcome( self::UPLOAD, self::RESULTS ),
			),
			self::ZIP    => array(
				'label'         => 'Import ZIP images',
				'description'   => $description . ' ZIP: at most 100 entries, 32 MiB expanded and 100:1 ratio per entry. Reject traversal, links, encrypted/invalid/non-image entries and duplicate basenames before importing; ignore directories and macOS metadata. Temporary staging is removed on completion or shutdown. Requires the editor Compatible Pro gate; Lite explains that requirement before staging.',
				'input_schema'  => $input,
				'output_schema' => Contract::outcome( self::ZIP, self::RESULTS ),
			),
		);
	}
	public static function can_recover( array $record ): bool {
		if ( Server_Import::IMPORT === $record['operation'] && ! Server_Import::can_recover( $record ) ) {
			return false;
		}
		if ( ! self::can_upload() || ( $record['target'] && ! Update::can_update( (int) $record['target'] ) ) ) {
			return false;
		}
		foreach ( $record['intake']['attachment_ids'] ?? array() as $id ) {
			if ( 'attachment' !== get_post_type( $id ) || ! current_user_can( 'edit_post', $id ) ) {
				return false;
			}
		}
		return true;
	}
	public static function upload( array $input ): array {
		$existing = Requests::existing( $input, self::UPLOAD );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! self::can_upload() || ( isset( $input['id'] ) && ! Update::can_update( $input['id'] ) ) ) {
			return Requests::outcome( $input['request_id'], 'forbidden', 'current_permission_denied', 'Current upload and gallery permissions are required.', self::UPLOAD );
		}
		$invalid = Intake_Target::validate( $input, self::UPLOAD );
		if ( null !== $invalid ) {
			return $invalid;
		}
		$staging = new Intake_Files();
		try {
			$files = $staging->prepare( $input );
		} catch ( \InvalidArgumentException $error ) {
			$staging->cleanup();
			return Requests::outcome( $input['request_id'], 'rejected', $error->getMessage(), 'Invalid image. No attachment was imported.', self::UPLOAD );
		} catch ( \Throwable $error ) {
			$staging->cleanup();
			return Requests::outcome( $input['request_id'], 'rejected', 'staging_failed', 'Image could not be staged.', self::UPLOAD );
		}
		try {
			$existing = Requests::claim( $input, self::UPLOAD );
			if ( null !== $existing ) {
				return $existing;
			}
			return self::import_image( $input, $files[0] );
		} finally {
			$staging->cleanup();
		}
	}

	/** A single free upload retains inserted identities before later hooks can fail. */
	private static function import_image( array $input, array $file ): array {
		$progress = array(
			'phase'          => 'import',
			'attachment_ids' => array(),
			'objects'        => array(
				array(
					'filename'      => $file['name'],
					'attachment_id' => 0,
					'status'        => 'in_progress',
					'code'          => '',
				),
			),
		);
		try {
			if ( ! self::can_upload() || ( isset( $input['id'] ) && ! Update::can_update( $input['id'] ) ) ) {
				return Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'forbidden', 'current_permission_denied', 'Current upload and gallery permissions are required.', self::UPLOAD ) );
			}
			Requests::context( $input['request_id'], array( 'intake' => $progress ) );
			$id = Intake_Attachment::import( $file, $input['request_id'], $progress, 0 );
			if ( is_wp_error( $id ) ) {
				$progress['objects'][0]['status'] = 'rejected';
				$progress['objects'][0]['code']   = 'wordpress_import_failed';
				$status                           = 'rejected';
				$code                             = 'import_incomplete';
			} else {
				if ( ! in_array( (int) $id, $progress['attachment_ids'], true ) ) {
					throw new \RuntimeException( 'Identity not recorded.' );
				}
				$progress['objects'][0]['status'] = 'succeeded';
				$status                           = 'succeeded';
				$code                             = '';
			}
			$composed = Intake_Target::compose( $input, $progress );
			if ( null !== $composed && 'succeeded' !== $composed['status'] ) {
				$status = 'partial';
				$code   = 'composition_' . $composed['code'];
			}
			if ( 'succeeded' === $status ) {
				$progress['phase'] = 'completed';
			}
		} catch ( \Throwable $error ) {
			$status = 'uncertain';
			$code   = 'intake_unconfirmed';
		}
		Requests::context( $input['request_id'], array( 'intake' => $progress ) );
		$result           = Requests::outcome( $input['request_id'], $status, $code, 'succeeded' === $status ? '' : 'Inspect retained attachments and the failed phase; recover this identity before a new action.', self::UPLOAD );
		$result['intake'] = $progress;
		return Requests::finish( $input['request_id'], $result );
	}
}
