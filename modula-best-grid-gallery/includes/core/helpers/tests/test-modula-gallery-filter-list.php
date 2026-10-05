<?php
/**
 * CLI tests: gallery filter list remove/strip helpers.
 *
 * php includes/core/helpers/tests/test-modula-gallery-filter-list.php
 *
 * @package Modula
 */

$failures = 0;

/**
 * @param bool   $ok  Assertion.
 * @param string $msg Label.
 * @return void
 */
function modula_filter_list_test_assert( $ok, $msg ) {
	global $failures;
	if ( $ok ) {
		echo "ok - {$msg}\n";
		return;
	}
	++$failures;
	echo "FAIL - {$msg}\n";
}

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', true );
}

require dirname( __DIR__ ) . '/modula-gallery-filter-list.php';

modula_filter_list_test_assert(
	function_exists( 'modula_gallery_filter_list_removed_names' ),
	'removed_names helper exists'
);
modula_filter_list_test_assert(
	function_exists( 'modula_gallery_filter_list_strip_names_from_images' ),
	'strip_names_from_images helper exists'
);

$removed = modula_gallery_filter_list_removed_names( array( 'alpha', 'beta' ), array( 'alpha' ) );
modula_filter_list_test_assert( array( 'beta' ) === $removed, 'partial remove reports dismissed names' );

$removed_all = modula_gallery_filter_list_removed_names( array( 'alpha', 'beta' ), array() );
modula_filter_list_test_assert( array( 'alpha', 'beta' ) === $removed_all, 'full clear reports all prior names' );

$removed_none = modula_gallery_filter_list_removed_names( array( 'alpha' ), array( 'alpha', 'beta' ) );
modula_filter_list_test_assert( array() === $removed_none, 'adds do not report removals' );

$images = array(
	array( 'id' => 1, 'filters' => 'alpha,beta' ),
	array( 'id' => 2, 'filters' => 'beta' ),
	array( 'id' => 3, 'filters' => 'gamma' ),
);
$stripped = modula_gallery_filter_list_strip_names_from_images( $images, array( 'beta' ) );
modula_filter_list_test_assert( true === $stripped['changed'], 'strip marks changed when tags removed' );
modula_filter_list_test_assert( 'alpha' === $stripped['images'][0]['filters'], 'strip keeps sibling tags' );
modula_filter_list_test_assert( '' === $stripped['images'][1]['filters'], 'strip clears sole dismissed tag' );
modula_filter_list_test_assert( 'gamma' === $stripped['images'][2]['filters'], 'strip leaves unrelated tags' );

$comma_images = array(
	array( 'id' => 4, 'filters' => 'hello&#44;world,keep' ),
);
$comma_stripped = modula_gallery_filter_list_strip_names_from_images( $comma_images, array( 'hello,world' ) );
modula_filter_list_test_assert( true === $comma_stripped['changed'], 'strip matches decoded Pro commas' );
modula_filter_list_test_assert( 'keep' === $comma_stripped['images'][0]['filters'], 'strip preserves remaining tag after Pro comma decode' );

$noop = modula_gallery_filter_list_strip_names_from_images( $images, array() );
modula_filter_list_test_assert( false === $noop['changed'] && $images === $noop['images'], 'empty removed list is a no-op' );

$clear_then_repair = modula_maybe_repair_gallery_filter_list(
	array(),
	$stripped['images']
);
modula_filter_list_test_assert(
	false === $clear_then_repair['repaired'] || ! in_array( 'beta', $clear_then_repair['list'], true ),
	'after strip, repair must not revive dismissed beta'
);

modula_filter_list_test_assert(
	function_exists( 'modula_classic_gallery_filter_list_save_args' ),
	'classic filter list save args helper exists'
);

$classic_clear = modula_classic_gallery_filter_list_save_args(
	array(
		'filters_submitted' => '1',
		'dropdownFilters'   => '0',
	),
	''
);
modula_filter_list_test_assert(
	true === $classic_clear['key_present'] && array() === $classic_clear['incoming'],
	'classic submitted UI with no filters rows is intentional clear'
);

$classic_missing = modula_classic_gallery_filter_list_save_args(
	array(
		'dropdownFilters' => '0',
	),
	null
);
modula_filter_list_test_assert(
	false === $classic_missing['key_present'] && null === $classic_missing['incoming'],
	'classic missing filters without submit signal keeps wipe protection'
);

$classic_partial = modula_classic_gallery_filter_list_save_args(
	array(
		'filters_submitted' => '1',
		'filters'           => array( 'hello' ),
	),
	array( 'hello' )
);
modula_filter_list_test_assert(
	true === $classic_partial['key_present'] && array( 'hello' ) === $classic_partial['incoming'],
	'classic submitted UI with remaining rows uses those values'
);

$classic_resolved = modula_resolve_gallery_filter_list_save(
	$classic_clear['incoming'],
	array( 'asd', 'hello' ),
	$classic_clear['key_present']
);
modula_filter_list_test_assert(
	array() === $classic_resolved,
	'classic intentional clear resolves to empty list'
);

$classic_preserved = modula_resolve_gallery_filter_list_save(
	$classic_missing['incoming'],
	array( 'asd', 'hello' ),
	$classic_missing['key_present']
);
modula_filter_list_test_assert(
	array( 'asd', 'hello' ) === $classic_preserved,
	'classic missing-key save still preserves existing list'
);

$classic_clear_images = array(
	array( 'id' => 1, 'filters' => 'asd,hello' ),
	array( 'id' => 2, 'filters' => 'hello' ),
);
$classic_removed = modula_gallery_filter_list_removed_names( array( 'asd', 'hello' ), $classic_resolved );
$classic_stripped = modula_gallery_filter_list_strip_names_from_images( $classic_clear_images, $classic_removed );
modula_filter_list_test_assert(
	array( 'asd', 'hello' ) === $classic_removed
		&& true === $classic_stripped['changed']
		&& '' === $classic_stripped['images'][0]['filters']
		&& '' === $classic_stripped['images'][1]['filters'],
	'classic clear-all strips matching image tags'
);
$classic_repair = modula_maybe_repair_gallery_filter_list( array(), $classic_stripped['images'] );
modula_filter_list_test_assert(
	false === $classic_repair['repaired'],
	'after classic clear-all strip, repair does not refill'
);

exit( $failures > 0 ? 1 : 0 );
