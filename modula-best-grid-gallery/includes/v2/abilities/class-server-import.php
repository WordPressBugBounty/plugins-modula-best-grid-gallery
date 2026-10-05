<?php
/** Authorized server-folder selection for the shared recoverable intake workflow. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Server_Import {
	public const BROWSE = 'modula/browse-server-folder';
	public const IMPORT = 'modula/import-server-files';
	public static function uploader(): \Modula_Gallery_Upload {
		if ( ! class_exists( '\Modula_Gallery_Upload' ) ) { require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php'; }
		return \Modula_Gallery_Upload::get_instance();
	}
	public static function can_import(): bool {
		return get_current_user_id() && self::uploader()->check_user_upload_rights();
	}
	public static function definitions(): array {
		$path = array( 'type' => 'string', 'maxLength' => 1024 );
		$root = Contract::revision_schema();
		return array(
		self::BROWSE => array( 'label' => 'Browse authorized server folder', 'description' => 'Read the existing Folder import root without creating it. Relative paths only; no links, traversal or paths outside the root and uploads. upload_files plus edit_posts and attachment edit permission required. Direct children only, 1–100 per page; at most 10000 entries per directory. Root identity pins selection without exposing its absolute path.', 'input_schema' => Contract::object( array( 'path' => $path, 'root' => $root, 'page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 10000 ), 'per_page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100 ) ) ) + array( 'default' => array() ), 'output_schema' => Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'root' => $root, 'path' => $path, 'page' => array( 'type' => 'integer' ), 'total' => array( 'type' => 'integer' ), 'entries' => array( 'type' => 'array', 'items' => Contract::object( array( 'path' => $path, 'kind' => array( 'type' => 'string', 'enum' => array( 'directory', 'file' ) ), 'size' => array( 'type' => 'integer' ) ), array( 'path', 'kind', 'size' ) ) ) ), array( 'schema_version', 'root', 'path', 'page', 'total', 'entries' ) ) ),
		self::IMPORT => array( 'label' => 'Import selected server images', 'description' => 'Explicit 1–25 unique root-relative image files, root identity and delete_after_import boolean required. Same Folder import capabilities and attachment ownership checks; registered attachment sources may be copied but never deleted by intake; use their guarded lifecycle. Copy through WordPress sideload, max 8 MiB/40M pixels each, 32 MiB total. All selected files validated before effects. Optional gallery id plus revision appends via composition. Source removal only after successful import, revalidation and explicit true; report retained/deleted/failed/uncertain sources. No implicit deduplication. Replay/recovery for 30 days never repeats import or deletion.', 'input_schema' => Contract::object( array( 'request_id' => Contract::request_id_schema(), 'root' => $root, 'paths' => array( 'type' => 'array', 'minItems' => 1, 'maxItems' => 25, 'uniqueItems' => true, 'items' => $path + array( 'minLength' => 1 ) ), 'delete_after_import' => array( 'type' => 'boolean' ), 'id' => array( 'type' => 'integer', 'minimum' => 1 ), 'revision' => Contract::revision_schema() ), array( 'request_id', 'root', 'paths', 'delete_after_import' ) ), 'output_schema' => Contract::outcome_schema() ),
		);
	}
	private static function root(): string {
		$root = self::uploader()->get_folder_import_browse_root( false );
		$uploads = wp_upload_dir( null, false );
		$base = realpath( $uploads['basedir'] ?? '' );
		$real = realpath( $root );
		if ( ! $base || ! $real || ! is_dir( $real ) || ! \Modula_Folder_Import_Path::is_path_under_root( $real, $base ) ) { throw new \InvalidArgumentException( 'root_unavailable' ); }
		return $real;
	}
	private static function identity( string $root ): string {
		return hash_hmac( 'sha256', get_current_blog_id() . ':' . $root, wp_salt( 'auth' ) );
	}
	private static function resolve( string $root, string $relative ): string {
		if ( preg_match( '~[\\\\\x00-\x1f:]|(^/)|(^|/)\.\.?(/|$)|//~', $relative ) ) { throw new \InvalidArgumentException( 'invalid_source_path' ); }
		$path = $root;
		foreach ( array_filter( explode( '/', $relative ), 'strlen' ) as $part ) {
			$path .= '/' . $part;
			if ( is_link( $path ) ) { throw new \InvalidArgumentException( 'source_symlink' ); }
		}
		$real = realpath( $path );
		if ( ! $real || ! is_readable( $real ) || ! \Modula_Folder_Import_Path::is_path_under_root( $real, $root ) ) { throw new \InvalidArgumentException( 'invalid_source_path' ); }
		return $real;
	}
	private static function authorize( string $path, bool $delete ): int {
		$owner = self::uploader()->resolve_folder_import_attachment( $path );
		if ( is_wp_error( \Modula_Folder_Import_Path::authorize_import( $owner, $delete, 'current_user_can' ) ) ) { throw new \InvalidArgumentException( 'source_permission_denied' ); }
		// Removing a registered original or derivative leaves a broken Media Library object.
		// Its guarded attachment lifecycle, not folder intake, owns those shared bytes.
		if ( $delete && $owner ) { throw new \InvalidArgumentException( 'registered_source_preserved' ); }
		return (int) $owner;
	}
	public static function browse( array $input ) {
		if ( ! self::can_import() ) { return new \WP_Error( 'modula_forbidden', 'Current Folder import permissions are required.' ); }
		try {
			$root = self::root(); $identity = self::identity( $root );
			if ( isset( $input['root'] ) && ! hash_equals( $identity, $input['root'] ) ) { throw new \InvalidArgumentException( 'root_changed' ); }
			$relative = $input['path'] ?? ''; $path = self::resolve( $root, $relative );
			if ( ! is_dir( $path ) ) { throw new \InvalidArgumentException( 'invalid_source_path' ); }
			$entries = array(); $count = 0;
			foreach ( new \DirectoryIterator( $path ) as $entry ) {
				if ( ++$count > 10002 ) { throw new \InvalidArgumentException( 'directory_limit' ); }
				if ( $entry->isDot() || $entry->isLink() ) { continue; }
				$name = ( '' === $relative ? '' : rtrim( $relative, '/' ) . '/' ) . $entry->getFilename();
				try {
					$resolved = self::resolve( $root, $name );
					if ( ! is_dir( $resolved ) ) {
						if ( ! is_file( $resolved ) || empty( wp_check_filetype( $entry->getFilename(), self::uploader()->define_allowed_mime_types() )['type'] ) ) { continue; }
						self::authorize( $resolved, false );
					}
				} catch ( \InvalidArgumentException $error ) { continue; }
				$entries[] = array( 'path' => $name, 'kind' => is_dir( $resolved ) ? 'directory' : 'file', 'size' => is_dir( $resolved ) ? 0 : (int) filesize( $resolved ) );
			}
			usort( $entries, static function ( $a, $b ) { return strcmp( $a['path'], $b['path'] ); } );
			$page = $input['page'] ?? 1; $size = $input['per_page'] ?? 20;
			return array( 'schema_version' => Contract::VERSION, 'root' => $identity, 'path' => $relative, 'page' => $page, 'total' => count( $entries ), 'entries' => array_slice( $entries, ( $page - 1 ) * $size, $size ) );
		} catch ( \InvalidArgumentException $error ) { return new \WP_Error( $error->getMessage(), 'Folder selection is unavailable or not authorized.' ); }
		catch ( \Throwable $error ) { return new \WP_Error( 'browse_unavailable', 'Folder inspection could not be completed.' ); }
	}
	public static function prepare( array $input, Intake_Files $staging ): array {
		$root = self::root();
		if ( ! hash_equals( self::identity( $root ), $input['root'] ) ) { throw new \InvalidArgumentException( 'root_changed' ); }
		$files = array(); $total = 0;
		foreach ( $input['paths'] as $relative ) {
			$path = self::resolve( $root, $relative );
			if ( ! is_file( $path ) ) { throw new \InvalidArgumentException( 'invalid_source_file' ); }
			$owner = self::authorize( $path, $input['delete_after_import'] );
			$total += filesize( $path );
			if ( $total > Intake_Files::MAX_EXPANDED ) { throw new \InvalidArgumentException( 'file_size_limit' ); }
			$file = $staging->prepare_server( $path, sanitize_file_name( basename( $path ) ) );
			$file['source'] = array( 'path' => $relative, 'owner' => $owner, 'root' => $input['root'], 'digest' => hash_file( 'sha256', $file['tmp_name'] ), 'stat' => self::stat( $path ) );
			$files[] = $file;
		}
		if ( is_multisite() && ( ! is_upload_space_available() || $total > get_upload_space_available() ) ) { throw new \InvalidArgumentException( 'upload_quota_exceeded' ); }
		return $files;
	}
	private static function stat( string $path ): array {
		clearstatcache( true, $path ); $stat = stat( $path );
		return array( $stat['dev'], $stat['ino'], $stat['size'], $stat['mtime'], $stat['ctime'] );
	}
	/** Recheck root, path, identity, bytes and current source permissions before each effect. */
	public static function revalidate( array $source, bool $delete ): string {
		if ( ! self::can_import() ) { throw new \InvalidArgumentException( 'source_permission_denied' ); }
		$root = self::root();
		if ( ! hash_equals( self::identity( $root ), $source['root'] ) ) { throw new \InvalidArgumentException( 'root_changed' ); }
		$path = self::resolve( $root, $source['path'] );
		if ( ! is_file( $path ) || self::stat( $path ) !== $source['stat'] || ! hash_equals( $source['digest'], hash_file( 'sha256', $path ) ) || self::authorize( $path, $delete ) !== $source['owner'] ) { throw new \InvalidArgumentException( 'source_changed' ); }
		return $path;
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::can_import() ) { return false; }
		try { if ( isset( $record['source_root'] ) && ! hash_equals( $record['source_root'], self::identity( self::root() ) ) ) { return false; } }
		catch ( \Throwable $error ) { return false; }
		foreach ( $record['source_owners'] ?? array() as $id ) {
			if ( ! current_user_can( 'edit_post', $id ) || ! empty( $record['delete_sources'] ) && ! current_user_can( 'delete_post', $id ) ) { return false; }
		}
		return true;
	}
}
