import { AiAssistantsCard } from '../cards/ai-assistants/AiAssistantsCard';
import { AllGalleriesCard } from '../cards/AllGalleriesCard';
import { ConnectionsCard } from '../cards/ConnectionsCard';
import { DiagnosticsCard } from '../cards/DiagnosticsCard';
import { EmailCard } from '../cards/EmailCard';
import { ImageCompressionCard } from '../cards/ImageCompressionCard';
import { ImageLicensingCard } from '../cards/ImageLicensingCard';
import { LicenseSettingsCard } from '../cards/LicenseSettingsCard';
import { MigrateCard } from '../cards/MigrateCard';
import { NewGalleriesCard } from '../cards/NewGalleriesCard';
import { RolesCard } from '../cards/RolesCard';
import { SmartCaptionsCard } from '../cards/SmartCaptionsCard';
import { StandalonePagesCard } from '../cards/StandalonePagesCard';
import { WatermarkCard } from '../cards/WatermarkCard';
import { FieldsCard } from './FieldsCard';

/**
 * Cards with their own layout, by card id. Any other card (Pro's Image
 * Guardian, a card a filter adds) is drawn from its fields by FieldsCard.
 */
const CARDS = {
	standalone: StandalonePagesCard,
	shortcodes: AllGalleriesCard,
	image_licensing: ImageLicensingCard,
	new_galleries: NewGalleriesCard,
	compression: ImageCompressionCard,
	watermark: WatermarkCard,
	// Modula AI's subtab key.
	imageseo: SmartCaptionsCard,
	mcp_connections: AiAssistantsCard,
	roles: RolesCard,
	social_media: ConnectionsCard,
	image_proofing: EmailCard,
	migrate: MigrateCard,
	diagnostics: DiagnosticsCard,
};

/**
 * @param {Object} card Projected settings card.
 * @return {import('react').ComponentType} The component that draws it.
 */
function cardComponent(card) {
	// The projection sends `license` or `settings`.
	if ('license' === card.kind) {
		return LicenseSettingsCard;
	}

	return Object.hasOwn(CARDS, card.id) ? CARDS[card.id] : FieldsCard;
}

/**
 * The cards of one settings section.
 *
 * @param {Object} props
 * @param {Object} props.section Projected settings section.
 */
export function SectionCards({ section }) {
	return section.cards.map((card) => {
		const Card = cardComponent(card);

		// Card ids are subtab keys, unique within their main tab.
		return <Card key={`${card.tab}:${card.id}`} card={card} />;
	});
}
