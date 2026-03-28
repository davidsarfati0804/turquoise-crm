import { google } from 'googleapis'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { Readable } from 'stream'

const TEMPLATE_DOC_ID = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID || ''
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || ''

function getAuth() {
  // Méthode 1 : OAuth2 avec refresh token (recommandé si les clés de service account sont bloquées)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    return oauth2Client
  }

  // Méthode 2 : Service Account JSON (fallback)
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credentials) {
    throw new Error(
      'Google Auth non configuré. Ajoutez soit GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN, ' +
      'soit GOOGLE_SERVICE_ACCOUNT_JSON dans .env.local'
    )
  }

  const parsed = JSON.parse(credentials)
  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ],
  })
}

/**
 * Prépare TOUTES les balises pour le template Google Doc.
 * Le template Google Doc doit contenir ces balises entre doubles accolades : {{NOM_BALISE}}
 */
export function prepareBalisesForGoogleDoc(biData: any): Record<string, string> {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Voyageurs 1-7 (format texte pour Google Doc, pas HTML)
  const participants = biData.participants || []
  const voyageurs: Record<string, string> = {}
  for (let i = 1; i <= 7; i++) {
    const p = participants[i - 1]
    if (p) {
      const nom = `${p.first_name || ''} ${p.last_name || ''}`.trim()
      const type = p.participant_type === 'adult' ? 'Adulte'
        : p.participant_type === 'child' ? 'Enfant'
        : p.participant_type === 'baby' ? 'Bébé'
        : p.participant_type || ''
      const dob = p.date_of_birth ? formatDate(p.date_of_birth) : ''
      const passport = p.passport_number || ''
      voyageurs[`VOYAGEUR_${i}_NOM`] = nom
      voyageurs[`VOYAGEUR_${i}_TYPE`] = type
      voyageurs[`VOYAGEUR_${i}_DDN`] = dob
      voyageurs[`VOYAGEUR_${i}_PASSEPORT`] = passport
      // Aussi le format compact pour templates simples
      voyageurs[`VOYAGEUR_${i}`] = nom + (dob ? ` (${dob})` : '')
    } else {
      voyageurs[`VOYAGEUR_${i}_NOM`] = ''
      voyageurs[`VOYAGEUR_${i}_TYPE`] = ''
      voyageurs[`VOYAGEUR_${i}_DDN`] = ''
      voyageurs[`VOYAGEUR_${i}_PASSEPORT`] = ''
      voyageurs[`VOYAGEUR_${i}`] = ''
    }
  }

  // Pension
  const pensionDesc = [
    biData.event?.pension_type || 'Pension complète',
    biData.event?.pension_details || 'Hors Boissons',
  ].filter(Boolean).join(' - ')

  // Nounou
  const nounouDesc = biData.event?.nounou_included
    ? (biData.event?.nounou_details || 'Nounou privée incluse enfant -4ans 10h00 à 17h00')
    : ''

  // Services inclus
  const services = biData.included_services || ['Transferts aéroport/hôtel/aéroport']
  const servicesList = services.join(', ')

  // Assurance
  let assuranceStatus = 'Non renseigné'
  if (biData.insurance_accepted) assuranceStatus = '☑ Acceptée'
  else if (biData.insurance_refused) assuranceStatus = '☑ Refusée'
  else if (biData.insurance_included) assuranceStatus = '☑ Incluse'

  const devise = biData.pricing?.currency || 'EUR'
  const deviseSymbol = devise === 'EUR' ? '€' : devise

  return {
    // Document
    DATE_EMISSION: formatDate(biData.generated_at),
    NUMERO_DOSSIER: biData.file_reference || '',
    BI_NUMBER: biData.bi_number || '',

    // Client
    CLIENT_NOM: `${biData.client?.first_name || ''} ${biData.client?.last_name || ''}`.trim(),
    CLIENT_PAYS: biData.client?.country || 'FRANCE',
    CLIENT_TEL: biData.client?.phone || '',
    CLIENT_EMAIL: biData.client?.email || '',

    // Participants
    ...voyageurs,
    TOTAL_PARTICIPANTS: String(biData.total_participants || participants.length || 0),
    NB_ADULTES: String(biData.adults_count || 0),
    NB_ENFANTS: String(biData.children_count || 0),
    NB_BEBES: String(biData.babies_count || 0),

    // Séjour
    EVENEMENT: biData.event?.name || '',
    DESTINATION: biData.event?.destination || biData.event?.destination_label || '',
    NB_NUITS: String(biData.event?.nights_count || ''),
    DATE_ARRIVEE: formatDate(biData.event?.arrival_date),
    DATE_DEPART: formatDate(biData.event?.departure_date),
    DATE_RETOUR: formatDate(biData.event?.departure_date || biData.event?.return_date),
    MOIS_ANNEE: biData.event?.arrival_date
      ? new Date(biData.event.arrival_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : '',
    CHECK_IN: biData.event?.check_in_time || '15h00',
    CHECK_OUT: biData.event?.check_out_time || '12h00',

    // Hébergement
    PENSION_TYPE: pensionDesc,
    NOUNOU_DETAILS: nounouDesc,
    TYPE_CHAMBRE: biData.room_type?.name || '',
    NB_CHAMBRES: String(biData.rooms_count || biData.nb_chambres || ''),
    PRIX_CHAMBRE: biData.pricing?.price_per_night != null ? String(biData.pricing.price_per_night) : '',

    // Tarification
    TOTAL_EUROS: biData.quoted_price != null ? String(biData.quoted_price) : '',
    MONTANT_PAYE: biData.amount_paid != null ? String(biData.amount_paid) : '0',
    SOLDE_DU: biData.balance_due != null ? String(biData.balance_due) : '',
    DEVISE: deviseSymbol,

    // Divers
    OBSERVATIONS: biData.observations || '',
    SERVICES_INCLUS: servicesList,
    ASSURANCE_STATUS: assuranceStatus,
  }
}

/**
 * Télécharge le template en .docx, remplace les balises via docxtemplater,
 * upload le résultat sur Google Drive, et exporte en PDF.
 * Cette approche permet de remplacer les balises dans les zones de texte (text boxes)
 * qui sont inaccessibles via l'API Google Docs.
 */
export async function generateBIFromGoogleDoc(
  balises: Record<string, string>,
  fileName: string
): Promise<{ pdfBuffer: Buffer; docUrl: string; docId: string }> {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  if (!TEMPLATE_DOC_ID) {
    throw new Error('GOOGLE_DOCS_BI_TEMPLATE_ID non configuré dans .env.local')
  }

  // 1. Télécharger le template en .docx
  const templateResponse = await drive.files.export(
    {
      fileId: TEMPLATE_DOC_ID,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    { responseType: 'arraybuffer' }
  )

  const templateBuffer = Buffer.from(templateResponse.data as ArrayBuffer)

  // 2. Remplacer les balises avec docxtemplater
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter() {
      return ''
    },
  })

  doc.render(balises)

  const filledBuffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })

  // 3. Upload le .docx rempli sur Google Drive (converti en Google Doc)
  const bufferStream = new Readable()
  bufferStream.push(filledBuffer)
  bufferStream.push(null)

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/vnd.google-apps.document',
      ...(GOOGLE_DRIVE_FOLDER_ID ? { parents: [GOOGLE_DRIVE_FOLDER_ID] } : {}),
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: bufferStream,
    },
    fields: 'id',
  })

  const newDocId = uploadResponse.data.id!

  // 4. Exporter en PDF
  const pdfResponse = await drive.files.export(
    {
      fileId: newDocId,
      mimeType: 'application/pdf',
    },
    { responseType: 'arraybuffer' }
  )

  const pdfBuffer = Buffer.from(pdfResponse.data as ArrayBuffer)
  const docUrl = `https://docs.google.com/document/d/${newDocId}/edit`

  return { pdfBuffer, docUrl, docId: newDocId }
}
