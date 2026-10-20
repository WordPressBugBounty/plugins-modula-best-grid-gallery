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
		$check = Integration::operation( $name )['mcp_public'] ?? null;
		if ( ! is_callable( $check ) ) {
			return true;
		}
		return (bool) call_user_func( $check, $name );
	}

	public static function mcp_folders(): bool {
		return self::available();
	}

	public static function mcp_usage(): bool {
		return self::available( 'usage' );
	}

	public static function mcp_collections( string $name ): bool {
		if ( false !== strpos( $name, 'favorite' ) ) {
			return self::available( 'collections' );
		}
		return true;
	}

	/** Check the services and storage used by the existing operation family. */
	public static function available( string $family = 'folders' ): bool {
		if ( ! self::loaded() ) {
			return false;
		}
		$classes = array( 'Rest\\Status_Controller', 'Rest\\Folders_Controller', 'Rest\\Memberships_Controller', 'Memberships\\Wpdb_Membership_Repository', 'Storage\\Folder_Transfer_State' );
		$tables  = array( 'folders', 'folder_memberships' );
		if ( 'collections' === $family ) {
			$classes = array_merge( $classes, array( 'Rest\\Collections_Controller', 'Rest\\Favorites_Controller', 'Folders\\Folder_Color' ) );
			$tables  = array_merge( $tables, array( 'collections', 'collection_labels', 'favorites' ) );
		} elseif ( 'usage' === $family ) {
			$classes  = array_merge( $classes, array( 'Usage\\Usage_Service', 'Storage\\Option_Provider_Map_Repository' ) );
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
