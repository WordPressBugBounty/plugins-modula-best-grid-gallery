<?php
/** Explicit WordPress media intake with durable progress before optional gallery composition. */
namespace Modula\V2\Abilities;
use Modula\V2\Beta_Settings;
defined( 'ABSPATH' ) || exit;
final class Intake {
	public const UPLOAD = 'modula/upload-image';
	public const ZIP = 'modula/import-zip';
	public static function operations(): array {
		return array( self::UPLOAD, self::ZIP, Server_Import::IMPORT );
	}
	public static function callbacks(): array {
		return array( Server_Import::BROWSE => array( Server_Import::class, 'browse' ), Server_Import::IMPORT => array( self::class, 'server' ), self::UPLOAD => array( self::class, 'upload' ), self::ZIP => array( self::class, 'zip' ) );
	}
	public static function can_upload(): bool {
		return get_current_user_id() && current_user_can( 'upload_files' );
	}
	public static function result_schema(): array {
		return Contract::object( array(
		'phase' => array( 'type' => 'string', 'enum' => array( 'validation', 'import', 'composition', 'completed' ) ),
		'attachment_ids' => array( 'type' => 'array', 'items' => array( 'type' => 'integer' ) ),
		'objects' => array( 'type' => 'array', 'items' => Contract::object( array( 'filename' => array( 'type' => 'string' ), 'attachment_id' => array( 'type' => 'integer' ), 'status' => array( 'type' => 'string' ), 'code' => array( 'type' => 'string' ), 'source' => array( 'type' => 'string' ), 'source_status' => array( 'type' => 'string', 'enum' => array( 'retained', 'deleted', 'delete_failed', 'uncertain' ) ) ), array( 'filename', 'attachment_id', 'status', 'code' ) ) ),
		'composition_request_id' => array( 'type' => 'string' ), 'composition_status' => array( 'type' => 'string' ),
		), array( 'phase', 'attachment_ids', 'objects' ) );
	}
	public static function definitions(): array {
		$input = Contract::object( array(
		'request_id' => Contract::request_id_schema(), 'filename' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 180 ), 'content_base64' => array( 'type' => 'string', 'minLength' => 4, 'maxLength' => 11184812 ),
		'id' => array( 'type' => 'integer', 'minimum' => 1 ), 'revision' => Contract::revision_schema(),
		), array( 'request_id', 'filename', 'content_base64' ) );
		$description = 'Explicit byte intake via WordPress sideload, upload_files required. Canonical base64 only, no remote URL or server path. Up to min(8 MiB, WordPress upload limit) and 40 million pixels per image; existing Modula/WordPress image MIME allowlists apply. Optional id plus revision explicitly append successes through gallery composition; no publication. Recover the same identity for 30 days, never reimport successes. Retained IDs and failed phase survive partial failures; bytes and paths never enter the journal.';
		return array(
		self::UPLOAD => array( 'label' => 'Upload one image', 'description' => $description, 'input_schema' => $input, 'output_schema' => Contract::outcome_schema() ),
		self::ZIP => array( 'label' => 'Import ZIP images', 'description' => $description . ' ZIP: at most 100 entries, 32 MiB expanded and 100:1 ratio per entry. Reject traversal, links, encrypted/invalid/non-image entries and duplicate basenames before importing; ignore directories and macOS metadata. Temporary staging is removed on completion or shutdown.', 'input_schema' => $input, 'output_schema' => Contract::outcome_schema() ),
		);
	}
	public static function can_recover( array $record ): bool {
		if ( Server_Import::IMPORT === $record['operation'] && ! Server_Import::can_recover( $record ) ) { return false; }
		if ( ! self::can_upload() || $record['target'] && ! Update::can_update( (int) $record['target'] ) ) {
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
		return self::execute( $input, self::UPLOAD );
	}
	public static function zip( array $input ): array {
		return self::execute( $input, self::ZIP );
	}
	public static function server( array $input ): array {
		return self::execute( $input, Server_Import::IMPORT );
	}
	private static function execute( array $input, string $operation ): array {
		$out = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, $operation );
		};
		$server = Server_Import::IMPORT === $operation;
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! self::can_upload() || $server && ! Server_Import::can_import() || isset( $input['id'] ) && ! Update::can_update( $input['id'] ) ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current upload and requested gallery permissions are required.' );
		}
		if ( isset( $input['id'] ) !== isset( $input['revision'] ) ) {
			return $out( 'rejected', 'incomplete_target', 'Supply both gallery id and revision, or neither for import only.' );
		}
		if ( isset( $input['id'] ) && ( ! Beta_Settings::is_beta_gallery( $input['id'] ) || 'trash' === get_post_status( $input['id'] ) || get_post_meta( $input['id'], '_modula_bind_target_type', true ) ) ) {
			return $out( 'rejected', 'unsupported_target', 'Only a Beta gallery outside trash and without bound membership can receive images.' );
		}
		if ( isset( $input['id'] ) && ! hash_equals( Revision::state( $input['id'] ), $input['revision'] ) ) {
			return $out( 'conflict', 'stale_revision', 'Gallery already changed; no media imported.' );
		}
		$staging = new Intake_Files();
		try {
			$files = $server ? Server_Import::prepare( $input, $staging ) : $staging->prepare( $input, self::ZIP === $operation );
		} catch ( \InvalidArgumentException $error ) {
			$staging->cleanup();
			return $out( 'rejected', $error->getMessage(), 'Invalid media or archive. No attachments were imported.' );
		} catch ( \Throwable $error ) {
			$staging->cleanup();
			return $out( 'rejected', 'staging_failed', 'Media could not be staged. No attachments were imported.' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			$staging->cleanup();
			return $existing;
		}
		$progress = array( 'phase' => 'import', 'attachment_ids' => array(), 'objects' => array() );
		$capture = null;
		try {
			if ( $server ) {
				Requests::context( $input['request_id'], array( 'source_root' => $input['root'], 'source_owners' => array_values( array_unique( array_filter( array_column( array_column( $files, 'source' ), 'owner' ) ) ) ), 'delete_sources' => $input['delete_after_import'] ) );
				foreach ( $files as $file ) {
					$progress['objects'][] = array( 'filename' => $file['name'], 'attachment_id' => 0, 'status' => 'not_started', 'code' => '', 'source' => $file['source']['path'], 'source_status' => 'retained' );
				}
			}
			Requests::context( $input['request_id'], array( 'intake' => $progress ) );
			foreach ( $files as $file_index => $file ) {
				if ( ! self::can_upload() ) {
					throw new \RuntimeException( 'Access changed.' );
				}
				$index = $server ? $file_index : count( $progress['objects'] );
				if ( $server ) {
					try { Server_Import::revalidate( $file['source'], $input['delete_after_import'] ); }
					catch ( \InvalidArgumentException $error ) {
						$progress['objects'][ $index ]['status'] = 'rejected';
						$progress['objects'][ $index ]['code'] = $error->getMessage();
						Requests::context( $input['request_id'], array( 'intake' => $progress ) );
						continue;
					}
					$progress['objects'][ $index ]['status'] = 'in_progress';
				} else {
					$progress['objects'][] = array( 'filename' => $file['name'], 'attachment_id' => 0, 'status' => 'in_progress', 'code' => '' );
				}
				Requests::context( $input['request_id'], array( 'intake' => $progress ) );
				// Record the identity before metadata generation/hooks can fail or the response can be lost.
				$capture = static function ( $id ) use ( &$progress, $index, $input ) {
					$progress['attachment_ids'][] = (int) $id;
					$progress['objects'][ $index ]['attachment_id'] = (int) $id;
					Requests::context( $input['request_id'], array( 'intake' => $progress ) );
				};
				$moved_file = '';
				$capture_file = static function ( $uploaded, $context ) use ( &$moved_file, &$progress, $index, $input ) {
					if ( 'sideload' === $context && ! empty( $uploaded['file'] ) ) {
						$moved_file = $uploaded['file'];
						// Retain only the actual unique filename, never an absolute path or provider URL.
						$progress['objects'][ $index ]['filename'] = wp_basename( $moved_file );
						Requests::context( $input['request_id'], array( 'intake' => $progress ) );
					}
					return $uploaded;
				};
				add_filter( 'wp_handle_upload', $capture_file, PHP_INT_MAX, 2 );
				add_action( 'add_attachment', $capture, -999 );
				$id = null;
				try {
					$id = media_handle_sideload( $file, 0 );
				} finally {
					remove_action( 'add_attachment', $capture, -999 );
					$capture = null;
					remove_filter( 'wp_handle_upload', $capture_file, PHP_INT_MAX );
					// An exception before add_attachment may still follow a successful row insert.
					// Preserve its bytes and record the filename; only an explicit WP_Error permits cleanup.
					if ( null === $id && $moved_file && ! $progress['objects'][ $index ]['attachment_id'] ) {
						$progress['objects'][ $index ]['status'] = 'uncertain';
						$progress['objects'][ $index ]['code'] = 'retained_file';
						Requests::context( $input['request_id'], array( 'intake' => $progress ) );
					}
					// WordPress can move bytes and then fail before inserting the attachment.
					if ( is_wp_error( $id ) && $moved_file && ! $progress['objects'][ $index ]['attachment_id'] && is_file( $moved_file ) ) {
						wp_delete_file( $moved_file );
						$retained = is_file( $moved_file );
						$progress['objects'][ $index ]['status'] = $retained ? 'uncertain' : 'rejected';
						$progress['objects'][ $index ]['code'] = $retained ? 'retained_file' : 'unattached_file_removed';
						Requests::context( $input['request_id'], array( 'intake' => $progress ) );
						if ( $retained ) { throw new \RuntimeException( 'Unattached file cleanup unconfirmed.' ); }
					}
				}
				if ( is_wp_error( $id ) ) {
					$progress['objects'][ $index ]['status'] = 'rejected';
					$progress['objects'][ $index ]['code'] = 'wordpress_import_failed';
				} else {
					if ( ! in_array( (int) $id, $progress['attachment_ids'], true ) ) {
						throw new \RuntimeException( 'Identity not recorded.' );
					}
					$progress['objects'][ $index ]['status'] = 'succeeded';
					if ( $server && $input['delete_after_import'] ) {
						// Persist uncertainty before removal, so interruption never implies a retained source.
						$progress['objects'][ $index ]['source_status'] = 'uncertain';
						Requests::context( $input['request_id'], array( 'intake' => $progress ) );
						try {
							$source_path = Server_Import::revalidate( $file['source'], true );
							wp_delete_file( $source_path );
							clearstatcache( true, $source_path );
							$progress['objects'][ $index ]['source_status'] = file_exists( $source_path ) || is_link( $source_path ) ? 'delete_failed' : 'deleted';
						} catch ( \InvalidArgumentException $error ) {
							$progress['objects'][ $index ]['source_status'] = 'delete_failed';
						}
						if ( 'deleted' !== $progress['objects'][ $index ]['source_status'] ) {
							$progress['objects'][ $index ]['status'] = 'partial';
							$progress['objects'][ $index ]['code'] = 'source_removal_unconfirmed';
						}
					}
				}
				Requests::context( $input['request_id'], array( 'intake' => $progress ) );
			}
			$failed = count( array_filter( $progress['objects'], static function ( $row ) {
				return 'succeeded' !== $row['status'];
			} ) );
			$status = $failed ? ( $progress['attachment_ids'] ? 'partial' : 'rejected' ) : 'succeeded';
			$code = $failed ? 'import_incomplete' : '';
			if ( isset( $input['id'] ) && $progress['attachment_ids'] ) {
				$progress['phase'] = 'composition';
				$progress['composition_request_id'] = 'intake-' . hash( 'sha256', $input['request_id'] );
				Requests::context( $input['request_id'], array( 'intake' => $progress ) );
				$composed = Composition::execute( array( 'request_id' => $progress['composition_request_id'], 'id' => $input['id'], 'revision' => $input['revision'], 'changes' => array_map( static function ( $id ) {
					return array( 'action' => 'add', 'id' => $id );
				} , $progress['attachment_ids'] ) ) );
				$progress['composition_status'] = $composed['status'];
				if ( 'succeeded' !== $composed['status'] ) {
					$status = 'partial';
					$code = 'composition_' . $composed['code'];
				}
			}
			if ( 'succeeded' === $status ) {
				$progress['phase'] = 'completed';
			} elseif ( $failed && ( ! isset( $progress['composition_status'] ) || 'succeeded' === $progress['composition_status'] ) ) {
				$progress['phase'] = 'import';
			}
			Requests::context( $input['request_id'], array( 'intake' => $progress ) );
			$result = $out( $status, $code, 'succeeded' === $status ? '' : 'Inspect retained attachments and the failed phase. Replay or recover this identity; do not reimport successes.' );
			$result['intake'] = $progress;
			return Requests::finish( $input['request_id'], $result );
		} catch ( \Throwable $error ) {
			// Keep already-recorded identities even when a later hook or confirmation fails.
			$result = $out( 'uncertain', 'intake_unconfirmed', 'Import or composition was interrupted. Inspect the retained attachments and phase before a new action.' );
			$result['intake'] = $progress;
			return Requests::finish( $input['request_id'], $result );
		} finally {
			if ( $capture ) {
				remove_action( 'add_attachment', $capture, -999 );
			}
			$staging->cleanup();
		}
	}
}
