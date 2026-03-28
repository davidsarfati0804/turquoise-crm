/**
 * Test : Copier le template Google Doc et utiliser replaceAllText
 * pour vérifier si les balises dans les zones de texte sont aussi remplacées.
 */
import { google } from 'googleapis'

async function testCopyAndReplace() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const drive = google.drive({ version: 'v3', auth })
  const docs = google.docs({ version: 'v1', auth })

  const TEMPLATE_ID = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!

  console.log('=== TEST COPIE + replaceAllText ===\n')

  // 1. Copier le template
  console.log('1. Copie du template...')
  const copy = await drive.files.copy({
    fileId: TEMPLATE_ID,
    requestBody: {
      name: 'TEST_BI_COPY_REPLACE',
    },
  })
  const copyId = copy.data.id!
  console.log(`   OK - Copie: ${copyId}`)
  console.log(`   URL: https://docs.google.com/document/d/${copyId}/edit`)

  // 2. Balises de test
  const balises: Record<string, string> = {
    DATE_EMISSION: '25 mars 2026',
    NUMERO_DOSSIER: 'TEST-COPIE-001',
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
    // Balises DANS les zones de texte (le vrai test)
    DATE_ARRIVEE: '15 avril 2026',
    NB_NUITS: '7',
    DATE_RETOUR: '22 avril 2026',
    MOIS_ANNEE: 'avril 2026',
    NB_CHAMBRES: '2',
    TYPE_CHAMBRE: 'Suite Junior Vue Mer',
    // Balise dans le body mais bas de page
    TOTAL_EUROS: '12 500',
  }

  // 3. Construire les requêtes replaceAllText
  console.log('\n2. Remplacement via replaceAllText...')
  const requests = Object.entries(balises).map(([key, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${key}}}`,
        matchCase: true,
      },
      replaceText: value,
    },
  }))

  const result = await docs.documents.batchUpdate({
    documentId: copyId,
    requestBody: { requests },
  })

  // Compter les remplacements
  const replies = result.data.replies || []
  let totalReplaced = 0
  let bodyReplaced: string[] = []
  let textBoxReplaced: string[] = []
  let notFound: string[] = []

  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i]
    const key = Object.keys(balises)[i]
    const count = reply.replaceAllText?.occurrencesChanged || 0
    totalReplaced += count
    if (count > 0) {
      // Les balises qu'on sait être dans des zones de texte
      const textBoxBalises = ['DATE_ARRIVEE', 'NB_NUITS', 'DATE_RETOUR', 'MOIS_ANNEE', 'NB_CHAMBRES', 'TYPE_CHAMBRE']
      if (textBoxBalises.includes(key)) {
        textBoxReplaced.push(key)
        console.log(`   ✅ {{${key}}} → "${balises[key]}" (${count} occurrence(s)) [ZONE DE TEXTE]`)
      } else {
        bodyReplaced.push(key)
        console.log(`   ✅ {{${key}}} → "${balises[key]}" (${count} occurrence(s))`)
      }
    } else {
      notFound.push(key)
      console.log(`   ❌ {{${key}}} → NON TROUVÉ`)
    }
  }

  console.log(`\n   Total remplacements: ${totalReplaced}`)
  console.log(`   Body: ${bodyReplaced.length} balises remplacées`)
  console.log(`   Zones de texte: ${textBoxReplaced.length}/6 balises remplacées`)
  if (notFound.length) console.log(`   Non trouvées: ${notFound.join(', ')}`)

  // 4. Export PDF
  console.log('\n3. Export en PDF...')
  const pdfRes = await drive.files.export(
    { fileId: copyId, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  )
  const pdfSize = Buffer.from(pdfRes.data as ArrayBuffer).length
  console.log(`   OK - PDF: ${pdfSize} bytes (${Math.round(pdfSize / 1024)} Ko)`)

  // Sauvegarder le PDF pour inspection
  const fs = await import('fs')
  fs.writeFileSync('/tmp/test_bi_copy_replace.pdf', Buffer.from(pdfRes.data as ArrayBuffer))
  console.log('   PDF sauvegardé: /tmp/test_bi_copy_replace.pdf')

  // 5. Vérifier visuellement - lire le doc pour voir le contenu
  console.log('\n4. Lecture du document copié pour vérification...')
  const docContent = await docs.documents.get({ documentId: copyId })
  const body = docContent.data.body
  const allText: string[] = []
  
  function extractText(elements: any[]) {
    for (const el of elements) {
      if (el.paragraph) {
        for (const run of el.paragraph.elements || []) {
          if (run.textRun?.content) allText.push(run.textRun.content)
        }
      }
      if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            extractText(cell.content || [])
          }
        }
      }
    }
  }
  
  if (body?.content) extractText(body.content)
  const fullText = allText.join('')

  // Vérifier les balises du body
  console.log('\n   Vérification dans le body lu par API:')
  for (const [key, value] of Object.entries(balises)) {
    if (value && fullText.includes(value)) {
      console.log(`   ✅ "${value}" trouvé dans le body`)
    } else if (value && !fullText.includes(value)) {
      console.log(`   ⚠️  "${value}" NON trouvé dans le body (possiblement dans zone de texte)`)
    }
  }

  // Vérifier s'il reste des balises {{...}}
  const remaining = fullText.match(/\{\{[A-Z_]+\}\}/g)
  if (remaining) {
    console.log(`\n   ⚠️  Balises restantes dans le body: ${remaining.join(', ')}`)
  } else {
    console.log('\n   ✅ Aucune balise restante dans le body')
  }

  // 6. Ne pas nettoyer pour inspection visuelle
  console.log(`\n=== RÉSULTAT ===`)
  if (textBoxReplaced.length === 6) {
    console.log('✅ replaceAllText FONCTIONNE DANS LES ZONES DE TEXTE !')
    console.log('   → On peut utiliser copie + replaceAllText pour TOUT remplacer')
    console.log('   → Plus besoin de docxtemplater, formatage préservé à 100%')
  } else {
    console.log(`⚠️  replaceAllText a remplacé ${textBoxReplaced.length}/6 balises de zones de texte`)
    console.log('   → Approche hybride nécessaire')
  }
  
  console.log(`\n   Vérifiez le résultat: https://docs.google.com/document/d/${copyId}/edit`)
  console.log(`   PDF: /tmp/test_bi_copy_replace.pdf`)
  
  // Cleanup
  console.log('\n5. Nettoyage...')
  await drive.files.delete({ fileId: copyId })
  console.log('   Doc supprimé')
}

testCopyAndReplace().catch(e => console.error('ERREUR:', e))
