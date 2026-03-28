/**
 * Diagnostic du fichier template - vérifie le type et tente la conversion
 */
import { google } from 'googleapis'

async function diagnose() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!

  console.log('🔍 Diagnostic du fichier template...\n')

  // Vérifier le type du fichier
  try {
    const file = await drive.files.get({
      fileId: templateId,
      fields: 'id,name,mimeType,webViewLink',
    })

    console.log('  Nom :', file.data.name)
    console.log('  Type MIME :', file.data.mimeType)
    console.log('  Lien :', file.data.webViewLink)

    if (file.data.mimeType === 'application/vnd.google-apps.document') {
      console.log('\n✅ C\'est bien un Google Doc natif. Le problème est ailleurs.')
    } else {
      console.log(`\n⚠️  Ce n'est PAS un Google Doc natif !`)
      console.log(`   Type détecté : ${file.data.mimeType}`)
      console.log(`   Il faut le convertir en Google Docs.`)

      // Tenter la copie avec conversion
      console.log('\n🔄 Tentative de copie avec conversion en Google Docs...')
      const copy = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: `${file.data.name} (Google Docs)`,
          mimeType: 'application/vnd.google-apps.document',
        },
      })

      console.log(`\n✅ Copie convertie créée !`)
      console.log(`   Nouveau ID : ${copy.data.id}`)
      console.log(`   Lien : https://docs.google.com/document/d/${copy.data.id}/edit`)
      console.log(`\n📝 Mettez à jour votre .env.local avec :`)
      console.log(`   GOOGLE_DOCS_BI_TEMPLATE_ID=${copy.data.id}`)

      // Vérifier que le nouveau doc est lisible
      const docs = google.docs({ version: 'v1', auth: oauth2Client })
      const newDoc = await docs.documents.get({ documentId: copy.data.id! })
      console.log(`\n✅ Nouveau template lisible : "${newDoc.data.title}"`)

      // Chercher les balises
      const content = JSON.stringify(newDoc.data.body)
      const balises = content.match(/\{\{[A-Z_0-9]+\}\}/g)
      if (balises) {
        const unique = [...new Set(balises)]
        console.log(`📋 ${unique.length} balises trouvées :`)
        unique.forEach(b => console.log(`   ${b}`))
      } else {
        console.log('⚠️ Aucune balise {{...}} trouvée.')
      }
    }
  } catch (err: any) {
    console.error('❌ Erreur:', err.message)
  }
}

diagnose().catch(console.error)
