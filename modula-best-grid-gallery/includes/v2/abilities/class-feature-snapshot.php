<?php
/** Read-only feature inspection. Never refreshes licensing, activates, or contacts providers. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Feature_Snapshot {
	public static function inspect(): array {
		$compatible = function_exists( 'modula_is_compatible_pro' ) && modula_is_compatible_pro();
		$incompatible = function_exists( 'modula_has_incompatible_pro' ) && modula_has_incompatible_pro();
		$extensions = Pro_Dependency::extensions();
		foreach ( $extensions as $slug => $row ) {
			if ( ! isset( $row['service_ready'] ) ) {
				$extensions[ $slug ]['service_ready'] = Pro_Dependency::extension_contract( $slug );
			}
		}
		return array(
			'lite_version'         => defined( 'MODULA_LITE_VERSION' ) ? (string) MODULA_LITE_VERSION : '',
			'pro_version'          => defined( 'MODULA_PRO_VERSION' ) ? (string) MODULA_PRO_VERSION : '',
			'compatible_pro'       => $compatible,
			'pro_state'            => $incompatible ? 'incompatible' : ( $compatible ? 'compatible' : 'absent' ),
			'service_ready'        => Pro_Dependency::available(),
			'license_status'       => Pro_Dependency::license_status(),
			'license_source'       => 'stored',
			'extensions'           => empty( $extensions ) ? new \stdClass() : $extensions,
			'folders_ready'        => Folders_Dependency::loaded(),
			'capability_protocol'  => Providers::PROTOCOL,
			'plan_map_consistent'  => Catalog::plan_map_consistent(),
			'authorization_scope'  => 'evaluated_at_execution',
		);
	}
}
