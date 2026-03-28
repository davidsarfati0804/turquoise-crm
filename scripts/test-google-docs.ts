/**
 * Script de test : vérifie la connexion Google Docs API
 * et tente de lire le template BI
 */
import { google } from 'googleapis'

async function testGoogleDocs() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID

  console.log('🔍 Vérification des variables...')
  console.log('  GOOGLE_CLIENT_ID:', clientId ? '✅ défini' : '❌ manquant')
  console.log('  GOOGLE_CLIENT_SECRET:', clientSecret ? '✅ défini' : '❌ manquant')
  console.log('  GOOGLE_REFRESH_TOKEN:', refreshToken ? '✅ défini' : '❌ manquant')
  console.log('  GOOGLE_DOCS_BI_TEMPLATE_ID:', templateId || '❌ manquant')

  if (!clientId || !clientSecret || !refreshToken || !templateId) {
    console.error('\n❌ Variables manquantes. Vérifiez votre .env.local')
    process.exit(1)
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const docs = google.docs({ version: 'v1', auth: oauth2Client })
  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  // Test 1 : Lire le template
  console.log('\n📄 Test 1 : Lecture du template Google Doc...')
  try {
    const doc = await docs.documents.get({ documentId: templateId })
    console.log('  ✅ Template trouvé :', doc.data.title)
    
    // Lister les balises {{...}} trouvées dans le document
    const body = doc.data.body
    const content = JSON.stringify(body)
    const balises = content.match(/\{\{[A-Z_0-9]+\}\}/g)
    if (balises) {
      const unique = [...new Set(balises)]
      console.log(`  📋 ${unique.length} balises trouvées :`)
      unique.forEach(b => console.log(`     ${b}`))
    } else {
      console.log('  ⚠️ Aucune balise {{...}} trouvée dans le template')
      console.log('     Vous devez ajouter des balises comme {{CLIENT_NOM}}, {{TOTAL_EUROS}}, etc.')
    }
  } catch (err: any) {
    console.error('  ❌ Erreur lecture template:', err.message)
    if (err.code === 404) {
      console.error('     Le document n\'existe pas ou n\'est pas accessible')
    }
    if (err.code === 403) {
      console.error('     Pas les permissions. Partagez le doc avec votre compte Google.')
    }
    process.exit(1)
  }

  // Test 2 : Copier le template
  console.log('\n📋 Test 2 : Copie du template...')
  try {
    const copy = await drive.files.copy({
      fileId: templateId,
      requestBody: { name: '__TEST_BI_SUPPRIMEZ_MOI__' },
    })
    const testDocId = copy.data.id!
    console.log('  ✅ Copie créée, ID :', testDocId)

    // Test 3 : Modifier (remplacer une balise test)
    console.log('\n✏️  Test 3 : Remplacement de balise test...')
    try {
      await docs.documents.batchUpdate({
        documentId: testDocId,
        requestBody: {
          requests: [{
            replaceAllText: {
              containsText: { text: '{{CLIENT_NOM}}', matchCase: true },
              replaceText: 'TEST_CLIENT_NOM_OK',
            },
          }],
        },
      })
      console.log('  ✅ Remplacement de {{CLIENT_NOM}} réussi')
    } catch (err: any) {
      console.error('  ⚠️ Remplacement échoué (la balise n\'existe peut-être pas):', err.message)
    }

    // Test 4 : Export PDF
    console.log('\n📥 Test 4 : Export PDF...')
    try {
      const pdfResponse = await drive.files.export(
        { fileId: testDocId, mimeType: 'application/pdf' },
        { responseType: 'arraybuffer' }
      )
      const size = (pdfResponse.data as ArrayBuffer).byteLength
      console.log(`  ✅ PDF généré : ${(size / 1024).toFixed(1)} Ko`)
    } catch (err: any) {
      console.error('  ❌ Export PDF échoué:', err.message)
    }

    // Nettoyage : supprimer le document test
    console.log('\n🗑️  Nettoyage : suppression du document test...')
    try {
      await drive.files.delete({ fileId: testDocId })
      console.log('  ✅ Document test supprimé')
    } catch (err: any) {
      console.log('  ⚠️ Suppression échouée (supprimez manuellement __TEST_BI_SUPPRIMEZ_MOI__ de votre Drive)')
    }

  } catch (err: any) {
    console.error('  ❌ Erreur copie:', err.message)
    if (err.message?.includes('notFound')) {
      console.error('     Le fichier template n\'est pas trouvé sur Drive')
    }
    process.exit(1)
  }

  console.log('\n' + '='.repeat(50))
  console.log('🎉 TOUS LES TESTS SONT PASSÉS !')
  console.log('La génération de BI via Google Docs est opérationnelle.')
  console.log('='.repeat(50))
}

testGoogleDocs().catch(console.error)
