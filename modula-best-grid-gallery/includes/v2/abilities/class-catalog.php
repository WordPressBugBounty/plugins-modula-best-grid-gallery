<?php
/** Supported operation inventory derived from family-owned rows and the Lite plan authority. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Catalog {
	public static function owner( string $name ): string {
		return self::is_premium( $name ) ? 'pro' : 'lite';
	}

	public static function lifecycle( string $name ): string {
		return in_array( $name, array( Ai_Text::GENERATE, Ai_Css::GENERATE ), true ) ? 'retired' : 'active';
	}

	public static function features( string $name ): array {
		return Integration::operation( $name )['features'] ?? array();
	}

	public static function requires_compatible_pro( string $name ): bool {
		$row = Integration::operation( $name );
		return ! empty( $row['requires_pro'] ) || ! empty( $row['features'] );
	}

	public static function dependency( string $name ): string {
		$dependency = Integration::operation( $name )['dependency'] ?? '';
		return is_string( $dependency ) ? $dependency : '';
	}

	public static function plans_for( array $features ): array {
		if ( ! $features ) {
			return array();
		}
		$plans = array();
		foreach ( self::plan_map() as $plan => $slugs ) {
			$included = true;
			foreach ( $features as $feature ) {
				if ( ! in_array( $feature, $slugs, true ) ) {
					$included = false;
					break;
				}
			}
			if ( $included ) {
				$plans[] = $plan;
			}
		}
		return $plans;
	}

	public static function inventory(): array {
		$rows = array();
		foreach ( array_keys( Contract::definitions() ) as $name ) {
			$features = self::features( $name );
			$rows[]   = array(
				'name'          => $name,
				'owner'         => self::owner( $name ),
				'lifecycle'     => self::lifecycle( $name ),
				'features'      => $features,
				'plans'         => self::plans_for( $features ),
				'host'          => self::requires_compatible_pro( $name ) ? 'compatible_pro' : 'lite',
				'dependency'    => self::dependency( $name ),
				'schema_source' => 'Modula\\V2\\Abilities\\Contract::definitions',
				'provider'      => Providers::provider_for( $name ),
			);
		}
		return $rows;
	}

	public static function describe( string $name, bool $executable ): array {
		$features = self::features( $name );
		$blocked  = Availability::blockers( $name );
		return array(
			'owner'        => self::owner( $name ),
			'lifecycle'    => self::lifecycle( $name ),
			'availability' => $executable ? 'executable' : 'explanatory',
			'provider'     => Providers::provider_for( $name ),
			'features'     => $features,
			'plans'        => self::plans_for( $features ),
			'blockers'     => $blocked,
		);
	}

	public static function plan_map(): array {
		require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-extension-catalog.php';
		return \Modula_Extension_Catalog::plan_map();
	}

	public static function plan_map_consistent(): bool {
		if ( ! Pro_Dependency::available() ) {
			return true;
		}
		$live = \Modula_Pro\Extensions\Extensions::get_instance()->get_read_only_extension_status();
		$lite = array_values( array_unique( self::plan_map()['business'] ?? array() ) );
		sort( $lite );
		$keys = array_keys( $live );
		sort( $keys );
		return $lite === $keys;
	}

	private static function is_premium( string $name ): bool {
		return self::requires_compatible_pro( $name ) || (bool) self::features( $name );
	}
}
