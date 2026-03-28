/**
 * Test approche HYBRIDE :
 * 1. Copier le template Google Doc (formatage préservé)
 * 2. replaceAllText pour les balises du body (14)
 * 3. Télécharger en .docx, docxtemplater pour les 5 balises text-box, ré-uploader
 * 4. Export PDF
 */
import { google } from 'googleapis'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { Readable } from 'stream'
import fs from 'fs'

async function testHybrid() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  const TEMPLATE_ID = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!

  const balises: Record<string, string> = {
    DATE_EMISSION: '25 mars 2026',
    NUMERO_DOSSIER: 'TEST-HYBRIDE-001',
    VOYAGEUR_1: 'Jean Dupont (15 mai 1985)',
    VOYAGEUR_2: 'Marie Dupont (20 juin 1988)',
    VOYAGEUR_3: 'Lucas Dupont (10 mars 2015)',
    VOYAGEUR_4: '',
    VOYAGEUR_5: '',
    VOYAGEUR_6: '',
    VOYAGEUR_7: '',
    CLIENT_NOM: 'Jean Dupont',
    CLIENT_PAYS: 'FRANCE',
    CLIENT_TEL: '+33 6 12 34 56 78',
    DATE_ARRIVEE: '29 novembre 2026',
    NB_NUITS: '7',
    DATE_RETOUR: '6 décembre 2026',
    MOIS_ANNEE: 'novembre 2026',
    NB_CHAMBRES: '2',
    TYPE_CHAMBRE: 'Family',
    TOTAL_EUROS: '12 500',
  }

  // Balises qui sont dans les zones de texte (inaccessibles à replaceAllText)
  const TEXT_BOX_BALISES = ['DATE_ARRIVEE', 'DATE_RETOUR', 'MOIS_ANNEE', 'NB_CHAMBRES', 'TYPE_CHAMBRE']
  // NB_NUITS est dans zone de texte ET body, replaceAllText gère le body

  console.log('=== TEST APPROCHE HYBRIDE ===\n')

  // ÉTAPE 1 : Copier le template
  console.log('1. Copie du template Google Doc...')
  const copy = await drive.files.copy({
    fileId: TEMPLATE_ID,
    requestBody: { name: 'TEST_BI_HYBRIDE' },
  })
  const copyId = copy.data.id!
  console.log(`   OK - ID: ${copyId}`)

  // ÉTAPE 2 : replaceAllText pour les balises du body
  console.log('\n2. replaceAllText pour les balises du body...')
  const bodyRequests = Object.entries(balises)
    .filter(([key]) => !TEXT_BOX_BALISES.includes(key))
    .map(([key, value]) => ({
      replaceAllText: {
        containsText: { text: `{{${key}}}`, matchCase: true },
        replaceText: value,
      },
    }))

  const result = await docs.documents.batchUpdate({
    documentId: copyId,
    requestBody: { requests: bodyRequests },
  })

  let bodyCount = 0
  for (const reply of result.data.replies || []) {
    bodyCount += reply.replaceAllText?.occurrencesChanged || 0
  }
  console.log(`   OK - ${bodyCount} remplacements dans le body`)

  // ÉTAPE 3 : Télécharger en .docx pour traiter les zones de texte
  console.log('\n3. Téléchargement en .docx pour zones de texte...')
  const docxRes = await drive.files.export(
    { fileId: copyId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' }
  )
  const docxBuffer = Buffer.from(docxRes.data as ArrayBuffer)
  console.log(`   OK - ${docxBuffer.length} bytes`)

  // Vérifier les balises restantes dans le .docx
  const zip = new PizZip(docxBuffer)
  const xmlContent = zip.file('word/document.xml')!.asText()
  const remainingBalises = xmlContent.match(/\{\{[A-Z_]+\}\}/g) || []
  console.log(`   Balises restantes dans .docx: ${remainingBalises.join(', ')}`)

  // ÉTAPE 4 : Remplacer les balises text-box via docxtemplater
  console.log('\n4. Remplacement des balises text-box via docxtemplater...')
  const doc = new Docxtemplater(new PizZip(docxBuffer), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter() { return '' },
  })

  // On passe TOUTES les balises pour que docxtemplater remplace les restantes
  doc.render(balises)

  const filledBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  console.log(`   OK - ${filledBuffer.length} bytes`)

  // Vérifier qu'il ne reste plus rien
  const verifyZip = new PizZip(filledBuffer)
  const verifyXml = verifyZip.file('word/document.xml')!.asText()
  const finalRemaining = verifyXml.match(/\{\{[A-Z_]+\}\}/g) || []
  console.log(`   Balises restantes après docxtemplater: ${finalRemaining.length === 0 ? 'AUCUNE ✅' : finalRemaining.join(', ')}`)

  // ÉTAPE 5 : Ré-uploader le .docx modifié PAR-DESSUS la copie Google Doc
  console.log('\n5. Ré-upload du .docx modifié...')
  const stream = new Readable()
  stream.push(filledBuffer)
  stream.push(null)

  await drive.files.update({
    fileId: copyId,
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: stream,
    },
  })
  console.log('   OK - Document mis à jour')

  // ÉTAPE 6 : Export PDF
  console.log('\n6. Export en PDF...')
  const pdfRes = await drive.files.export(
    { fileId: copyId, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  )
  const pdfBuffer = Buffer.from(pdfRes.data as ArrayBuffer)
  console.log(`   OK - PDF: ${pdfBuffer.length} bytes (${Math.round(pdfBuffer.length / 1024)} Ko)`)

  fs.writeFileSync('/tmp/test_bi_hybride.pdf', pdfBuffer)
  console.log('   PDF sauvegardé: /tmp/test_bi_hybride.pdf')

  // COMPARE : Aussi générer via la méthode 100% docxtemplater
  console.log('\n--- COMPARAISON : méthode 100% docxtemplater ---')
  const tmplRes = await drive.files.export(
    { fileId: TEMPLATE_ID, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' }
  )
  const tmplZip = new PizZip(Buffer.from(tmplRes.data as ArrayBuffer))
  const tmplDoc = new Docxtemplater(tmplZip, {
    paragraphLoop: true, linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter() { return '' },
  })
  tmplDoc.render(balises)
  const tmplFilled = tmplDoc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  
  const tmplStream = new Readable()
  tmplStream.push(tmplFilled)
  tmplStream.push(null)
  
  const tmplUpload = await drive.files.create({
    requestBody: { name: 'TEST_BI_DOCXTEMPLATER_ONLY', mimeType: 'application/vnd.google-apps.document' },
    media: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: tmplStream },
    fields: 'id',
  })
  const tmplPdfRes = await drive.files.export(
    { fileId: tmplUpload.data.id!, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  )
  const tmplPdf = Buffer.from(tmplPdfRes.data as ArrayBuffer)
  fs.writeFileSync('/tmp/test_bi_docxtemplater_only.pdf', tmplPdf)
  console.log(`   PDF docxtemplater: ${tmplPdf.length} bytes (${Math.round(tmplPdf.length / 1024)} Ko)`)
  console.log('   PDF sauvegardé: /tmp/test_bi_docxtemplater_only.pdf')
  await drive.files.delete({ fileId: tmplUpload.data.id! })

  // Cleanup
  console.log('\n7. Nettoyage...')
  await drive.files.delete({ fileId: copyId })
  console.log('   Doc supprimé')

  console.log('\n=== RÉSULTAT ===')
  console.log('Comparez les deux PDFs:')
  console.log('  /tmp/test_bi_hybride.pdf          ← HYBRIDE (copie + API + docxtemplater text-box)')
  console.log('  /tmp/test_bi_docxtemplater_only.pdf ← 100% docxtemplater (ancienne méthode)')
}

testHybrid().catch(e => console.error('ERREUR:', e))
