<?php

require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-extension-catalog.php';

/**
 * Extensions class for Modula Pro plugin.
 */
class Modula_Extensions_Base {
	/**
	 * Class instance.
	 *
	 * @var Extensions
	 */
	private static $instance;
	/**
	 * Extensions array
	 *
	 * @var array
	 */
	public $extensions = array();
	/**
	 * Active extensions option
	 *
	 * @var string
	 */
	private $active_extensions = 'modula_pro_active_extensions';
	/**
	 * Current plan option
	 *
	 * @var string
	 */
	private $current_plan = 'modula_pro_current_plan';
	/**
	 * Active extensions cache
	 *
	 * @var array
	 */
	private static $active_extensions_cache = array();
	/**
	 * Plan map
	 *
	 * @var array
	 */
	private $plan_map = array();
	/**
	 * Initialize the extensions.
	 */
	public function __construct() {
		$this->create_plan_map();
		add_action( 'init', array( $this, 'add_default_extensions' ) );
		if ( ! class_exists( 'Modula_Pro\Extensions\Extensions' ) ) {
			add_filter( 'modula_admin_page_subtabs', array( $this, 'replace_proper_badges' ) );
		}
	}

	/**
	 * Create plan map from the extension catalog. `free` (no plan) keeps the
	 * lookups below working for a site without Pro.
	 */
	private function create_plan_map() {
		$this->plan_map = array_merge( array( 'free' => array() ), Modula_Extension_Catalog::plan_map() );
	}

	/**
	 * Plan membership from the extension catalog, with the empty `free` entry.
	 *
	 * @return array<string,string[]>
	 */
	public function get_read_only_plan_map() {
		return $this->plan_map;
	}

	/**
	 * Get the instance of the class.
	 */
	public static function get_instance() {
		if ( ! isset( self::$instance ) || ! ( self::$instance instanceof Modula_Extensions_Base ) ) {
			self::$instance = new Modula_Extensions_Base();
		}

		return self::$instance;
	}

	/**
	 * Add default extensions: the catalog, every extension unavailable.
	 */
	public function add_default_extensions() {
		$this->extensions = array();
		foreach ( Modula_Extension_Catalog::copy() as $slug => $copy ) {
			$this->extensions[ $slug ] = array(
				'available'   => false,
				'enabled'     => false,
				'name'        => $copy['name'],
				'slug'        => $slug,
				'description' => $copy['description'],
			);
		}
	}

	/**
	 * Get extensions
	 *
	 * @return array
	 */
	public function get_extensions() {
		$active_extensions = get_option( $this->active_extensions, array() );
		$current_plan      = 'free';

		$this->update_extension_status( $active_extensions, $current_plan );
		$this->sort_extensions_by_business_order();

		$divider_slugs      = $this->find_divider_positions( $current_plan );
		$ordered_extensions = $this->build_ordered_extensions();
		$this->extensions   = $this->insert_dividers( $ordered_extensions, $divider_slugs );

		return $this->extensions;
	}

	/**
	 * Update enabled and available status for each extension
	 *
	 * @param array  $active_extensions Active extension slugs.
	 * @param string $current_plan      Current plan name.
	 */
	private function update_extension_status( $active_extensions, $current_plan ) {
		foreach ( $this->extensions as $extension => $data ) {
			$this->extensions[ $extension ]['enabled']   = in_array( $extension, $active_extensions, true );
			$this->extensions[ $extension ]['available'] = false;

			if ( $current_plan && isset( $this->plan_map[ $current_plan ] ) ) {
				if ( in_array( $extension, $this->plan_map[ $current_plan ], true ) ) {
					$this->extensions[ $extension ]['available'] = true;
				}
			}
		}
	}

	/**
	 * Sort extensions by business plan order
	 */
	private function sort_extensions_by_business_order() {
		$business_order = isset( $this->plan_map['business'] ) ? array_values( $this->plan_map['business'] ) : array();
		$index_map      = array_flip( $business_order );

		uasort(
			$this->extensions,
			function ( $a, $b ) use ( $index_map ) {
				$a_in = isset( $index_map[ $a['slug'] ] );
				$b_in = isset( $index_map[ $b['slug'] ] );

				if ( $a_in && $b_in ) {
					return $index_map[ $a['slug'] ] - $index_map[ $b['slug'] ];
				}
				if ( $a_in ) {
					return -1;
				}
				if ( $b_in ) {
					return 1;
				}

				// Fallback: based on availability
				if ( $a['available'] !== $b['available'] ) {
					return intval( $b['available'] ) - intval( $a['available'] );
				}

				return strcmp( $a['slug'], $b['slug'] );
			}
		);
	}

	/**
	 * Get plan upgrade hierarchy
	 *
	 * @return array Plan upgrade orders.
	 */
	private function get_plan_upgrade_orders() {
		return array(
			'free'     => array( 'starter', 'trio', 'business' ),
			'starter'  => array( 'trio', 'business' ),
			'trio'     => array( 'business' ),
			'business' => array(),
		);
	}

	/**
	 * Find positions where dividers should be placed
	 *
	 * @param string $current_plan Current plan name.
	 * @return array Divider slugs mapped to divider data (with divider_key and plan).
	 */
	private function find_divider_positions( $current_plan ) {
		$plan_orders   = $this->get_plan_upgrade_orders();
		$current_order = isset( $this->plan_map[ $current_plan ] ) ? array_values( $this->plan_map[ $current_plan ] ) : array();
		$divider_slugs = array();

		if ( empty( $plan_orders[ $current_plan ] ) ) {
			return $divider_slugs;
		}

		foreach ( $plan_orders[ $current_plan ] as $next_plan ) {
			if ( empty( $this->plan_map[ $next_plan ] ) ) {
				continue;
			}

			$next_plan_order = array_values( $this->plan_map[ $next_plan ] );
			$exclude_order   = $this->get_exclude_order_for_plan( $current_plan, $next_plan, $current_order );

			$first_unique_slug = $this->find_first_unique_extension( $next_plan_order, $exclude_order );
			if ( $first_unique_slug ) {
				$divider_slugs[ $first_unique_slug ] = array(
					'divider_key' => 'divider-before-' . $first_unique_slug,
					'plan'        => $next_plan,
				);
			}
		}

		return $divider_slugs;
	}

	/**
	 * Get the order array to exclude when checking for unique extensions
	 *
	 * @param string $current_plan Current plan name.
	 * @param string $next_plan     Next plan name.
	 * @param array  $current_order Current plan order.
	 * @return array Order array to exclude.
	 */
	private function get_exclude_order_for_plan( $current_plan, $next_plan, $current_order ) {
		if ( 'business' === $next_plan ) {
			if ( 'starter' === $current_plan ) {
				return isset( $this->plan_map['trio'] ) ? array_values( $this->plan_map['trio'] ) : $current_order;
			} elseif ( 'free' === $current_plan ) {
				return isset( $this->plan_map['trio'] ) ? array_values( $this->plan_map['trio'] ) : $current_order;
			}
		}

		if ( 'trio' === $next_plan && 'free' === $current_plan ) {
			return isset( $this->plan_map['starter'] ) ? array_values( $this->plan_map['starter'] ) : $current_order;
		}

		return $current_order;
	}

	/**
	 * Find the first extension slug that's unique to the next plan
	 *
	 * @param array $next_plan_order Extension order from next plan.
	 * @param array $exclude_order   Extensions to exclude.
	 * @return string|null First unique extension slug or null.
	 */
	private function find_first_unique_extension( $next_plan_order, $exclude_order ) {
		foreach ( $next_plan_order as $next_slug ) {
			if ( strpos( $next_slug, 'divider-' ) === 0 ) {
				continue;
			}

			if ( isset( $this->extensions[ $next_slug ] ) && ! in_array( $next_slug, $exclude_order, true ) ) {
				return $next_slug;
			}
		}

		return null;
	}

	/**
	 * Build ordered extensions array based on business plan order
	 *
	 * @return array Ordered extensions.
	 */
	private function build_ordered_extensions() {
		$business_order     = isset( $this->plan_map['business'] ) ? array_values( $this->plan_map['business'] ) : array();
		$ordered_extensions = array();

		foreach ( $business_order as $slug ) {
			if ( $this->is_divider_string( $slug ) ) {
				continue;
			}

			if ( isset( $this->extensions[ $slug ] ) ) {
				$ordered_extensions[ $slug ] = $this->extensions[ $slug ];
			}
		}

		foreach ( $this->extensions as $slug => $data ) {
			if ( ! isset( $ordered_extensions[ $slug ] ) ) {
				$ordered_extensions[ $slug ] = $data;
			}
		}

		return $ordered_extensions;
	}

	/**
	 * Check if a slug is a divider string
	 *
	 * @param string $slug Slug to check.
	 * @return bool True if divider string.
	 */
	private function is_divider_string( $slug ) {
		return strpos( $slug, 'divider-' ) === 0;
	}

	/**
	 * Insert dividers into the extensions array
	 *
	 * @param array $ordered_extensions Ordered extensions array.
	 * @param array $divider_slugs      Divider slugs mapped to divider data (with divider_key and plan).
	 * @return array Extensions with dividers inserted.
	 */
	private function insert_dividers( $ordered_extensions, $divider_slugs ) {
		$extensions_with_divider = array();

		foreach ( $ordered_extensions as $slug => $ext ) {
			if ( isset( $divider_slugs[ $slug ] ) ) {
				$divider_data = $divider_slugs[ $slug ];
				$extensions_with_divider[ $divider_data['divider_key'] ] = array(
					'is_divider' => true,
					'slug'       => $divider_data['divider_key'],
					'plan'       => $divider_data['plan'],
					'url'        => Modula_Extension_Catalog::upgrade_url( $divider_data['plan'] ),
				);
			}
			$extensions_with_divider[ $slug ] = $ext;
		}

		return $extensions_with_divider;
	}

	/**
	 * Calculate the numeric tier for a given plan.
	 *
	 * @param array  $plan_hierarchy Plan to tier mapping.
	 * @param string $plan           Current plan.
	 *
	 * @return int
	 */
	private function get_plan_tier( $plan_hierarchy, $plan ) {
		return $plan_hierarchy[ $plan ] ?? 0;
	}

	/**
	 * Apply badges for fields belonging to a tab with multiple plan mappings.
	 *
	 * @param array $fields          Fields configuration (by reference).
	 * @param array $plans_to_fields Required plans mapped to field ids.
	 * @param array $plan_hierarchy  Plan to tier mapping.
	 * @param int   $current_tier    Current plan tier.
	 */
	private function apply_field_badges( array &$fields, array $plans_to_fields, array $plan_hierarchy, $current_tier ) {
		foreach ( $plans_to_fields as $required_plan => $field_ids ) {
			$required_tier = $this->get_plan_tier( $plan_hierarchy, $required_plan );

			foreach ( $fields as &$field ) {
				if ( empty( $field['id'] ) || ! in_array( $field['id'], (array) $field_ids, true ) ) {
					continue;
				}

				if ( $current_tier >= $required_tier ) {
					$field['badge']  = null;
					$field['locked'] = false;
					continue;
				}

				$field['badge']  = $required_plan;
				$field['locked'] = true;
			}
			unset( $field );
		}
	}

	/**
	 * Apply badge for a tab that maps to a single required plan.
	 *
	 * @param array  $subtab         Tab configuration.
	 * @param string $required_plan  Plan required for unlocking.
	 * @param array  $plan_hierarchy Plan to tier mapping.
	 * @param int    $current_tier   Current plan tier.
	 *
	 * @return array
	 */
	private function apply_tab_badge( array $subtab, $required_plan, array $plan_hierarchy, $current_tier ) {
		$required_tier = $this->get_plan_tier( $plan_hierarchy, $required_plan );

		if ( $current_tier >= $required_tier ) {
			$subtab['badge']  = null;
			$subtab['locked'] = false;

			return $subtab;
		}

		$subtab['badge']  = $required_plan;
		$subtab['locked'] = true;

		return $subtab;
	}

	/**
	 * Replace proper badges for the subtabs.
	 *
	 * @param array $subtabs Subtabs configuration.
	 * @return array Subtabs configuration with proper badges.
	 */
	public function replace_proper_badges( $subtabs ) {
		$tabs = array(
			'standalone'   => 'trio',
			'compression'  => 'trio',
			'shortcodes'   => 'trio',
			'watermark'    => 'business',
			'roles'        => 'business',
			'video'        => 'starter',
			'social_media' => array(
				'trio'    => array( 'instagram' ),
				'starter' => array( 'youtube', 'vimeo', 'vimeo_credentials' ),
			),
		);

		$current_plan   = 'free';
		$plan_hierarchy = array(
			'free'     => 0,
			'starter'  => 1,
			'trio'     => 2,
			'business' => 3,
		);
		$current_tier   = $this->get_plan_tier( $plan_hierarchy, $current_plan );

		foreach ( $tabs as $tab_key => $required_plan ) {
			if ( ! isset( $subtabs[ $tab_key ] ) ) {
				continue;
			}

			// When a tab maps to multiple plans, badge the matching fields.
			if ( is_array( $required_plan ) ) {
				if ( isset( $subtabs[ $tab_key ]['config']['fields'] ) ) {
					$this->apply_field_badges(
						$subtabs[ $tab_key ]['config']['fields'],
						$required_plan,
						$plan_hierarchy,
						$current_tier
					);
				}

				$subtabs[ $tab_key ]['badge'] = null;
				continue;
			}

			// Simple tab-to-plan mapping.
			$subtabs[ $tab_key ] = $this->apply_tab_badge(
				$subtabs[ $tab_key ],
				$required_plan,
				$plan_hierarchy,
				$current_tier
			);
		}

		return $subtabs;
	}

	/**
	 * Check if an addon is upgradable
	 *
	 * @param string $addon Addon slug.
	 * @return bool True if upgradable, false otherwise.
	 */
	public function is_upgradable_addon( $addon = null ) {
		if ( ! $addon ) {
			return false;
		}

		$current_plan = get_option( $this->current_plan, 'free' );
		if ( ! isset( $this->plan_map[ $current_plan ] ) ) {
			$current_plan = 'free';
		}

		if ( ! modula_is_compatible_pro() ) {
			return true;
		}

		if ( 'modula' === $addon ) {
			return false;
		}

		$owned_extensions = $this->plan_map[ $current_plan ] ?? array();

		return ! in_array( $addon, $owned_extensions, true );
	}
	/**
	 * Get active extensions
	 *
	 * @return array Active extensions.
	 */
	public function get_active_extensions() {
		if ( empty( self::$active_extensions_cache ) ) {
			self::$active_extensions_cache = get_option( $this->active_extensions, array() );
		}
		return self::$active_extensions_cache;
	}

	/**
	 * Check if an extension is enabled
	 *
	 * @param string $extension Extension slug.
	 * @return bool True if enabled, false otherwise.
	 */
	public function extension_enabled( $extension ) {
		$active_extensions = $this->get_active_extensions();
		return in_array( $extension, $active_extensions, true );
	}
}
