import { google } from 'googleapis';
import PizZip from 'pizzip';
import * as fs from 'fs';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const drive = google.drive({ version: 'v3', auth: oauth2 });
  const docs = google.docs({ version: 'v1', auth: oauth2 });
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!;

  console.log('=== MIGRATION DU TEMPLATE : SUPPRESSION DES ZONES DE TEXTE ===\n');

  // 1. Télécharger le template en .docx
  console.log('1. Téléchargement du template .docx...');
  const response = await drive.files.export(
    { fileId: templateId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(response.data as ArrayBuffer);
  console.log(`   OK - ${buffer.length} bytes`);

  // 2. Parser le XML
  console.log('\n2. Extraction du XML...');
  const zip = new PizZip(buffer);
  let docXml = zip.file('word/document.xml')!.asText();

  // 3. Pour chaque <mc:AlternateContent> qui contient un text box :
  //    - Extraire les paragraphes <w:p> du <wps:txbx>
  //    - Remplacer le bloc AlternateContent entier par ces paragraphes
  console.log('\n3. Extraction du contenu des zones de texte...');

  const altContentRegex = /<mc:AlternateContent>([\s\S]*?)<\/mc:AlternateContent>/g;
  let replacements: Array<{ original: string; replacement: string; description: string }> = [];

  let match;
  while ((match = altContentRegex.exec(docXml)) !== null) {
    const fullBlock = match[0];
    const content = match[1];

    // Vérifier si c'est un text box
    if (!content.includes('wps:txbx')) continue;

    // Extraire le contenu du text box : les <w:p> à l'intérieur de <wps:txbx><w:txbxContent>...</w:txbxContent></wps:txbx>
    const txbxContentMatch = content.match(/<wps:txbx><w:txbxContent>([\s\S]*?)<\/w:txbxContent><\/wps:txbx>/);
    if (!txbxContentMatch) continue;

    const txbxContent = txbxContentMatch[1];

    // Extraire le texte pour le log
    const textParts: string[] = [];
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(txbxContent)) !== null) {
      textParts.push(textMatch[1]);
    }
    const textPreview = textParts.join('').substring(0, 80);

    // Le remplacement : on prend les <w:p> du text box
    // Mais on doit les envelopper dans un paragraphe si le AlternateContent est lui-même dans un <w:p>
    // En fait, les AlternateContent sont typiquement dans un <w:r> dans un <w:p>
    // On va extraire les paragraphes et les mettre directement dans le body
    const paragraphs = txbxContent.match(/<w:p[^/][\s\S]*?<\/w:p>/g) || [];

    if (paragraphs.length > 0) {
      replacements.push({
        original: fullBlock,
        replacement: paragraphs.join(''),
        description: textPreview || '(vide)',
      });
    } else {
      // Pas de paragraphes, on supprime juste le bloc
      replacements.push({
        original: fullBlock,
        replacement: '',
        description: '(zone de texte vide)',
      });
    }
  }

  console.log(`   ${replacements.length} zones de texte à convertir:`);
  replacements.forEach((r, i) => {
    console.log(`   ${i + 1}. "${r.description}"`);
  });

  // 4. Appliquer les remplacements
  console.log('\n4. Application des remplacements...');
  
  // IMPORTANT : On ne peut pas simplement remplacer le AlternateContent par les paragraphes
  // car le AlternateContent est DANS un <w:r> qui est DANS un <w:p>
  // On doit remplacer le <w:p> parent qui contient le AlternateContent
  
  // Approche : pour chaque AlternateContent, trouver le <w:p> parent et le remplacer
  // par les paragraphes extraits du text box
  for (const r of replacements) {
    // Trouver le paragraphe parent qui contient ce AlternateContent
    // Le pattern est : <w:p ...>...<mc:AlternateContent>...</mc:AlternateContent>...</w:p>
    const escapedOriginal = r.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parentPRegex = new RegExp(`<w:p[\\s][^>]*>[\\s\\S]*?${escapedOriginal.substring(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?<\\/w:p>`);
    
    // Simpler approach: just replace the AlternateContent block itself
    // The parent <w:p> might contain only this, or other content too
    // Safest: replace the entire AlternateContent with nothing, and insert the paragraphs after
    const idx = docXml.indexOf(r.original);
    if (idx === -1) {
      console.log(`   ⚠️ Bloc non trouvé: "${r.description}"`);
      continue;
    }
    
    // Find the parent <w:p> tag
    // Look backwards from idx for the nearest <w:p 
    let pStart = docXml.lastIndexOf('<w:p ', idx);
    // Also check for <w:p> (without attributes)
    const pStartNoAttr = docXml.lastIndexOf('<w:p>', idx);
    if (pStartNoAttr > pStart) pStart = pStartNoAttr;
    
    // Find the closing </w:p> after the AlternateContent
    const afterAlt = idx + r.original.length;
    let pEnd = docXml.indexOf('</w:p>', afterAlt);
    if (pEnd !== -1) pEnd += '</w:p>'.length;
    
    if (pStart !== -1 && pEnd !== -1) {
      const parentP = docXml.substring(pStart, pEnd);
      // Replace the parent <w:p> with the extracted paragraphs
      docXml = docXml.substring(0, pStart) + r.replacement + docXml.substring(pEnd);
      console.log(`   ✅ Remplacé: "${r.description}"`);
    } else {
      // Fallback: just replace the AlternateContent with paragraphs
      docXml = docXml.replace(r.original, r.replacement);
      console.log(`   ✅ Remplacé (fallback): "${r.description}"`);
    }
  }

  // 5. Sauvegarder le XML modifié dans le zip
  console.log('\n5. Reconstruction du .docx...');
  zip.file('word/document.xml', docXml);
  const newBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  console.log(`   OK - ${newBuffer.length} bytes`);

  // 6. Upload sur Google Drive comme nouveau document
  console.log('\n6. Upload du nouveau template sur Google Drive...');
  const tmpPath = '/tmp/bi_template_fixed.docx';
  fs.writeFileSync(tmpPath, newBuffer);
  const uploadResponse = await drive.files.create({
    requestBody: {
      name: 'BI_Template_v2_sans_textboxes',
      mimeType: 'application/vnd.google-apps.document',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: fs.createReadStream(tmpPath),
    },
    fields: 'id',
  });
  const newDocId = uploadResponse.data.id!;
  console.log(`   OK - Nouveau Google Doc ID: ${newDocId}`);
  console.log(`   URL: https://docs.google.com/document/d/${newDocId}/edit`);

  // 7. Vérifier via l'API Google Docs que toutes les balises sont maintenant accessibles
  console.log('\n7. Vérification via API Google Docs...');
  const newDoc = await docs.documents.get({ documentId: newDocId });

  let allText = '';
  function extractText(elements: any[]) {
    if (!elements) return;
    for (const el of elements) {
      if (el.paragraph) {
        for (const elem of el.paragraph.elements || []) {
          if (elem.textRun) allText += elem.textRun.content;
        }
      }
      if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            extractText(cell.content);
          }
        }
      }
    }
  }
  extractText(newDoc.data.body?.content || []);

  const balises = [...new Set(allText.match(/\{\{[^}]+\}\}/g) || [])].sort();
  console.log(`\n   Balises accessibles via API Google Docs: ${balises.length}`);
  balises.forEach((b, i) => console.log(`   ${i + 1}. ${b}`));

  // Vérifier spécifiquement les balises qui étaient dans les text boxes
  const criticalBalises = ['DATE_ARRIVEE', 'DATE_RETOUR', 'MOIS_ANNEE', 'NB_CHAMBRES', 'TYPE_CHAMBRE'];
  console.log('\n   Vérification des balises critiques (ex-text boxes):');
  let allCriticalOk = true;
  for (const b of criticalBalises) {
    const found = allText.includes(`{{${b}}}`);
    console.log(`   ${found ? '✅' : '❌'} {{${b}}}`);
    if (!found) allCriticalOk = false;
  }

  // Vérif positioned objects (devrait être 0 ou moins)
  const posObjects = newDoc.data.positionedObjects;
  const posCount = posObjects ? Object.keys(posObjects).length : 0;
  console.log(`\n   Objets positionnés restants: ${posCount}`);

  console.log('\n=== RÉSULTAT ===');
  if (allCriticalOk && balises.length >= 19) {
    console.log('✅ SUCCÈS ! Toutes les balises sont maintenant accessibles via l\'API Google Docs');
    console.log(`   Nouveau template ID: ${newDocId}`);
    console.log('   → Mets à jour GOOGLE_DOCS_BI_TEMPLATE_ID dans .env.local');
  } else if (allCriticalOk) {
    console.log(`⚠️ PARTIEL - Les balises critiques sont OK mais seulement ${balises.length}/19 balises trouvées`);
    console.log(`   Nouveau template ID: ${newDocId}`);
  } else {
    console.log('❌ ÉCHEC - Certaines balises critiques ne sont pas accessibles');
    console.log('   Le template docxtemplater reste la meilleure option');
  }
}

main().catch(console.error);
