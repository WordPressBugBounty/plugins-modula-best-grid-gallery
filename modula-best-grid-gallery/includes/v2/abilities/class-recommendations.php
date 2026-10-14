<?php
/**
 * Bounded contextual upgrade suggestions separate from operation facts.
 *
 * Applied when fresh outcomes are finalized so families do not own marketing.
 */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Recommendations {
	private const COMMERCIAL = array( 'needs_pro', 'needs_plan_upgrade' );
	private const RETIRED    = array( 'modula-ai', 'modula-ai-text', 'modula-ai-css' );

	/**
	 * Attach at most one commercial recommendation to a fresh eligible outcome.
	 * An already finalized recommendation keeps its identity and content.
	 *
	 * @param array<string,mixed> $outcome
	 * @return array<string,mixed>
	 */
	public static function decorate( array $outcome ): array {
		$outcome = self::project( $outcome );
		$request = is_string( $outcome['request_id'] ?? null ) ? $outcome['request_id'] : '';
		if ( self::is_batch_child( $request ) ) {
			return $outcome;
		}
		if ( isset( $outcome['recommendation'] ) && is_array( $outcome['recommendation'] ) ) {
			return $outcome;
		}
		$candidate = self::candidate( $outcome );
		if ( null === $candidate ) {
			return $outcome;
		}
		$outcome['recommendation'] = $candidate;
		return $outcome;
	}

	/**
	 * Project retained suggestions without consulting current entitlement.
	 * Older child suggestions remain stored but never become caller promotions.
	 *
	 * @param array<string,mixed> $outcome
	 * @return array<string,mixed>
	 */
	public static function project( array $outcome ): array {
		$outcome = self::strip_child_recommendations( $outcome );
		$request = is_string( $outcome['request_id'] ?? null ) ? $outcome['request_id'] : '';
		if ( self::is_batch_child( $request ) ) {
			unset( $outcome['recommendation'] );
		}
		return $outcome;
	}

	/**
	 * @param array<string,mixed> $outcome
	 * @return array<string,mixed>|null
	 */
	private static function candidate( array $outcome ): ?array {
		$status = is_string( $outcome['status'] ?? null ) ? $outcome['status'] : '';
		if ( 'rejected' === $status ) {
			return self::from_blockers( self::blocker_list( $outcome ) );
		}
		if ( in_array( $status, array( 'succeeded', 'partial' ), true ) ) {
			$from_children = self::from_blockers( self::child_blockers( $outcome ) );
			if ( null !== $from_children ) {
				return $from_children;
			}
		}
		if ( 'succeeded' !== $status ) {
			return null;
		}
		$operation = is_string( $outcome['operation'] ?? null ) ? $outcome['operation'] : '';
		return self::from_relevance( $operation );
	}

	/**
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>|null
	 */
	private static function from_blockers( array $blockers ): ?array {
		foreach ( $blockers as $blocker ) {
			if ( ! is_array( $blocker ) ) {
				continue;
			}
			$reason  = is_string( $blocker['reason'] ?? null ) ? $blocker['reason'] : '';
			$feature = is_string( $blocker['feature'] ?? null ) ? $blocker['feature'] : '';
			if ( ! in_array( $reason, self::COMMERCIAL, true ) || '' === $feature || self::unsuitable( $feature ) ) {
				continue;
			}
			$recommendation = self::payload(
				$feature,
				'needs_plan_upgrade' === $reason
					? __( 'Your current plan does not include this requested capability.', 'modula-best-grid-gallery' )
					: __( 'Compatible Pro is not active. Activate your package if you already own it, or view upgrade options for this requested capability.', 'modula-best-grid-gallery' )
			);
			if ( self::requests_freeform( $blocker ) ) {
				$recommendation['message'] = __( 'Unlock Freeform with Compatible Pro to arrange gallery items independently with intentional overlap and stacking.', 'modula-best-grid-gallery' );
			}
			return $recommendation;
		}
		return null;
	}

	/** Requested-layout copy does not change the canonical base Pro entitlement. */
	private static function requests_freeform( array $blocker ): bool {
		$path = $blocker['path'] ?? '';
		return 'modula-pro' === ( $blocker['feature'] ?? '' )
			&& ( 'freeform.placements' === $path || ( 'general.type' === $path && 'freeform' === ( $blocker['value'] ?? '' ) ) );
	}

	/**
	 * @return array<string,mixed>|null
	 */
	private static function from_relevance( string $operation ): ?array {
		foreach ( self::relevance_map()[ $operation ] ?? array() as $feature ) {
			if ( self::unsuitable( $feature ) || self::already_included( $feature ) ) {
				continue;
			}
			return self::payload(
				$feature,
				__( 'Optional premium capability related to this successful free operation. An upgrade is not required to use the result you already received.', 'modula-best-grid-gallery' )
			);
		}
		return null;
	}

	/**
	 * Deterministic operation → feature candidates. First eligible unused feature wins.
	 *
	 * @return array<string,array<int,string>>
	 */
	private static function relevance_map(): array {
		return array(
			Creation::OPERATION    => array( 'modula-albums', 'modula-video', 'modula-watermark' ),
			Update::OPERATION      => array( 'modula-defaults', 'modula-albums', 'modula-video' ),
			Composition::OPERATION => array( 'modula-video', 'modula-watermark', 'modula-albums' ),
			Embedded::OPERATION    => array( 'modula-video', 'modula-watermark' ),
			Batch::OPERATION       => array( 'modula-defaults', 'modula-albums', 'modula-video' ),
			Intake::UPLOAD         => array( 'modula-watermark', 'modula-video' ),
			Lifecycle::DUPLICATE   => array( 'modula-albums', 'modula-defaults' ),
			Attachments::UPDATE    => array( 'modula-watermark', 'modula-video' ),
		);
	}

	/**
	 * @return array<string,mixed>
	 */
	private static function payload( string $feature, string $relevance ): array {
		$copy = self::feature_copy( $feature );
		return array(
			'id'          => self::identity( $feature ),
			'feature'     => $feature,
			'message'     => $copy['message'],
			'relevance'   => $relevance,
			'action'      => 'view_upgrade_options',
			'destination' => self::destination( $feature ),
			'hint'        => 'after_result',
		);
	}

	private static function identity( string $feature ): string {
		return 'rec_' . substr( hash( 'sha256', 'modula-upgrade:' . $feature ), 0, 32 );
	}

	private static function destination( string $feature ): string {
		return 'https://wp-modula.com/pricing/?utm_source=modula-abilities&utm_medium=recommendation&utm_campaign=' . rawurlencode( $feature );
	}

	/**
	 * @return array{message:string}
	 */
	private static function feature_copy( string $feature ): array {
		$messages = array(
			'modula-pro'            => __( 'Unlock Compatible Pro gallery layouts and advanced settings.', 'modula-best-grid-gallery' ),
			'hover-builder'         => __( 'Unlock Compatible Pro Hover Builder presets and customization.', 'modula-best-grid-gallery' ),
			'modula-albums'         => __( 'Group galleries into albums for larger collections.', 'modula-best-grid-gallery' ),
			'modula-video'          => __( 'Add self-hosted or external videos to your galleries.', 'modula-best-grid-gallery' ),
			'modula-watermark'      => __( 'Protect gallery images with custom watermarks.', 'modula-best-grid-gallery' ),
			'modula-instagram'      => __( 'Sync Instagram media into a Modula gallery.', 'modula-best-grid-gallery' ),
			'modula-image-proofing' => __( 'Collect client selections with Proofing workflows.', 'modula-best-grid-gallery' ),
			'modula-defaults'       => __( 'Save and reuse gallery presets across projects.', 'modula-best-grid-gallery' ),
			'modula-slider'         => __( 'Present galleries with the Slider layout.', 'modula-best-grid-gallery' ),
		);
		return array(
			'message' => $messages[ $feature ] ?? __( 'Inspect Modula premium options related to this request.', 'modula-best-grid-gallery' ),
		);
	}

	private static function unsuitable( string $feature ): bool {
		return in_array( $feature, self::RETIRED, true );
	}

	private static function already_included( string $feature ): bool {
		$snapshot = Feature_Snapshot::inspect();
		if ( in_array( $feature, array( 'modula-pro', 'hover-builder' ), true ) ) {
			return 'compatible' === $snapshot['pro_state'];
		}
		$extensions = $snapshot['extensions'] instanceof \stdClass ? array() : (array) $snapshot['extensions'];
		$row        = $extensions[ $feature ] ?? null;
		return is_array( $row ) && true === ( $row['available'] ?? false );
	}

	private static function is_batch_child( string $request ): bool {
		return '' !== $request && 0 === strpos( $request, 'batch_' );
	}

	/**
	 * @param array<string,mixed> $outcome
	 * @return array<string,mixed>
	 */
	private static function strip_child_recommendations( array $outcome ): array {
		if ( empty( $outcome['targets'] ) || ! is_array( $outcome['targets'] ) ) {
			return $outcome;
		}
		foreach ( $outcome['targets'] as $index => $target ) {
			if ( is_array( $target ) ) {
				unset( $outcome['targets'][ $index ]['recommendation'] );
			}
		}
		return $outcome;
	}

	/**
	 * @param array<string,mixed> $outcome
	 * @return array<int,array<string,mixed>>
	 */
	private static function blocker_list( array $outcome ): array {
		$blockers = $outcome['blockers'] ?? array();
		return is_array( $blockers ) ? $blockers : array();
	}

	/**
	 * @param array<string,mixed> $outcome
	 * @return array<int,array<string,mixed>>
	 */
	private static function child_blockers( array $outcome ): array {
		$blockers = array();
		foreach ( $outcome['targets'] ?? array() as $target ) {
			if ( ! is_array( $target ) ) {
				continue;
			}
			foreach ( self::blocker_list( $target ) as $blocker ) {
				$blockers[] = $blocker;
			}
		}
		return $blockers;
	}
}
