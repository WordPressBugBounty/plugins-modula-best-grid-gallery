const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums EXIF: displayExif enum (default|on|off) survives PATCH → reopen and
 * drives anonymous Lightbox caption metadata. Distinct from gallery enable_exif.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album EXIF settings journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album EXIF displayExif PATCH reopen public caption', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaExif;
		expect(album?.id).toBeTruthy();
		expect(album?.imageGalleryId).toBeTruthy();
		const cameraHint = album.cameraHint || 'E2E Album Camera';

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const readSettings = async () =>
			page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
				});
			}, album.id);

		const patchExif = async (displayExif, extra = {}) =>
			page.evaluate(
				async ({ albumId, displayExif: choice, extra: patchExtra }) => {
					return window.wp.apiFetch({
						path: `/modula/v2/album/${albumId}/settings`,
						method: 'PATCH',
						data: {
							exif: { displayExif: choice },
							...patchExtra,
						},
					});
				},
				{ albumId: album.id, displayExif, extra }
			);

		const openLightboxCaption = async ( publicPage ) => {
			const albumRoot = publicPage
				.locator( `#jtg-album-${ album.id }` )
				.first();
			await expect( albumRoot ).toBeVisible();
			const galleryLink = albumRoot
				.locator(
					`.gallery-link[data-gallery-id="${ album.imageGalleryId }"]`
				)
				.first();
			await expect( galleryLink ).toBeVisible();
			return { albumRoot, galleryLink };
		};

		const assertGalleryImagesCaption = async (
			galleryLink,
			{ expectCamera }
		) => {
			const raw = await galleryLink.getAttribute( 'data-gallery-images' );
			expect( raw ).toBeTruthy();
			if ( expectCamera ) {
				expect( raw ).toContain( cameraHint );
			} else {
				expect( raw ).not.toContain( cameraHint );
			}
		};

		const before = await readSettings();
		expect( before?.exif?.displayExif ).toBe( 'default' );
		expect( before?.layout?.gutter ).toBe( 16 );
		expect( before?.lightbox?.enableLightbox ).toBe( true );

		const forcedOn = await patchExif( 'on', {
			lightbox: { enableLightbox: true, showImageCaption: true },
			layout: { gutter: 16 },
		} );
		expect( forcedOn?.exif?.displayExif ).toBe( 'on' );
		expect( forcedOn?.layout?.gutter ).toBe( 16 );
		expect( forcedOn?.lightbox?.enableLightbox ).toBe( true );

		const reopenedOn = await readSettings();
		expect( reopenedOn?.exif?.displayExif ).toBe( 'on' );
		expect( reopenedOn?.layout?.gutter ).toBe( 16 );

		const visitorOn = await evidence.anonymous();
		try {
			const publicPage = await visitorOn.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaExif
			);
			expect( response.ok() ).toBe( true );
			const { galleryLink } = await openLightboxCaption( publicPage );
			await assertGalleryImagesCaption( galleryLink, {
				expectCamera: true,
			} );
			await galleryLink.click();
			const lightbox = publicPage.locator( '.modula-fancybox-container' );
			await expect( lightbox ).toBeVisible();
			await expect( lightbox ).toContainText( cameraHint );
			await expect( lightbox.locator( '.modula-exif' ) ).toBeVisible();
			await evidence.capture( publicPage, 'album-exif-on' );
			await publicPage.keyboard.press( 'Escape' );
		} finally {
			await evidence.closeVisitor( visitorOn );
		}

		const forcedOff = await patchExif( 'off' );
		expect( forcedOff?.exif?.displayExif ).toBe( 'off' );

		const layoutOnly = await page.evaluate( async ( albumId ) => {
			return window.wp.apiFetch( {
				path: `/modula/v2/album/${ albumId }/settings`,
				method: 'PATCH',
				data: { layout: { gutter: 24 } },
			} );
		}, album.id );
		expect( layoutOnly?.layout?.gutter ).toBe( 24 );
		expect( layoutOnly?.exif?.displayExif ).toBe( 'off' );

		const visitorOff = await evidence.anonymous();
		try {
			const publicPage = await visitorOff.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaExif
			);
			expect( response.ok() ).toBe( true );
			const { galleryLink } = await openLightboxCaption( publicPage );
			await assertGalleryImagesCaption( galleryLink, {
				expectCamera: false,
			} );
			await galleryLink.click();
			const lightbox = publicPage.locator( '.modula-fancybox-container' );
			await expect( lightbox ).toBeVisible();
			await expect( lightbox ).not.toContainText( cameraHint );
			await expect( lightbox.locator( '.modula-exif' ) ).toHaveCount( 0 );
			await evidence.capture( publicPage, 'album-exif-off' );
			await publicPage.keyboard.press( 'Escape' );
		} finally {
			await evidence.closeVisitor( visitorOff );
		}

		// default follows member gallery enable_exif (seeded on).
		const followGallery = await patchExif( 'default', {
			layout: { gutter: 24 },
		} );
		expect( followGallery?.exif?.displayExif ).toBe( 'default' );
		expect( followGallery?.layout?.gutter ).toBe( 24 );

		const visitorDefault = await evidence.anonymous();
		try {
			const publicPage = await visitorDefault.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaExif
			);
			expect( response.ok() ).toBe( true );
			const { galleryLink } = await openLightboxCaption( publicPage );
			await assertGalleryImagesCaption( galleryLink, {
				expectCamera: true,
			} );
			await galleryLink.click();
			const lightbox = publicPage.locator( '.modula-fancybox-container' );
			await expect( lightbox ).toBeVisible();
			await expect( lightbox ).toContainText( cameraHint );
			await evidence.capture( publicPage, 'album-exif-default-follows' );
		} finally {
			await evidence.closeVisitor( visitorDefault );
		}

		await testInfo.attach('album-exif-settings.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					galleryId: album.imageGalleryId,
					onShows: true,
					offHidesDespiteGalleryEnable: true,
					defaultFollowsGallery: true,
					layoutOmitPreserved: true,
					cameraHint,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
