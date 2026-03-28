/**
 * Test : docxtemplater + LibreOffice PDF
 * 1. Télécharger le template .docx depuis Google Drive
 * 2. Remplacer les balises avec docxtemplater
 * 3. Convertir en PDF avec LibreOffice (formatage parfait)
 * 4. Uploader le Google Doc pour avoir un lien
 */
import { google } from 'googleapis'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { Readable } from 'stream'
import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import os from 'os'

async function testLibreOffice() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  const drive = google.drive({ version: 'v3', auth })

  const TEMPLATE_ID = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!

  const balises: Record<string, string> = {
    DATE_EMISSION: '25 mars 2026',
    NUMERO_DOSSIER: 'TEST-LIBRE-001',
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

  console.log('=== TEST LIBREOFFICE PDF ===\n')

  // 1. Télécharger le template
  console.log('1. Téléchargement du template .docx...')
  const res = await drive.files.export(
    { fileId: TEMPLATE_ID, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' }
  )
  const templateBuffer = Buffer.from(res.data as ArrayBuffer)
  console.log(`   OK - ${templateBuffer.length} bytes`)

  // 2. Remplacer les balises
  console.log('\n2. Remplacement des balises avec docxtemplater...')
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter() { return '' },
  })
  doc.render(balises)

  const filledBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  console.log(`   OK - ${filledBuffer.length} bytes`)

  // Vérifier balises
  const verifyXml = new PizZip(filledBuffer).file('word/document.xml')!.asText()
  const remaining = verifyXml.match(/\{\{[A-Z_]+\}\}/g) || []
  console.log(`   Balises restantes: ${remaining.length === 0 ? 'AUCUNE ✅' : remaining.join(', ')}`)

  // Vérifications individuelles
  const checks = ['25 mars 2026', 'TEST-LIBRE-001', 'Jean Dupont', '29 novembre 2026', '6 décembre 2026', 'novembre 2026', '2', 'Family', '12 500']
  for (const check of checks) {
    const found = verifyXml.includes(check)
    console.log(`   ${found ? '✅' : '❌'} "${check}" ${found ? 'trouvé' : 'NON trouvé'}`)
  }

  // 3. Sauvegarder le .docx temporaire
  const tmpDir = os.tmpdir()
  const docxPath = path.join(tmpDir, 'test_bi_libreoffice.docx')
  const pdfPath = path.join(tmpDir, 'test_bi_libreoffice.pdf')
  fs.writeFileSync(docxPath, filledBuffer)
  console.log(`\n3. .docx sauvegardé: ${docxPath}`)

  // 4. Convertir en PDF avec LibreOffice
  console.log('\n4. Conversion PDF avec LibreOffice...')
  const soffice = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  
  try {
    execSync(`"${soffice}" --headless --convert-to pdf --outdir "${tmpDir}" "${docxPath}"`, {
      timeout: 30000,
      stdio: 'pipe',
    })
    
    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath)
      console.log(`   ✅ PDF LibreOffice: ${pdfBuffer.length} bytes (${Math.round(pdfBuffer.length / 1024)} Ko)`)
      console.log(`   PDF sauvegardé: ${pdfPath}`)
    } else {
      console.log('   ❌ PDF non créé')
      // Lister les fichiers pour debug
      const files = fs.readdirSync(tmpDir).filter(f => f.includes('test_bi'))
      console.log(`   Fichiers trouvés: ${files.join(', ')}`)
    }
  } catch (err: any) {
    console.error(`   ❌ Erreur LibreOffice: ${err.message}`)
    if (err.stderr) console.error(`   stderr: ${err.stderr.toString()}`)
  }

  // 5. Aussi générer via Google Docs pour comparaison
  console.log('\n5. Comparaison : PDF via Google Docs...')
  const stream = new Readable()
  stream.push(filledBuffer)
  stream.push(null)
  
  const uploadRes = await drive.files.create({
    requestBody: { name: 'TEST_BI_COMPARE', mimeType: 'application/vnd.google-apps.document' },
    media: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: stream },
    fields: 'id',
  })
  const googlePdfRes = await drive.files.export(
    { fileId: uploadRes.data.id!, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  )
  const googlePdf = Buffer.from(googlePdfRes.data as ArrayBuffer)
  const googlePdfPath = path.join(tmpDir, 'test_bi_google.pdf')
  fs.writeFileSync(googlePdfPath, googlePdf)
  console.log(`   PDF Google Docs: ${googlePdf.length} bytes (${Math.round(googlePdf.length / 1024)} Ko)`)
  await drive.files.delete({ fileId: uploadRes.data.id! })

  console.log('\n=== RÉSULTAT ===')
  console.log(`Comparez les PDFs:`)
  console.log(`  ${pdfPath}    ← LibreOffice (devrait être pixel-perfect)`)
  console.log(`  ${googlePdfPath}  ← Google Docs (text boxes décalées)`)

  // Cleanup docx
  fs.unlinkSync(docxPath)
}

testLibreOffice().catch(e => console.error('ERREUR:', e))
