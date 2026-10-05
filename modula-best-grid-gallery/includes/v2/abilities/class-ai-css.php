<?php
/** Read-only compatibility for retained, retired AI CSS requests. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;
final class Ai_Css {
	public const GENERATE = 'modula/generate-gallery-css';
	public static function can_recover( array $record ): bool {
		return Update::can_update( (int) $record['target'] );
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'gallery_id'      => array( 'type' => 'integer' ),
				'revision'        => Contract::revision_schema(),
				'phase'           => array(
					'type' => 'string',
					'enum' => array( 'provider_request', 'proposal', 'rejected', 'unconfirmed' ),
				),
				'provider_status' => array(
					'type'    => 'integer',
					'minimum' => 0,
					'maximum' => 599,
				),
				'code'            => array(
					'type'      => 'string',
					'maxLength' => 65536,
				),
			),
			array( 'gallery_id', 'revision', 'phase' )
		);
	}
}
