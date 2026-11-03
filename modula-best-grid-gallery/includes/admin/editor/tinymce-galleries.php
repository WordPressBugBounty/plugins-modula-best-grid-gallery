<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title><?php echo esc_html__( 'Modula Galleries', 'modula-best-grid-gallery' ); ?></title>
	<?php
	wp_print_styles( array( 'modula-edit-style' ) );
	wp_print_scripts( array( 'jquery', 'modula-tinymce-popup' ) );
	?>
	<style type="text/css">
		h1 {
			color: black;
		}

		body {
			overflow-y: scroll;
			padding: 5px 20px 100px 20px;
			height: auto;
		}

		#galleries {
			width: 100%;
			border-collapse: collapse;
		}

		#galleries thead tr {
			background-color: #90caf9;
		}

		#galleries tbody tr {
			background-color: #e3f2fd;
			cursor: pointer;
		}

		#galleries tbody tr:hover {
			background-color: #bbdefb;
		}

		#galleries td, #galleries th {
			border: 1px solid white;
			padding: 10px;
			text-align: left;
		}

		.modula-logo-center span,
		.modula-logo-center img {
			display: inline-block;
			vertical-align: middle;
		}

		.modula-logo-center img {
			max-width: 75px;
			height: auto;
		}
	</style>
</head>
<body class="popup">
<h1 class="modula-logo-center"><span><?php echo esc_html__( 'YOUR GALLERIES:', 'modula-best-grid-gallery' ); ?></span>
	<img src="<?php echo esc_url( MODULA_URL . 'assets/images/modula-logo.jpg' ); ?>" class="modula-logo-center"></h1>
<br>
<?php if ( empty( $galleries ) ) : ?>
	<p><?php echo esc_html__( 'You don’t have a gallery created, please go and add one', 'modula-best-grid-gallery' ); ?></p>
<?php else : ?>
	<table id="galleries">
		<thead>
			<tr>
				<th><?php echo esc_html__( 'Name', 'modula-best-grid-gallery' ); ?></th>
				<th><?php echo esc_html( 'ID' ); ?></th>
			</tr>
		</thead>
		<tbody>
			<?php foreach ( $galleries as $modula_gallery_id => $modula_gallery_title ) : ?>
				<tr>
					<td>
						<label id="<?php echo esc_attr( $modula_gallery_id ); ?>"><?php echo esc_html( $modula_gallery_title ); ?></label>
					</td>
					<td>
						<?php echo esc_html( $modula_gallery_id ); ?>
					</td>
				</tr>
			<?php endforeach; ?>
		</tbody>
	</table>
<?php endif; ?>
<script>
	jQuery( '#galleries tbody tr' ).click( function () {
		var id = jQuery( this ).find( 'label' ).attr( 'id' );
		top.tinymce.activeEditor.insertContent( '[modula id="' + id + '"]' );
		top.tinymce.activeEditor.windowManager.close();
	} );
</script>
</body>
</html>
