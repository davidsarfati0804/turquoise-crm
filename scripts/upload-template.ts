import { google } from 'googleapis';
import * as fs from 'fs';
import { Readable } from 'stream';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const drive = google.drive({ version: 'v3', auth: oauth2 });
  const docs = google.docs({ version: 'v1', auth: oauth2 });

  const filePath = '/tmp/bi_template_v2.docx';
  const fileSize = fs.statSync(filePath).size;
  console.log(`File: ${filePath} (${fileSize} bytes)`);

  // Try method 1: upload as regular .docx first (no conversion)
  console.log('\nMéthode 1: Upload sans conversion...');
  try {
    const res1 = await drive.files.create({
      requestBody: {
        name: 'BI_Template_v2_test_noconvert',
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: fs.createReadStream(filePath),
      },
      fields: 'id,name,mimeType',
    });
    console.log(`   OK! ID: ${res1.data.id}, mimeType: ${res1.data.mimeType}`);
    
    // Now copy and convert to Google Docs
    console.log('   Copie avec conversion en Google Doc...');
    const copy = await drive.files.copy({
      fileId: res1.data.id!,
      requestBody: {
        name: 'BI_Template_v2_sans_textboxes',
        mimeType: 'application/vnd.google-apps.document',
      },
      fields: 'id,name,mimeType',
    });
    console.log(`   OK! Doc ID: ${copy.data.id}, mimeType: ${copy.data.mimeType}`);
    
    // Clean up the .docx version
    await drive.files.delete({ fileId: res1.data.id! });
    console.log('   .docx supprimé');
    
    const newDocId = copy.data.id!;
    console.log(`\n   URL: https://docs.google.com/document/d/${newDocId}/edit`);
    
    // Verify via Google Docs API
    console.log('\nVérification via API Google Docs...');
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
    console.log(`\nBalises via API Google Docs: ${apiBalises.length}`);
    apiBalises.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
    
    const criticals = ['DATE_ARRIVEE', 'DATE_RETOUR', 'MOIS_ANNEE', 'NB_CHAMBRES', 'TYPE_CHAMBRE'];
    let allOk = true;
    for (const b of criticals) {
      const found = allText.includes(`{{${b}}}`);
      console.log(`${found ? '✅' : '❌'} {{${b}}}`);
      if (!found) allOk = false;
    }
    
    const posObj = newDoc.data.positionedObjects;
    console.log(`\nObjets positionnés restants: ${posObj ? Object.keys(posObj).length : 0}`);
    
    if (allOk) {
      console.log(`\n✅ SUCCÈS! Nouveau template ID: ${newDocId}`);
    } else {
      console.log('\n❌ Pas toutes les balises accessibles');
    }
    return;
  } catch (e: any) {
    console.log(`   Erreur: ${e.message}`);
    if (e.response?.data?.error) {
      console.log('   Détails:', JSON.stringify(e.response.data.error, null, 2));
    }
  }

  // Method 2: Use resumable upload with buffer  
  console.log('\nMéthode 2: Upload avec Buffer...');
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);
    
    const res2 = await drive.files.create({
      requestBody: {
        name: 'BI_Template_v2_sans_textboxes',
        mimeType: 'application/vnd.google-apps.document',
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: stream,
      },
      fields: 'id',
    });
    console.log(`   OK! ID: ${res2.data.id}`);
  } catch (e: any) {
    console.log(`   Erreur: ${e.message}`);
    if (e.response?.data?.error) {
      console.log('   Détails:', JSON.stringify(e.response.data.error, null, 2));
    }
  }
}

main().catch(console.error);
