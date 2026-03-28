import { google } from 'googleapis';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const docs = google.docs({ version: 'v1', auth: oauth2 });
  
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!;
  console.log(`Template ID: ${templateId}`);
  
  const doc = await docs.documents.get({ documentId: templateId });
  console.log(`Titre du document: "${doc.data.title}"`);

  // Dump EVERY single textRun with its exact content (no trimming)
  let runIndex = 0;
  let allText = '';

  function dumpAllRuns(elements: any[], location: string) {
    if (!elements) return;
    for (const el of elements) {
      if (el.paragraph) {
        for (const elem of el.paragraph.elements || []) {
          if (elem.textRun) {
            const content = elem.textRun.content;
            allText += content;
            runIndex++;
            // Show ALL runs, not just trimmed ones
            const display = content.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
            console.log(`RUN #${runIndex} [${location}]: "${display}"`);
          }
        }
      }
      if (el.table) {
        for (let ri = 0; ri < (el.table.tableRows || []).length; ri++) {
          const row = el.table.tableRows[ri];
          for (let ci = 0; ci < (row.tableCells || []).length; ci++) {
            const cell = row.tableCells[ci];
            dumpAllRuns(cell.content, `table r${ri}c${ci}`);
          }
        }
      }
    }
  }

  console.log('\n=== BODY RUNS ===');
  dumpAllRuns(doc.data.body?.content || [], 'body');

  // Headers
  if (doc.data.headers) {
    for (const [id, header] of Object.entries(doc.data.headers) as any[]) {
      console.log(`\n=== HEADER ${id} ===`);
      dumpAllRuns(header.content || [], `header-${id}`);
    }
  }

  // Footers
  if (doc.data.footers) {
    for (const [id, footer] of Object.entries(doc.data.footers) as any[]) {
      console.log(`\n=== FOOTER ${id} ===`);
      dumpAllRuns((footer as any).content || [], `footer-${id}`);
    }
  }

  // Now search for DATE_ARRIVEE specifically - even across run boundaries
  console.log('\n=== RECHERCHE SPECIFIQUE ===');
  
  // Search in concatenated text
  if (allText.includes('DATE_ARRIVEE')) {
    console.log('TROUVÉ: DATE_ARRIVEE dans le texte concaténé');
    const idx = allText.indexOf('DATE_ARRIVEE');
    console.log(`Contexte: "...${allText.substring(Math.max(0, idx-20), idx+30)}..."`);
  } else {
    console.log('PAS TROUVÉ: DATE_ARRIVEE dans le texte concaténé');
  }
  
  // Search for partial matches
  if (allText.includes('ARRIVEE')) {
    console.log('TROUVÉ: ARRIVEE quelque part');
  } else {
    console.log('PAS TROUVÉ: ARRIVEE nulle part dans le document');
  }

  if (allText.includes('DATE_')) {
    const matches = allText.match(/DATE_\w+/g) || [];
    console.log('Patterns DATE_*:', matches);
  }

  // Final balise count
  const balises = [...new Set(allText.match(/\{\{[^}]+\}\}/g) || [])].sort();
  console.log(`\nTotal balises: ${balises.length}`);
  balises.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
}

main().catch(console.error);
