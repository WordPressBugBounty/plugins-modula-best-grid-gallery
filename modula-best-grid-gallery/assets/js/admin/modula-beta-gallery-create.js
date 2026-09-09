( function () {
	'use strict';

	var data = window.modulaBetaGalleryCreate || {};
	var modal = document.getElementById( 'modula-beta-create-modal' );
	var pendingHref = '';

	document.addEventListener( 'click', function ( event ) {
		var convertLink = event.target.closest
			? event.target.closest( 'a[data-modula-convert-beta]' )
			: null;
		if ( ! convertLink ) {
			return;
		}
		var message = data.convertConfirm || '';
		if ( message && ! window.confirm( message ) ) {
			event.preventDefault();
		}
	} );

	if ( ! modal ) {
		return;
	}

	function isCreateUrl( href ) {
		if ( ! href ) {
			return false;
		}
		return (
			href.indexOf( 'post-new.php' ) !== -1 &&
			href.indexOf( 'modula-gallery' ) !== -1
		);
	}

	function withChoice( href, choice ) {
		try {
			var url = new URL( href, window.location.origin );
			url.searchParams.set( data.queryArg || 'modula_editor', choice );
			if ( data.createNonce ) {
				url.searchParams.set( '_wpnonce', data.createNonce );
			}
			return url.toString();
		} catch ( e ) {
			return href;
		}
	}

	function openModal( href ) {
		pendingHref = href || '';
		modal.hidden = false;
		modal.classList.add( 'is-open' );
		var primary = modal.querySelector( '[data-modula-beta-choice="beta"]' );
		if ( primary ) {
			primary.focus();
		}
	}

	function closeModal() {
		modal.hidden = true;
		modal.classList.remove( 'is-open' );
		pendingHref = '';
	}

	function goChoice( choice ) {
		if ( data.awaitingChoice && data.choiceUrl ) {
			var dest = data.choiceUrl;
			dest +=
				( dest.indexOf( '?' ) === -1 ? '?' : '&' ) +
				'choice=' +
				encodeURIComponent( choice );
			window.location.href = dest;
			return;
		}

		var href = pendingHref || data.postNewBase;
		if ( ! href ) {
			return;
		}
		window.location.href = withChoice( href, choice );
	}

	document.addEventListener( 'click', function ( event ) {
		var link = event.target.closest
			? event.target.closest( 'a' )
			: null;
		if ( ! link || data.awaitingChoice ) {
			return;
		}
		if ( ! isCreateUrl( link.href ) ) {
			return;
		}
		event.preventDefault();
		openModal( link.href );
	} );

	modal.addEventListener( 'click', function ( event ) {
		var dismiss = event.target.closest
			? event.target.closest( '[data-modula-beta-dismiss]' )
			: null;
		if ( dismiss ) {
			if ( data.awaitingChoice && data.listUrl ) {
				window.location.href = data.listUrl;
				return;
			}
			closeModal();
			return;
		}
		var choiceBtn = event.target.closest
			? event.target.closest( '[data-modula-beta-choice]' )
			: null;
		if ( choiceBtn ) {
			goChoice( choiceBtn.getAttribute( 'data-modula-beta-choice' ) );
		}
	} );

	document.addEventListener( 'keydown', function ( event ) {
		if ( 'Escape' !== event.key ) {
			return;
		}
		if ( modal.hidden ) {
			return;
		}
		if ( data.awaitingChoice && data.listUrl ) {
			window.location.href = data.listUrl;
			return;
		}
		closeModal();
	} );

	if ( data.awaitingChoice ) {
		openModal( '' );
	}
} )();
