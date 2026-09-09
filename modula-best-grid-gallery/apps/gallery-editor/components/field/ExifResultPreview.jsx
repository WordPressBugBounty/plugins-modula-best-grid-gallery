/**
 * Sample EXIF strip preview from which shooting-data toggles are on.
 */
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { getByPath } from '../../logic/getByPath';
import SettingsPreviewPanel from './SettingsPreviewPanel';

const SAMPLE_PARTS = [
	{
		path: 'exif.exifCamera',
		sample: 'Canon EOS R5',
	},
	{
		path: 'exif.exifLens',
		sample: 'RF 24–70mm F2.8',
	},
	{
		path: 'exif.exifShutterSpeed',
		sample: '1/250s',
	},
	{
		path: 'exif.exifAperture',
		sample: 'f/2.8',
	},
	{
		path: 'exif.exifFocalLength',
		sample: '50mm',
	},
	{
		path: 'exif.exifIso',
		sample: 'ISO 400',
	},
	{
		path: 'exif.exifDate',
		sample: '12 Mar 2024, 16:41',
	},
];

/**
 * @param {unknown} value
 * @return {boolean}
 */
function isOn(value) {
	return value === true || value === 1 || value === '1';
}

export default function ExifResultPreview() {
	const { form } = useGallerySettingsFormBundle();

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => {
				const parts = SAMPLE_PARTS.filter((row) =>
					isOn(getByPath(values, row.path))
				).map((row) => row.sample);
				const text =
					parts.length > 0
						? parts.join(' · ')
						: __(
								'Nothing selected — turn fields on above.',
								'modula-best-grid-gallery'
							);
				return (
					<SettingsPreviewPanel
						label={__(
							'What visitors see',
							'modula-best-grid-gallery'
						)}
						footer={__(
							'Images shot without this data simply skip the missing parts.',
							'modula-best-grid-gallery'
						)}
					>
						<p className="modula-settings-editor__settings-preview-sample">
							{text}
						</p>
					</SettingsPreviewPanel>
				);
			}}
		</form.Subscribe>
	);
}
