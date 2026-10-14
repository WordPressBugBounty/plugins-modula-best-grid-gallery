<?php
/** Callable transfer explanations owned by Lite. No queue, cancel or residence effect. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Transfer_Explanation {
	public const PROVIDER = 'modula-lite-transfer-explanation';

	public static function boot(): void {
		foreach ( self::names() as $name ) {
			if ( ! Contract::is_mutation( $name ) ) {
				continue;
			}
			Outcomes::register_recovery( $name, array( Transfers::class, 'can_recover' ) );
		}
		add_filter( 'modula_ability_provider_contributions', array( self::class, 'contribute' ), 100 );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return Transfers::names();
	}

	/**
	 * @param array<int,string> $names
	 * @return array<string,callable>
	 */
	public static function callbacks_for( array $names ): array {
		$out = array();
		foreach ( $names as $name ) {
			$out[ $name ] = self::handler( $name );
		}
		return $out;
	}

	public static function handler( string $name ): callable {
		return static function ( $input ) use ( $name ) {
			$input = is_array( $input ) ? $input : array();
			return self::rejected( $name, $input, Availability::blockers( $name ) );
		};
	}

	/**
	 * @param array<string,mixed>            $input
	 * @param array<int,array<string,mixed>> $blockers
	 * @return array<string,mixed>
	 */
	public static function rejected( string $name, array $input, array $blockers ): array {
		$out     = self::outcome( $name, $input, $blockers );
		$request = $out['request_id'];
		if ( ! Contract::is_mutation( $name ) || '' === $request ) {
			return $out;
		}
		$existing = Requests::existing( $input, $name );
		if ( null !== $existing ) {
			return $existing;
		}
		$claimed = Requests::claim( $input, $name );
		if ( null !== $claimed ) {
			return $claimed;
		}
		return Requests::finish( $request, $out );
	}

	/** Pure explanatory projection shared with the provider that already owns admission. */
	public static function outcome( string $name, array $input, array $blockers ): array {
		$request         = is_string( $input['request_id'] ?? null ) ? $input['request_id'] : '';
		$out             = Requests::outcome( $request, 'rejected', 'feature_unavailable', 'This transfer operation is not currently executable.', $name );
		$out['blockers'] = $blockers;
		return $out;
	}

	/** Offer explanations independently of unvalidated executor contributions. */
	public static function contribute( array $contributions ): array {
		return Providers::explanations( $contributions, self::PROVIDER, self::names(), array( self::class, 'handler' ) );
	}
}
