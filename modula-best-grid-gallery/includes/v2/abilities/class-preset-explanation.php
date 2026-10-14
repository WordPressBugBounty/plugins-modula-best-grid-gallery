<?php
/** Callable preset explanations owned by Lite. No preset post or apply effect. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Preset_Explanation {
	public const PROVIDER = 'modula-lite-preset-explanation';

	public static function boot(): void {
		foreach ( Presets::mutations() as $name ) {
			Outcomes::register_recovery( $name, array( Presets::class, 'can_recover' ) );
		}
		foreach ( Album_Presets::mutations() as $name ) {
			Outcomes::register_recovery( $name, array( Album_Presets::class, 'can_recover' ) );
		}
		add_filter( 'modula_ability_provider_contributions', array( self::class, 'contribute' ), 100 );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return array_merge( array_keys( Presets::callbacks() ), array_keys( Album_Presets::callbacks() ) );
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
		$request         = is_string( $input['request_id'] ?? null ) ? $input['request_id'] : '';
		$out             = Requests::outcome( $request, 'rejected', 'feature_unavailable', 'This preset operation is not currently executable.', $name );
		$out['blockers'] = $blockers;
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

	/** Offer explanations independently of unvalidated executor contributions. */
	public static function contribute( array $contributions ): array {
		return Providers::explanations( $contributions, self::PROVIDER, self::names(), array( self::class, 'handler' ) );
	}
}
