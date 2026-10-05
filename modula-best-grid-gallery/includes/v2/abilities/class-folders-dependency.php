<?php
/** Read-only dependency checks. Never bootstrap or repair the optional library. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Folders_Dependency {
	public static function loaded(): bool {
		return class_exists( '\WPChill\Folders\Plugin' )
			&& is_callable( array( '\WPChill\Folders\Plugin', 'is_loaded' ) )
			&& \WPChill\Folders\Plugin::is_loaded();
	}

	/** MCP discovery has no per-operation permission filter; omit unavailable tools. */
	public static function operation_available( string $name ): bool {
		if ( isset( Transfers::callbacks()[ $name ] ) ) { return self::available( 'usage' ) && method_exists( '\WPChill\Folders\Storage\Folder_Transfer_State', 'retained' ); }
		if ( isset( Bound::callbacks()[ $name ] ) ) { return self::available(); }
		if ( isset( Storage::callbacks()[ $name ] ) ) { return self::available( 'usage' ); }
		if ( isset( Replacement::callbacks()[ $name ] ) ) { return self::available(); }
		if ( isset( Collections::callbacks()[ $name ] ) ) {
			return self::available( 'collections' ) && ( false !== strpos( $name, 'favorite' ) || \WPChill\Folders\Plugin::instance()->config()->folders() );
		}
		if ( isset( Attachment_Lifecycle::callbacks()[ $name ] ) || 'modula/read-attachment-usage' === $name ) {
			return self::available( 'usage' );
		}
		if ( Batch::MEDIA === $name || isset( Media_Folders::callbacks()[ $name ] ) || isset( Attachment_Image::callbacks()[ $name ] ) || isset( Attachments::callbacks()[ $name ] ) ) {
			return self::available();
		}
		return true;
	}

	/** Check the services and storage used by the existing operation family. */
	public static function available( string $family = 'folders' ): bool {
		if ( ! self::loaded() ) {
			return false;
		}
		$classes = array( 'Rest\\Status_Controller', 'Rest\\Folders_Controller', 'Rest\\Memberships_Controller', 'Memberships\\Wpdb_Membership_Repository', 'Storage\\Folder_Transfer_State' );
		$tables = array( 'folders', 'folder_memberships' );
		if ( 'collections' === $family ) {
			$classes = array_merge( $classes, array( 'Rest\\Collections_Controller', 'Rest\\Favorites_Controller', 'Folders\\Folder_Color' ) );
			$tables = array_merge( $tables, array( 'collections', 'collection_labels', 'favorites' ) );
		} elseif ( 'usage' === $family ) {
			$classes = array_merge( $classes, array( 'Usage\\Usage_Service', 'Storage\\Option_Provider_Map_Repository' ) );
			$tables[] = 'attachment_usage';
		}
		foreach ( $classes as $class ) {
			if ( ! class_exists( 'WPChill\\Folders\\' . $class ) ) {
				return false;
			}
		}
		global $wpdb;
		foreach ( $tables as $name ) {
			$table = $wpdb->prefix . 'wpchill_' . $name;
			if ( $table !== $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) ) ) {
				return false;
			}
		}
		return true;
	}
}
