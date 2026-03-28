import { google } from 'googleapis';
import * as fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const drive = google.drive({ version: 'v3', auth: oauth2 });

  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!;
  console.log(`Template ID: ${templateId}`);

  // Télécharger le template en format .docx
  console.log('\n1. Téléchargement du template en .docx...');
  const response = await drive.files.export({
    fileId: templateId,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }, { responseType: 'arraybuffer' });

  const buffer = Buffer.from(response.data as ArrayBuffer);
  const tmpPath = '/tmp/bi_template_scan.docx';
  fs.writeFileSync(tmpPath, buffer);
  console.log(`   Taille: ${buffer.length} bytes`);

  // Charger avec PizZip pour inspecter le XML brut
  console.log('\n2. Analyse du contenu XML brut du .docx...');
  const zip = new PizZip(buffer);
  
  // Lister tous les fichiers dans le .docx (c'est un ZIP)
  const fileNames = Object.keys(zip.files);
  console.log(`   Fichiers dans le .docx: ${fileNames.length}`);
  fileNames.forEach(f => console.log(`     - ${f}`));

  // Scanner CHAQUE fichier XML pour les balises {{...}}
  console.log('\n3. Recherche de balises dans TOUS les fichiers XML...');
  const allBalises = new Set<string>();
  
  for (const fileName of fileNames) {
    if (zip.files[fileName].dir) continue;
    try {
      const content = zip.file(fileName)?.asText();
      if (!content) continue;
      
      // Chercher les balises dans le XML brut
      const matches = content.match(/\{\{[^}]+\}\}/g);
      if (matches) {
        console.log(`\n   === ${fileName} ===`);
        for (const m of matches) {
          allBalises.add(m);
          console.log(`     ${m}`);
        }
      }
      
      // Aussi chercher les balises qui pourraient être coupées par des tags XML
      // Ex: {{DATE_<w:r>ARRIVEE}} -> on cherche le texte entre les tags
      const textOnly = content.replace(/<[^>]+>/g, '');
      const cleanMatches = textOnly.match(/\{\{[^}]+\}\}/g);
      if (cleanMatches) {
        for (const m of cleanMatches) {
          if (!allBalises.has(m)) {
            console.log(`     [TROUVÉ APRÈS NETTOYAGE XML] ${m}`);
            allBalises.add(m);
          }
        }
      }
    } catch (e) {
      // Fichier binaire, ignorer
    }
  }

  // Utiliser docxtemplater pour parser les tags
  console.log('\n4. Analyse avec docxtemplater...');
  try {
    const doc = new Docxtemplater(new PizZip(buffer), {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });
    
    // getFullText retourne tout le texte du document
    const fullText = doc.getFullText();
    console.log('\n   Texte complet via docxtemplater:');
    console.log(fullText);
    
    const docBalises = fullText.match(/\{\{[^}]+\}\}/g) || [];
    for (const b of docBalises) {
      allBalises.add(b);
    }
  } catch (e: any) {
    console.log(`   Erreur docxtemplater: ${e.message}`);
    // Si erreur de template, on peut quand même récupérer les infos
    if (e.properties && e.properties.errors) {
      for (const err of e.properties.errors) {
        console.log(`   Tag trouvé dans erreur: ${JSON.stringify(err)}`);
      }
    }
  }

  // Résumé final
  console.log('\n=== TOUTES LES BALISES TROUVÉES ===');
  const sorted = [...allBalises].sort();
  console.log(`Total: ${sorted.length}`);
  sorted.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
}

main().catch(console.error);
