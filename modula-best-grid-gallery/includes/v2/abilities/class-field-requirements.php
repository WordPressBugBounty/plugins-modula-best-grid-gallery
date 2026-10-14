<?php
/**
 * Canonical gallery/album field requirements shared by editor metadata and ability admission.
 *
 * The settings document is the authority: base Pro, extension and value gates come from
 * editorOmitControlInLite, editorShowInLite, editorRequiresExtensionEnabled and proEnhancements.
 * A field's own flags apply to that field. Sibling upsell copy does not lock a neighboring field.
 *
 * @package Modula
 */

namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Field_Requirements {
	/**
	 * Requirement for an entire field, or null when the field is free.
	 *
	 * @param array<string,mixed> $presentation Canonical field metadata.
	 * @return array{feature:string,scope:string}|null
	 */
	public static function for_field( array $presentation ): ?array {
		$extension = $presentation['editorRequiresExtensionEnabled'] ?? '';
		if ( is_string( $extension ) && '' !== $extension ) {
			return array(
				'feature' => $extension,
				'scope'   => 'extension',
			);
		}
		$upsell = $presentation['editorLightboxLiteUpsell']['extensionSlug'] ?? '';
		$locked = ! empty( $presentation['editorOmitControlInLite'] ) || ( isset( $presentation['editorShowInLite'] ) && ! $presentation['editorShowInLite'] );
		if ( $locked && is_string( $upsell ) && '' !== $upsell ) {
			return array(
				'feature' => $upsell,
				'scope'   => 'extension',
			);
		}
		if ( $locked ) {
			return array(
				'feature' => 'modula-pro',
				'scope'   => 'base',
			);
		}
		return null;
	}

	/**
	 * Value requirements declared by proEnhancements. Every applicable membership is required.
	 *
	 * @param array<string,mixed> $presentation Canonical field metadata.
	 * @return array<string,array<int,array{feature:string,scope:string}>>
	 */
	public static function for_values( array $presentation ): array {
		$gates  = $presentation['proEnhancements'] ?? null;
		$values = array();
		if ( ! is_array( $gates ) ) {
			return $values;
		}
		foreach ( $gates['base'] ?? array() as $value ) {
			if ( is_string( $value ) && '' !== $value ) {
				$values[ $value ][] = array(
					'feature' => 'modula-pro',
					'scope'   => 'base',
				);
			}
		}
		foreach ( $gates['extensionBased'] ?? array() as $slug => $members ) {
			if ( ! is_string( $slug ) || '' === $slug || ! is_array( $members ) ) {
				continue;
			}
			foreach ( $members as $value ) {
				if ( is_string( $value ) && '' !== $value ) {
					$values[ $value ][] = array(
						'feature' => $slug,
						'scope'   => 'extension',
					);
				}
			}
		}
		return $values;
	}

	/**
	 * Combine the field restriction with every restriction of the requested value.
	 *
	 * @param array{field:array|null,values:array<string,array<int,array>>} $rule Compiled setting rule.
	 * @param mixed                                                      $value Validated requested value.
	 * @return array<int,array{feature:string,scope:string}>
	 */
	public static function for_requested_value( array $rule, $value ): array {
		$requirements = ! empty( $rule['field'] ) ? array( $rule['field'] ) : array();
		if ( ! is_string( $value ) || ! isset( $rule['values'][ $value ] ) ) {
			return $requirements;
		}
		return array_merge( $requirements, $rule['values'][ $value ] );
	}

	/**
	 * @param array<int,array{feature:string,scope:string}> $requirements Combined value requirements.
	 */
	public static function all_satisfied( array $requirements ): bool {
		foreach ( $requirements as $requirement ) {
			if ( ! self::satisfied( $requirement ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param array{feature:string,scope:string} $requirement Field or value requirement.
	 */
	public static function satisfied( array $requirement ): bool {
		$snapshot = Feature_Snapshot::inspect();
		if ( 'compatible' !== $snapshot['pro_state'] || empty( $snapshot['service_ready'] ) ) {
			return false;
		}
		if ( 'base' === $requirement['scope'] ) {
			return true;
		}
		$extensions = $snapshot['extensions'] instanceof \stdClass ? array() : (array) $snapshot['extensions'];
		$row        = $extensions[ $requirement['feature'] ] ?? null;
		return is_array( $row ) && ! empty( $row['available'] ) && ! empty( $row['enabled'] ) && ! empty( $row['service_ready'] );
	}

	/**
	 * Nested object policy, including Hover Builder preset identity versus effective configuration.
	 *
	 * @param array<int,array<string,mixed>> $blockers Blockers already found for the patch.
	 * @param mixed                          $value    Requested field value.
	 * @return array<int,array<string,mixed>>
	 */
	public static function nested( array $blockers, string $path, $value ): array {
		$blockers = Hover_Builder_Policy::append( $blockers, $path, $value );
		$reported = apply_filters( 'modula_ability_nested_setting_policy', $blockers, $path, $value );
		return is_array( $reported ) ? $reported : $blockers;
	}
}
