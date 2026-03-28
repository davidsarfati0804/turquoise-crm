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
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!;

  console.log('=== ANALYSE DES ZONES DE TEXTE ===\n');

  // 1. Télécharger le template en .docx
  console.log('1. Téléchargement du template...');
  const response = await drive.files.export(
    { fileId: templateId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(response.data as ArrayBuffer);

  // 2. Extraire le XML du document
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('document.xml not found');

  // Sauvegarder pour analyse
  fs.writeFileSync('/tmp/document.xml', docXml);
  console.log('   XML sauvegardé: /tmp/document.xml');
  console.log(`   Taille XML: ${docXml.length} chars`);

  // 3. Trouver les zones de texte (text boxes)
  // Elles sont dans <mc:AlternateContent> ou <w:drawing> contenant <wps:txbx>
  
  // Compter les text boxes
  const txbxMatches = docXml.match(/<wps:txbx>/g);
  console.log(`\n   Zones de texte (wps:txbx): ${txbxMatches?.length || 0}`);

  // Trouver le contenu des text boxes
  const txbxRegex = /<wps:txbx>([\s\S]*?)<\/wps:txbx>/g;
  let match;
  let boxIndex = 0;
  while ((match = txbxRegex.exec(docXml)) !== null) {
    boxIndex++;
    const boxContent = match[1];
    
    // Extraire le texte visible
    const textParts: string[] = [];
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(boxContent)) !== null) {
      textParts.push(textMatch[1]);
    }
    
    console.log(`\n   === Zone de texte #${boxIndex} ===`);
    console.log(`   Texte: "${textParts.join('')}"`);
    console.log(`   Contient des balises: ${textParts.join('').match(/\{\{[^}]+\}\}/g)?.join(', ') || 'non'}`);
    
    // Sauvegarder le XML de chaque text box
    fs.writeFileSync(`/tmp/textbox_${boxIndex}.xml`, boxContent);
    console.log(`   XML sauvegardé: /tmp/textbox_${boxIndex}.xml`);
  }

  // 4. Chercher aussi les <mc:AlternateContent> qui contiennent les text boxes
  const altContentRegex = /<mc:AlternateContent>([\s\S]*?)<\/mc:AlternateContent>/g;
  let altMatch;
  let altIndex = 0;
  console.log('\n\n   === AlternateContent blocks ===');
  while ((altMatch = altContentRegex.exec(docXml)) !== null) {
    altIndex++;
    const content = altMatch[1];
    const hasTextBox = content.includes('wps:txbx');
    console.log(`   Block #${altIndex}: ${hasTextBox ? 'CONTIENT text box' : 'pas de text box'} (${content.length} chars)`);
  }

  // 5. Analyser la structure pour la reconstruction
  console.log('\n\n   === Structure du document ===');
  // Compter les éléments principaux
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (bodyMatch) {
    const body = bodyMatch[1];
    const paragraphs = body.match(/<w:p[ >]/g);
    const tables = body.match(/<w:tbl>/g);
    console.log(`   Paragraphes: ${paragraphs?.length || 0}`);
    console.log(`   Tables: ${tables?.length || 0}`);
  }
}

main().catch(console.error);
