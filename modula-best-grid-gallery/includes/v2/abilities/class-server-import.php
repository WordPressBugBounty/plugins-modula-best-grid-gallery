<?php
/** Authorized server-folder selection for the shared recoverable intake workflow. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Server_Import {
	public const BROWSE = 'modula/browse-server-folder';
	public const IMPORT = 'modula/import-server-files';
	public static function uploader(): \Modula_Gallery_Upload {
		if ( ! class_exists( '\Modula_Gallery_Upload' ) ) {
			require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php'; }
		return \Modula_Gallery_Upload::get_instance();
	}
	public static function can_import(): bool {
		return get_current_user_id() && self::uploader()->check_user_upload_rights();
	}
	public static function definitions(): array {
		$path = array(
			'type'      => 'string',
			'maxLength' => 1024,
		);
		$root = Contract::revision_schema();
		return array(
			self::BROWSE => array(
				'label'         => 'Browse authorized server folder',
				'description'   => 'Read the existing Folder import root without creating it. Relative paths only; no links, traversal or paths outside the root and uploads. upload_files plus edit_posts and attachment edit permission required. Direct children only, 1–100 per page; at most 10000 entries per directory. Root identity pins selection without exposing its absolute path. Requires the editor Compatible Pro gate; Lite explains that requirement before listing files.',
				'input_schema'  => Contract::object(
					array(
						'path'     => $path,
						'root'     => $root,
						'page'     => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 10000,
						),
						'per_page' => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 100,
						),
					)
				) + array( 'default' => array() ),
				'output_schema' => Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'root'           => $root,
							'path'           => $path,
							'page'           => array( 'type' => 'integer' ),
							'total'          => array( 'type' => 'integer' ),
							'entries'        => array(
								'type'  => 'array',
								'items' => Contract::object(
									array(
										'path' => $path,
										'kind' => array(
											'type' => 'string',
											'enum' => array( 'directory', 'file' ),
										),
										'size' => array( 'type' => 'integer' ),
									),
									array( 'path', 'kind', 'size' )
								),
							),
						),
						array( 'schema_version', 'root', 'path', 'page', 'total', 'entries' )
					)
				),
			),
			self::IMPORT => array(
				'label'         => 'Import selected server images',
				'description'   => 'Explicit 1–25 unique root-relative image files, root identity and delete_after_import boolean required. Same Folder import capabilities and attachment ownership checks; registered attachment sources may be copied but never deleted by intake; use their guarded lifecycle. Copy through WordPress sideload, max 8 MiB/40M pixels each, 32 MiB total. All selected files validated before effects. Optional gallery id plus revision appends via composition. Source removal only after successful import, revalidation and explicit true; report retained/deleted/failed/uncertain sources. No implicit deduplication. Replay/recovery for 30 days never repeats import or deletion. Requires the editor Compatible Pro gate; Lite explains that requirement before copying or deleting.',
				'input_schema'  => Contract::object(
					array(
						'request_id'          => Contract::request_id_schema(),
						'root'                => $root,
						'paths'               => array(
							'type'        => 'array',
							'minItems'    => 1,
							'maxItems'    => 25,
							'uniqueItems' => true,
							'items'       => $path + array( 'minLength' => 1 ),
						),
						'delete_after_import' => array( 'type' => 'boolean' ),
						'id'                  => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'revision'            => Contract::revision_schema(),
					),
					array( 'request_id', 'root', 'paths', 'delete_after_import' )
				),
				'output_schema' => Contract::outcome( self::IMPORT, Intake::RESULTS ),
			),
		);
	}
	public static function root(): string {
		$root    = self::uploader()->get_folder_import_browse_root( false );
		$uploads = wp_upload_dir( null, false );
		$base    = realpath( $uploads['basedir'] ?? '' );
		$real    = realpath( $root );
		if ( ! $base || ! $real || ! is_dir( $real ) || ! \Modula_Folder_Import_Path::is_path_under_root( $real, $base ) ) {
			throw new \InvalidArgumentException( 'root_unavailable' ); }
		return $real;
	}
	public static function identity( string $root ): string {
		return hash_hmac( 'sha256', get_current_blog_id() . ':' . $root, wp_salt( 'auth' ) );
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::can_import() ) {
			return false; }
		try {
			if ( isset( $record['source_root'] ) && ! hash_equals( $record['source_root'], self::identity( self::root() ) ) ) {
				return false; }
		} catch ( \Throwable $error ) {
			return false; }
		foreach ( $record['source_owners'] ?? array() as $id ) {
			if ( ! current_user_can( 'edit_post', $id ) || ! empty( $record['delete_sources'] ) && ! current_user_can( 'delete_post', $id ) ) {
				return false; }
		}
		return true;
	}
}
