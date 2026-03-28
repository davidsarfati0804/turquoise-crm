import { google } from 'googleapis';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { Readable } from 'stream';
import * as fs from 'fs';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const drive = google.drive({ version: 'v3', auth: oauth2 });
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!;

  console.log('=== TEST DOCXTEMPLATER FLOW ===\n');

  // 1. Télécharger le template en .docx
  console.log('1. Téléchargement du template en .docx...');
  const templateResponse = await drive.files.export(
    { fileId: templateId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' }
  );
  const templateBuffer = Buffer.from(templateResponse.data as ArrayBuffer);
  console.log(`   OK - ${templateBuffer.length} bytes`);

  // 2. Remplacer les balises avec docxtemplater
  console.log('\n2. Remplacement des balises avec docxtemplater...');
  const testBalises = {
    DATE_EMISSION: '24 mars 2026',
    NUMERO_DOSSIER: 'TEST-2026-001',
    VOYAGEUR_1: 'Jean Dupont (15 janvier 1980)',
    VOYAGEUR_2: 'Marie Dupont (22 mars 1982)',
    VOYAGEUR_3: 'Lucas Dupont (10 juin 2015)',
    VOYAGEUR_4: '',
    VOYAGEUR_5: '',
    VOYAGEUR_6: '',
    VOYAGEUR_7: '',
    CLIENT_NOM: 'Jean Dupont',
    CLIENT_PAYS: 'FRANCE',
    CLIENT_TEL: '+33 6 12 34 56 78',
    DATE_ARRIVEE: '15 avril 2026',
    NB_NUITS: '7',
    DATE_RETOUR: '22 avril 2026',
    MOIS_ANNEE: 'avril 2026',
    NB_CHAMBRES: '1',
    TYPE_CHAMBRE: 'Suite Junior Vue Mer',
    TOTAL_EUROS: '12 500',
  };

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter() { return ''; },
  });

  doc.render(testBalises);
  const filledBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  console.log(`   OK - Document rempli: ${filledBuffer.length} bytes`);

  // Vérifier que les balises ont bien été remplacées
  console.log('\n   Vérification du remplacement...');
  const verifyZip = new PizZip(filledBuffer);
  const verifyDoc = new Docxtemplater(verifyZip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter() { return ''; },
  });
  const verifyText = verifyDoc.getFullText();
  
  // Vérifier que les valeurs sont présentes
  const checks = [
    { label: 'DATE_EMISSION', expected: '24 mars 2026' },
    { label: 'NUMERO_DOSSIER', expected: 'TEST-2026-001' },
    { label: 'CLIENT_NOM', expected: 'Jean Dupont' },
    { label: 'DATE_ARRIVEE', expected: '15 avril 2026' },
    { label: 'DATE_RETOUR', expected: '22 avril 2026' },
    { label: 'MOIS_ANNEE', expected: 'avril 2026' },
    { label: 'NB_CHAMBRES', expected: '1' },
    { label: 'TYPE_CHAMBRE', expected: 'Suite Junior Vue Mer' },
    { label: 'TOTAL_EUROS', expected: '12 500' },
  ];

  let allOk = true;
  for (const { label, expected } of checks) {
    const found = verifyText.includes(expected);
    console.log(`   ${found ? '✅' : '❌'} ${label}: "${expected}" ${found ? 'trouvé' : 'ABSENT'}`);
    if (!found) allOk = false;
  }

  // Vérifier qu'il ne reste plus de balises non remplacées
  const remainingBalises = verifyText.match(/\{\{[^}]+\}\}/g);
  if (remainingBalises) {
    console.log(`   ⚠️  Balises restantes non remplacées: ${remainingBalises.join(', ')}`);
  } else {
    console.log('   ✅ Aucune balise restante');
  }

  // 3. Upload sur Google Drive
  console.log('\n3. Upload du .docx rempli sur Google Drive...');
  const stream = Readable.from(filledBuffer);
  const uploadResponse = await drive.files.create({
    requestBody: {
      name: 'TEST_BI_docxtemplater',
      mimeType: 'application/vnd.google-apps.document',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: stream,
    },
    fields: 'id',
  });
  const newDocId = uploadResponse.data.id!;
  console.log(`   OK - Google Doc ID: ${newDocId}`);
  console.log(`   URL: https://docs.google.com/document/d/${newDocId}/edit`);

  // 4. Export PDF
  console.log('\n4. Export en PDF...');
  const pdfResponse = await drive.files.export(
    { fileId: newDocId, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  );
  const pdfBuffer = Buffer.from(pdfResponse.data as ArrayBuffer);
  console.log(`   OK - PDF: ${pdfBuffer.length} bytes (${Math.round(pdfBuffer.length / 1024)} Ko)`);

  // Sauvegarder le PDF localement pour vérification visuelle
  fs.writeFileSync('/tmp/test_bi_docxtemplater.pdf', pdfBuffer);
  console.log('   PDF sauvegardé: /tmp/test_bi_docxtemplater.pdf');

  // 5. Cleanup - supprimer le doc de test
  console.log('\n5. Nettoyage...');
  await drive.files.delete({ fileId: newDocId });
  console.log('   Doc de test supprimé');

  console.log('\n=== RÉSULTAT ===');
  if (allOk) {
    console.log('✅ TOUS LES TESTS PASSENT - docxtemplater remplace correctement toutes les balises');
    console.log('   y compris celles dans les zones de texte (DATE_ARRIVEE, DATE_RETOUR, etc.)');
  } else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ - vérifier les résultats ci-dessus');
  }
}

main().catch(console.error);
