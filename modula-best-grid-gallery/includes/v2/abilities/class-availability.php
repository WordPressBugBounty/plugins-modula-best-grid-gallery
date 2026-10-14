<?php
/** Structured blockers and remedies for known feature, package and dependency gaps. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Availability {
	public static function blockers( string $name ): array {
		$operation = Integration::operation( $name );
		if ( ! $operation ) {
			return array( self::blocker( 'dependency_unavailable', 'modula', 'update_package', 'Unknown operation identity.' ) );
		}
		$blockers         = array();
		$snapshot         = Feature_Snapshot::inspect();
		$provider_failure = Providers::unavailable_reason( $name );
		if ( '' !== $provider_failure ) {
			$reason     = 'unsupported_protocol' === $provider_failure ? 'needs_pro_update' : 'needs_service_update';
			$blockers[] = self::blocker( $reason, 'modula-pro', 'update_package', __( 'The installed ability provider is incompatible or incomplete. Update the package; purchasing a plan does not fix this technical failure.', 'modula-best-grid-gallery' ) );
		}
		$requires_pro = Catalog::requires_compatible_pro( $name ) && '' === $provider_failure;
		if ( $requires_pro && 'absent' === $snapshot['pro_state'] ) {
			$blockers[] = self::blocker( 'needs_pro', Catalog::features( $name )[0] ?? 'modula-pro', 'view_upgrade_options', __( 'Compatible Pro is not active. Activate an owned package if you already have it, or inspect upgrade options. Absence of active Pro does not prove the product was never purchased.', 'modula-best-grid-gallery' ) );
		} elseif ( $requires_pro && 'incompatible' === $snapshot['pro_state'] ) {
			$blockers[] = self::blocker( 'needs_pro_update', 'modula-pro', 'update_package', __( 'Update Modula Pro to a Compatible Pro release. This is not a paid upgrade recommendation.', 'modula-best-grid-gallery' ) );
		} elseif ( $requires_pro && ! $snapshot['service_ready'] && Catalog::features( $name ) ) {
			$blockers[] = self::blocker( 'needs_service_update', Catalog::features( $name )[0], 'update_package', __( 'Installed Pro is missing a required service contract. Update the package; this is not a plan upgrade.', 'modula-best-grid-gallery' ) );
		}
		$extensions = (array) $snapshot['extensions'];
		foreach ( '' === $provider_failure ? Catalog::features( $name ) : array() as $feature ) {
			$row = $extensions[ $feature ] ?? null;
			if ( $snapshot['service_ready'] && ( ! is_array( $row ) || empty( $row['available'] ) ) ) {
				$blockers[] = self::blocker( 'needs_plan_upgrade', $feature, 'view_upgrade_options', __( 'The current stored plan does not include this feature.', 'modula-best-grid-gallery' ) );
			} elseif ( is_array( $row ) && ! empty( $row['available'] ) && empty( $row['enabled'] ) ) {
				$blockers[] = self::blocker( 'needs_enable', $feature, 'enable_included_extension', __( 'Enable this already included extension. No purchase is required.', 'modula-best-grid-gallery' ) );
			} elseif ( is_array( $row ) && ! empty( $row['available'] ) && ! empty( $row['enabled'] ) && empty( $row['service_ready'] ) ) {
				$blockers[] = self::blocker( 'needs_service_update', $feature, 'update_package', __( 'The enabled extension is missing a required service contract. Update the package.', 'modula-best-grid-gallery' ) );
			}
		}
		if ( 'compatible' === $snapshot['pro_state'] && $requires_pro && ! $blockers && ! Providers::executable( $name ) ) {
			$blockers[] = self::blocker( 'needs_service_update', 'modula-pro', 'update_package', __( 'Installed Pro is missing a required service contract. Update the package; this is not a plan upgrade.', 'modula-best-grid-gallery' ) );
		}
		$dependency = Catalog::dependency( $name );
		if ( 'folders' === $dependency && ! Folders_Dependency::operation_available( $name ) ) {
			$blockers[] = self::blocker( 'dependency_unavailable', 'folders', 'configure_service', __( 'Restore the Folders library or complete its tables before using this operation.', 'modula-best-grid-gallery' ) );
		}
		foreach ( $operation['blocker_checks'] as $check ) {
			$blockers = array_merge( $blockers, $check( $name, $snapshot ) );
		}
		return self::unique( $blockers );
	}

	/**
	 * Blockers for one explicit field or value requirement. Base Pro uses the modula-pro feature.
	 *
	 * @param array{feature:string,scope:string} $requirement Requirement from the canonical settings document.
	 * @param mixed                              $value       Requested scalar, when the gate is value-specific.
	 * @return array<int,array<string,mixed>>
	 */
	public static function for_requirement( array $requirement, string $path, $value = null ): array {
		$snapshot  = Feature_Snapshot::inspect();
		$feature   = $requirement['feature'];
		$extension = 'extension' === ( $requirement['scope'] ?? '' );
		if ( 'absent' === $snapshot['pro_state'] ) {
			$blocker = self::blocker( 'needs_pro', $extension ? $feature : 'modula-pro', 'view_upgrade_options', __( 'Compatible Pro is not active. Activate an owned package if you already have it, or inspect upgrade options. Absence of active Pro does not prove the product was never purchased.', 'modula-best-grid-gallery' ) );
		} elseif ( 'incompatible' === $snapshot['pro_state'] ) {
			$blocker = self::blocker( 'needs_pro_update', 'modula-pro', 'update_package', __( 'Update Modula Pro to a Compatible Pro release. This is not a paid upgrade recommendation.', 'modula-best-grid-gallery' ) );
		} elseif ( empty( $snapshot['service_ready'] ) ) {
			$blocker = self::blocker( 'needs_service_update', $extension ? $feature : 'modula-pro', 'update_package', __( 'Installed Pro is missing a required service contract. Update the package; this is not a plan upgrade.', 'modula-best-grid-gallery' ) );
		} elseif ( $extension ) {
			$extensions = $snapshot['extensions'] instanceof \stdClass ? array() : (array) $snapshot['extensions'];
			$row        = $extensions[ $feature ] ?? null;
			if ( ! is_array( $row ) || empty( $row['available'] ) ) {
				$blocker = self::blocker( 'needs_plan_upgrade', $feature, 'view_upgrade_options', __( 'The current stored plan does not include this feature.', 'modula-best-grid-gallery' ) );
			} elseif ( empty( $row['enabled'] ) ) {
				$blocker = self::blocker( 'needs_enable', $feature, 'enable_included_extension', __( 'Enable this already included extension. No purchase is required.', 'modula-best-grid-gallery' ) );
			} else {
				$blocker = self::blocker( 'needs_service_update', $feature, 'update_package', __( 'The enabled extension is missing a required service contract. Update the package.', 'modula-best-grid-gallery' ) );
			}
		} else {
			return array();
		}
		$blocker['path'] = $path;
		if ( is_string( $value ) || is_int( $value ) || is_bool( $value ) ) {
			$blocker['value'] = $value;
		}
		return array( $blocker );
	}

	public static function blocker( string $reason, string $feature, string $action, string $explanation ): array {
		return array(
			'reason'  => $reason,
			'feature' => $feature,
			'remedy'  => array(
				'action'      => $action,
				'explanation' => $explanation,
			),
		);
	}

	private static function unique( array $blockers ): array {
		$out  = array();
		$seen = array();
		foreach ( $blockers as $blocker ) {
			$key = $blocker['reason'] . ':' . $blocker['feature'];
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$out[]        = $blocker;
		}
		return $out;
	}
}
