<?php
/** Explicit shared-byte replacement through the existing Folders file service. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Mutation_Lock;
use WPChill\Folders\Rest\File_Ops_Controller;
use WPChill\Folders\Storage\Option_Provider_Map_Repository;
defined( 'ABSPATH' ) || exit;
final class Replacement {
	public const READ  = 'modula/read-attachment-file';
	public const WRITE = 'modula/replace-attachment-file';
	public static function available(): bool {
		return Media_Folders::can_manage() && class_exists( File_Ops_Controller::class ) && class_exists( Mutation_Lock::class );
	}
	public static function callbacks(): array {
		return array(
			self::READ  => array( self::class, 'read' ),
			self::WRITE => array( self::class, 'execute' ),
		); }
	public static function result_schema(): array {
		return Contract::object(
			array(
				'id'                   => array( 'type' => 'integer' ),
				'revision'             => Contract::revision_schema(),
				'sha256'               => Contract::revision_schema(),
				'phase'                => array( 'type' => 'string' ),
				'original'             => array( 'type' => 'string' ),
				'derivatives'          => array( 'type' => 'string' ),
				'previous_derivatives' => array( 'type' => 'string' ),
			),
			array( 'id', 'phase', 'original', 'derivatives' )
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
			self::READ  => array(
				'label'         => 'Read shared attachment file',
				'description'   => 'Pure inspection of a local image: fingerprint includes actual original/derivative bytes, attachment state and storage organization. No paths or bytes returned. Use this revision for replacement.',
				'input_schema'  => Contract::object( $id, array( 'id' ) ),
				'output_schema' => Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'file'           => self::result_schema(),
					),
					array( 'schema_version', 'file' )
				),
			),
			self::WRITE => array(
				'label'         => 'Replace shared attachment file',
				'description'   => 'Explicitly replace a local image shared by all galleries through the existing file service; preserve attachment identity, text, URL and gallery composition. Same MIME as existing filename. Canonical base64, at most min(8 MiB, upload limit), 40 million pixels. Remote media and unsafe paths refused. Requires read-attachment-file revision and current upload/edit/read rights. Regenerates current WordPress derivatives and invalidates recorded Modula crops; previous unreferenced derivatives/backups remain as in the existing flow. No automatic rollback of bytes or retry. Recover the same identity for 30 days.',
				'input_schema'  => Contract::object(
					$id + array(
						'revision'       => Contract::revision_schema(),
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
					),
					array( 'id', 'revision', 'request_id', 'filename', 'content_base64' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
		);
	}
	public static function can_recover( array $record ): bool {
		return self::available() && Attachments::can_read( (int) $record['target'] ); }
	/** Modula records on-demand crop suffixes in attachment metadata. */
	private static function crops( int $id ): array {
		$file  = get_attached_file( $id, true );
		$meta  = wp_get_attachment_metadata( $id, true );
		$info  = pathinfo( $file );
		$paths = array();
		foreach ( $meta['image_meta']['resized_images'] ?? array() as $suffix ) {
			if ( ! is_string( $suffix ) || ! preg_match( '/^[0-9]+x[0-9]+(?:_[a-z]+)*$/D', $suffix ) ) {
				throw new \DomainException( 'unsafe_crop' ); }
			$path = $info['dirname'] . '/' . $info['filename'] . '-' . $suffix . '.' . $info['extension'];
			if ( is_file( $path ) ) {
				$paths[] = $path; }
		}
		return array_unique( $paths );
	}

	private static function paths( int $id ): array {
		if ( ( new \WPChill\Folders\Storage\Folder_Transfer_State() )->has_active() ) {
			throw new \DomainException( 'transfer_active' ); }
		$folder_id = ( new \WPChill\Folders\Memberships\Wpdb_Membership_Repository() )->folder_for_object( $id, 'attachment' );
		$folder    = $folder_id ? \WPChill\Folders\Rest\Folders_Controller::service()->find( $folder_id ) : null;
		if ( ! empty( $folder['connection_id'] ) ) {
			throw new \DomainException( 'local_image_required' ); }
		if ( 'trash' === get_post_status( $id ) || ( new Option_Provider_Map_Repository() )->find_by_attachment( $id ) ) {
			throw new \DomainException( 'local_image_required' ); }
		$original = get_attached_file( $id, true );
		$base     = realpath( wp_get_upload_dir()['basedir'] );
		if ( ! $original || ! $base || ! is_file( $original ) || ! wp_attachment_is_image( $id ) ) {
			throw new \DomainException( 'local_image_required' ); }
		$paths = array_merge( array( $original ), self::crops( $id ) );
		$meta  = wp_get_attachment_metadata( $id, true );
		foreach ( array( 'original_image', 'thumb', 'source_image', 'animated_video', 'animated_video_poster' ) as $field ) {
			if ( ! empty( $meta[ $field ] ) ) {
				$paths[] = dirname( $original ) . '/' . $meta[ $field ]; }
		}
		foreach ( array_merge( $meta['sizes'] ?? array(), (array) get_post_meta( $id, '_wp_attachment_backup_sizes', true ) ) as $size ) {
			if ( ! empty( $size['file'] ) ) {
				$paths[] = dirname( $original ) . '/' . $size['file']; }
		}
		foreach ( $paths as $path ) {
			$resolved = realpath( $path );
			if ( is_link( $path ) || false !== strpos( $path, '..' ) || ! $resolved || 0 !== strpos( $resolved, $base . DIRECTORY_SEPARATOR ) ) {
				throw new \DomainException( 'unsafe_or_missing_file' ); }
		}
		return array_values( array_unique( $paths ) );
	}
	private static function inspect( int $id, bool $lock = false ): array {
		$document     = Revision::document( $id, $lock );
		$organization = Revision::organization( $lock );
		$hashes       = array();
		foreach ( self::paths( $id ) as $path ) {
			$hash = hash_file( 'sha256', $path );
			if ( ! $hash ) {
				throw new \RuntimeException( 'File unreadable.' ); }
			$hashes[] = $hash;
		}
		return array(
			'id'          => $id,
			'revision'    => hash( 'sha256', wp_json_encode( array( $document, $organization, $hashes ) ) ),
			'sha256'      => $hashes[0],
			'phase'       => 'inspection',
			'original'    => 'present',
			'derivatives' => 'present',
		);
	}
	public static function read( array $input ) {
		if ( ! self::available() || ! Attachments::can_read( $input['id'] ) ) {
			return new \WP_Error( 'modula_forbidden', 'Current attachment permissions required.' ); }
		try {
			return Mutation_Lock::run(
				'attachment:' . $input['id'],
				static function () use ( $input ) {
					$first = self::inspect( $input['id'] );
					if ( self::inspect( $input['id'] ) !== $first ) {
						throw new \RuntimeException( 'Read changed.' ); }
					return array(
						'schema_version' => Contract::VERSION,
						'file'           => $first,
					);
				}
			);
		} catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_file_unavailable', 'A stable accessible local image is required.' ); }
	}
	public static function execute( array $input ): array {
		$existing = Requests::existing( $input, self::WRITE );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Inspect the retained file state before any new operation.' : '', self::WRITE );
		};
		if ( ! self::can_recover( array( 'target' => $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		$staging = new Intake_Files();
		try {
			$file = $staging->prepare( $input, false )[0]; } catch ( \Throwable $error ) {
			$staging->cleanup();
			return $out( 'rejected', 'invalid_image' ); }
			$existing = Requests::claim( $input, self::WRITE );
			if ( null !== $existing ) {
				$staging->cleanup();
				return $existing; }
			$progress = array(
				'id'          => $input['id'],
				'phase'       => 'validation',
				'original'    => 'unchanged',
				'derivatives' => 'unchanged',
			);
			try {
				Requests::context(
					$input['request_id'],
					array(
						'file' => array_replace(
							$progress,
							array(
								'original'    => 'uncertain',
								'derivatives' => 'uncertain',
							)
						),
					)
				);
				$locked_result = Mutation_Lock::run(
					'attachment:' . $input['id'],
					static function () use ( $input, $file, $out, &$progress ) {
						$active  = false;
						$started = false;
						try {
							Revision::begin();
							$active  = true;
							$current = self::inspect( $input['id'], true );
							if ( ! hash_equals( $current['revision'], $input['revision'] ) ) {
								throw new \DomainException( 'stale_revision' ); }
							if ( ! self::can_recover( array( 'target' => $input['id'] ) ) ) {
								throw new \DomainException( 'current_permission_denied' ); }
							$paths = self::paths( $input['id'] );
							$crops = self::crops( $input['id'] );
							$type  = wp_check_filetype( basename( $paths[0] ) );
							if ( get_post_mime_type( $input['id'] ) !== $file['type'] || $file['type'] !== $type['type'] ) {
								throw new \DomainException( 'mime_mismatch' ); }
							$progress['phase']       = 'replacement';
							$progress['original']    = 'uncertain';
							$progress['derivatives'] = 'uncertain';
							// Initial durable record already identifies the target. DB locks span byte and metadata writes.
							$started        = true;
							$expected_sizes = wp_get_registered_image_subsizes();
							$capture_sizes  = static function ( $sizes ) use ( &$expected_sizes ) {
								$expected_sizes = $sizes;
								return $sizes;
							};
							add_filter( 'intermediate_image_sizes_advanced', $capture_sizes, PHP_INT_MAX );
							$no_scale = static function () {
								return false;
							};
							add_filter( 'big_image_size_threshold', $no_scale, PHP_INT_MAX );
							try {
								$result = File_Ops_Controller::ops()->replace(
									array(
										'attachment_id' => $input['id'],
										'contents'      => file_get_contents( $file['tmp_name'] ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Validated local staging file.
										'mime'          => $file['type'],
									)
								); } finally {
								remove_filter( 'big_image_size_threshold', $no_scale, PHP_INT_MAX );
								remove_filter( 'intermediate_image_sizes_advanced', $capture_sizes, PHP_INT_MAX ); }
								if ( is_wp_error( $result ) || hash_file( 'sha256', $paths[0] ) !== hash_file( 'sha256', $file['tmp_name'] ) ) {
									throw new \RuntimeException( 'Replacement unconfirmed.' ); }
								$meta       = wp_get_attachment_metadata( $input['id'], true );
								$dimensions = wp_getimagesize( $paths[0] );
								if ( (int) ( $meta['width'] ?? 0 ) !== $dimensions[0] || (int) ( $meta['height'] ?? 0 ) !== $dimensions[1] ) {
									throw new \RuntimeException( 'Metadata unconfirmed.' ); }
								foreach ( $expected_sizes as $name => $size ) {
									$resize = image_resize_dimensions( $dimensions[0], $dimensions[1], $size['width'], $size['height'], $size['crop'] );
									if ( $resize && ( empty( $meta['sizes'][ $name ]['file'] ) || ! is_file( dirname( $paths[0] ) . '/' . $meta['sizes'][ $name ]['file'] ) || (int) $meta['sizes'][ $name ]['width'] !== $resize[4] || (int) $meta['sizes'][ $name ]['height'] !== $resize[5] ) ) {
										throw new \RuntimeException( 'Derivative generation incomplete.' ); }
								}
								foreach ( $crops as $crop ) {
									wp_delete_file( $crop );
									clearstatcache( true, $crop );
									if ( file_exists( $crop ) ) {
										throw new \RuntimeException( 'Crop invalidation unconfirmed.' ); }
								}
								$progress                         = self::inspect( $input['id'] );
								$progress['phase']                = 'completed';
								$progress['original']             = 'replaced';
								$progress['derivatives']          = 'regenerated_crops_invalidated';
								$progress['previous_derivatives'] = 'retained';
								Revision::end( true );
								$active = false;
								Requests::context( $input['request_id'], array( 'file' => $progress ) );
								return Requests::finish( $input['request_id'], $out( 'succeeded' ) + array( 'file' => $progress ) );
						} catch ( \Throwable $error ) {
							if ( $active ) {
								Revision::end( false ); }
							if ( $started ) {
								$path                 = get_attached_file( $input['id'], true );
								$progress['original'] = is_file( $path ) && hash_file( 'sha256', $path ) === hash_file( 'sha256', $file['tmp_name'] ) ? 'replaced' : 'uncertain';
							}
							$code = ! $started && $error instanceof \DomainException ? $error->getMessage() : 'replacement_unconfirmed';
							return Requests::finish( $input['request_id'], $out( $started ? 'uncertain' : ( 'stale_revision' === $code ? 'conflict' : 'rejected' ), $code ) + array( 'file' => $progress ) );
						}
					}
				);
				return is_wp_error( $locked_result ) ? Requests::finish( $input['request_id'], $out( 'rejected', 'operation_busy' ) ) : $locked_result;
			} catch ( \Throwable $error ) {
				return Requests::finish( $input['request_id'], $out( 'uncertain', 'replacement_unconfirmed' ) + array( 'file' => $progress ) ); } finally {
						$staging->cleanup(); }
	}
}
