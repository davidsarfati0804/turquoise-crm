import { google } from 'googleapis';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
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

  // 1. Télécharger
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
  
  fs.writeFileSync('/tmp/document_before.xml', docXml);

  // 3. Find each <mc:AlternateContent> block containing text boxes,
  //    extract paragraph content, replace the parent <w:p>
  console.log('\n3. Traitement des zones de texte...\n');
  
  let processedCount = 0;
  let searchStart = 0;
  
  while (true) {
    const acStart = docXml.indexOf('<mc:AlternateContent>', searchStart);
    if (acStart === -1) break;
    
    const acEnd = docXml.indexOf('</mc:AlternateContent>', acStart);
    if (acEnd === -1) break;
    const acEndFull = acEnd + '</mc:AlternateContent>'.length;
    
    const acBlock = docXml.substring(acStart, acEndFull);
    
    if (!acBlock.includes('wps:txbx')) {
      searchStart = acEndFull;
      continue;
    }
    
    // Extract ALL <w:txbxContent>...</w:txbxContent> blocks
    const txbxContents: string[] = [];
    let txbxSearch = 0;
    while (true) {
      const txStart = acBlock.indexOf('<w:txbxContent>', txbxSearch);
      if (txStart === -1) break;
      const txEnd = acBlock.indexOf('</w:txbxContent>', txStart);
      if (txEnd === -1) break;
      txbxContents.push(acBlock.substring(txStart + '<w:txbxContent>'.length, txEnd));
      txbxSearch = txEnd + '</w:txbxContent>'.length;
    }
    
    // Extract paragraphs from all txbxContent blocks
    let extractedParagraphs = '';
    let extractedText = '';
    
    for (const txContent of txbxContents) {
      // Find all <w:p ...>...</w:p> paragraphs
      let pSearch = 0;
      while (true) {
        const pStart1 = txContent.indexOf('<w:p ', pSearch);
        const pStart2 = txContent.indexOf('<w:p>', pSearch);
        let actualStart = -1;
        if (pStart1 === -1 && pStart2 === -1) break;
        if (pStart1 === -1) actualStart = pStart2;
        else if (pStart2 === -1) actualStart = pStart1;
        else actualStart = Math.min(pStart1, pStart2);
        
        const pEnd = txContent.indexOf('</w:p>', actualStart);
        if (pEnd === -1) break;
        const pEndFull = pEnd + '</w:p>'.length;
        
        const paragraph = txContent.substring(actualStart, pEndFull);
        extractedParagraphs += paragraph;
        
        // Extract text for logging
        const textMatches = paragraph.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        for (const tm of textMatches) {
          extractedText += tm.replace(/<[^>]+>/g, '');
        }
        
        pSearch = pEndFull;
      }
    }
    
    if (!extractedParagraphs) {
      searchStart = acEndFull;
      continue;
    }
    
    // Find parent <w:p> containing this AlternateContent
    let parentPStart = -1;
    let searchBack = acStart - 1;
    while (searchBack >= 0) {
      const p1 = docXml.lastIndexOf('<w:p ', searchBack);
      const p2 = docXml.lastIndexOf('<w:p>', searchBack);
      const candidate = Math.max(p1, p2);
      if (candidate === -1) break;
      
      // Ensure no </w:p> between candidate and acStart
      const closingBetween = docXml.indexOf('</w:p>', candidate);
      if (closingBetween === -1 || closingBetween > acStart) {
        parentPStart = candidate;
        break;
      }
      searchBack = candidate - 1;
    }
    
    let parentPEnd = docXml.indexOf('</w:p>', acEndFull);
    if (parentPEnd !== -1) parentPEnd += '</w:p>'.length;
    
    if (parentPStart !== -1 && parentPEnd !== -1) {
      docXml = docXml.substring(0, parentPStart) + extractedParagraphs + docXml.substring(parentPEnd);
      processedCount++;
      const preview = extractedText.substring(0, 80);
      const balises = extractedText.match(/\{\{[^}]+\}\}/g);
      console.log(`   ✅ Zone #${processedCount}: "${preview}"`);
      if (balises) console.log(`      Balises: ${balises.join(', ')}`);
      searchStart = parentPStart;
    } else {
      docXml = docXml.substring(0, acStart) + extractedParagraphs + docXml.substring(acEndFull);
      processedCount++;
      console.log(`   ✅ Zone #${processedCount} (fallback): "${extractedText.substring(0, 60)}"`);
      searchStart = acStart;
    }
  }
  
  console.log(`\n   Total: ${processedCount} zones de texte converties`);
  fs.writeFileSync('/tmp/document_after.xml', docXml);

  // 4. Rebuild .docx
  console.log('\n4. Reconstruction du .docx...');
  zip.file('word/document.xml', docXml);
  const newBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  
  console.log('   Vérification docxtemplater...');
  try {
    const verifyZip = new PizZip(newBuffer);
    const verifyDoc = new Docxtemplater(verifyZip, {
      paragraphLoop: true, linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter() { return ''; },
    });
    const fullText = verifyDoc.getFullText();
    const balises = [...new Set(fullText.match(/\{\{[^}]+\}\}/g) || [])].sort();
    console.log(`   .docx valide! Balises: ${balises.length}`);
    balises.forEach((b, i) => console.log(`     ${i + 1}. ${b}`));
  } catch (e: any) {
    console.log(`   ⚠️ Erreur: ${e.message}`);
  }

  // 5. Upload
  console.log('\n5. Upload sur Google Drive...');
  const tmpPath = '/tmp/bi_template_v2.docx';
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
  console.log(`   OK - Google Doc ID: ${newDocId}`);
  console.log(`   URL: https://docs.google.com/document/d/${newDocId}/edit`);

  // 6. Vérifier via API Google Docs
  console.log('\n6. Vérification via API Google Docs...');
  const newDoc = await docs.documents.get({ documentId: newDocId });

  let allText = '';
  function extractDocText(elements: any[]) {
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
            extractDocText(cell.content);
          }
        }
      }
    }
  }
  extractDocText(newDoc.data.body?.content || []);

  const apiBalises = [...new Set(allText.match(/\{\{[^}]+\}\}/g) || [])].sort();
  console.log(`\n   Balises via API Google Docs: ${apiBalises.length}`);
  apiBalises.forEach((b, i) => console.log(`   ${i + 1}. ${b}`));

  const criticals = ['DATE_ARRIVEE', 'DATE_RETOUR', 'MOIS_ANNEE', 'NB_CHAMBRES', 'TYPE_CHAMBRE'];
  console.log('\n   Vérification balises critiques:');
  let allOk = true;
  for (const b of criticals) {
    const found = allText.includes(`{{${b}}}`);
    console.log(`   ${found ? '✅' : '❌'} {{${b}}}`);
    if (!found) allOk = false;
  }

  const posObj = newDoc.data.positionedObjects;
  console.log(`\n   Objets positionnés restants: ${posObj ? Object.keys(posObj).length : 0}`);

  console.log('\n=== RÉSULTAT ===');
  if (allOk) {
    console.log(`✅ SUCCÈS! Nouveau template ID: ${newDocId}`);
    console.log(`   Toutes les balises sont accessibles via l'API Google Docs`);
    console.log(`\n   → Met à jour .env.local : GOOGLE_DOCS_BI_TEMPLATE_ID=${newDocId}`);
  } else {
    console.log('❌ Certaines balises ne sont pas accessibles via l\'API');
    console.log('   Le flow docxtemplater sera maintenu comme solution');
  }
}

main().catch(console.error);
