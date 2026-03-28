import { generateBIFromGoogleDoc } from '../lib/services/google-docs.service'
import { google } from 'googleapis'
import fs from 'fs'

async function testService() {
  console.log('=== TEST SERVICE generateBIFromGoogleDoc avec LibreOffice ===\n')

  const balises = {
    DATE_EMISSION: '25 mars 2026',
    NUMERO_DOSSIER: 'SRVTEST-001',
    VOYAGEUR_1: 'Test User (15 mai 1985)',
    VOYAGEUR_2: '', VOYAGEUR_3: '', VOYAGEUR_4: '',
    VOYAGEUR_5: '', VOYAGEUR_6: '', VOYAGEUR_7: '',
    CLIENT_NOM: 'Test User',
    CLIENT_PAYS: 'FRANCE',
    CLIENT_TEL: '+33612345678',
    DATE_ARRIVEE: '29 novembre 2026',
    NB_NUITS: '7',
    DATE_RETOUR: '6 décembre 2026',
    MOIS_ANNEE: 'novembre 2026',
    NB_CHAMBRES: '2',
    TYPE_CHAMBRE: 'Family',
    TOTAL_EUROS: '8 500',
  }

  const result = await generateBIFromGoogleDoc(balises, 'TEST_SERVICE_LIBRE')

  console.log(`PDF: ${result.pdfBuffer.length} bytes (${Math.round(result.pdfBuffer.length / 1024)} Ko)`)
  console.log(`Doc URL: ${result.docUrl}`)
  console.log(`Doc ID: ${result.docId}`)

  // Save PDF for inspection
  fs.writeFileSync('/tmp/test_service_libreoffice.pdf', result.pdfBuffer)
  console.log('PDF sauvegardé: /tmp/test_service_libreoffice.pdf')

  // Check if it's a real PDF
  const header = result.pdfBuffer.slice(0, 5).toString()
  console.log(`\nPDF header: "${header}" ${header === '%PDF-' ? '✅' : '❌'}`)

  // Cleanup
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  const drive = google.drive({ version: 'v3', auth })
  await drive.files.delete({ fileId: result.docId })
  console.log('Doc Google Drive nettoyé ✅')
}

testService().catch(e => console.error('ERREUR:', e))
