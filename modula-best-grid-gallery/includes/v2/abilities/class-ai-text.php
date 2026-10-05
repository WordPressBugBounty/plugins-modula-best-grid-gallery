<?php
/** Read-only compatibility for retained, retired AI image-text requests. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Ai_Text {
	public const GENERATE = 'modula/generate-attachment-text';

	public static function can_recover( array $record ): bool {
		return current_user_can( 'manage_options' ) && Attachments::can_read( (int) $record['target'] );
	}

	public static function result_schema(): array {
		return Contract::object(
			array(
				'attachment_id' => array( 'type' => 'integer' ),
				'phase'         => array( 'type' => 'string' ),
				'cached'        => array( 'type' => 'boolean' ),
				'text'          => Contract::object(
					array(
						'title' => array(
							'type'      => 'string',
							'maxLength' => 200,
						),
						'alt'   => array(
							'type'      => 'string',
							'maxLength' => 2000,
						),
					),
					array( 'title', 'alt' )
				),
			),
			array( 'attachment_id', 'phase', 'cached' )
		);
	}
}
