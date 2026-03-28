import { google } from 'googleapis';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const docs = google.docs({ version: 'v1', auth: oauth2 });
  const doc = await docs.documents.get({
    documentId: process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!,
  });

  let fullText = '';

  function extractText(elements: any[]) {
    if (!elements) return;
    for (const el of elements) {
      if (el.paragraph) {
        for (const elem of el.paragraph.elements || []) {
          if (elem.textRun) {
            fullText += elem.textRun.content;
          }
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

  extractText(doc.data.body?.content || []);

  console.log('=== TEXTE COMPLET DU TEMPLATE ===');
  console.log(fullText);
  console.log('=== FIN ===\n');

  // Chercher les balises {{...}} dans le texte brut
  const balises = [...new Set(fullText.match(/\{\{[^}]+\}\}/g) || [])];
  balises.sort();
  console.log(`Balises trouvées dans le texte brut: ${balises.length}`);
  balises.forEach((b, i) => console.log(`${i + 1}. ${b}`));

  // Chercher aussi les balises potentiellement cassées - patterns avec { ou } isolés
  console.log('\n=== Recherche de balises potentiellement cassées ===');
  const lines = fullText.split('\n');
  for (const line of lines) {
    // Lignes contenant { ou } mais pas un pattern {{...}} complet
    if ((line.includes('{') || line.includes('}')) && !line.match(/\{\{[A-Z_0-9]+\}\}/)) {
      console.log(`SUSPECTE: "${line.trim()}"`);
    }
  }

  // Chercher aussi les headers/footers
  console.log('\n=== Vérification headers/footers ===');
  const headers = doc.data.headers || {};
  const footers = doc.data.footers || {};

  for (const [id, header] of Object.entries(headers) as any[]) {
    let headerText = '';
    function extractHeaderText(elements: any[]) {
      if (!elements) return;
      for (const el of elements) {
        if (el.paragraph) {
          for (const elem of el.paragraph.elements || []) {
            if (elem.textRun) headerText += elem.textRun.content;
          }
        }
        if (el.table) {
          for (const row of el.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              extractHeaderText(cell.content);
            }
          }
        }
      }
    }
    extractHeaderText(header.content || []);
    if (headerText.trim()) {
      console.log(`Header ${id}: "${headerText.trim()}"`);
      const hBalises = headerText.match(/\{\{[^}]+\}\}/g) || [];
      if (hBalises.length > 0) console.log('  Balises:', hBalises);
    }
  }

  for (const [id, footer] of Object.entries(footers) as any[]) {
    let footerText = '';
    function extractFooterText(elements: any[]) {
      if (!elements) return;
      for (const el of elements) {
        if (el.paragraph) {
          for (const elem of el.paragraph.elements || []) {
            if (elem.textRun) footerText += elem.textRun.content;
          }
        }
        if (el.table) {
          for (const row of el.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              extractFooterText(cell.content);
            }
          }
        }
      }
    }
    extractFooterText((footer as any).content || []);
    if (footerText.trim()) {
      console.log(`Footer ${id}: "${footerText.trim()}"`);
      const fBalises = footerText.match(/\{\{[^}]+\}\}/g) || [];
      if (fBalises.length > 0) console.log('  Balises:', fBalises);
    }
  }

  // Aussi chercher dans les éléments inline/images etc.
  console.log('\n=== Dump de TOUS les textRun du document (body + tables) ===');
  let allRuns: string[] = [];
  function dumpRuns(elements: any[], prefix = '') {
    if (!elements) return;
    for (const el of elements) {
      if (el.paragraph) {
        for (const elem of el.paragraph.elements || []) {
          if (elem.textRun && elem.textRun.content.trim()) {
            allRuns.push(prefix + JSON.stringify(elem.textRun.content));
          }
        }
      }
      if (el.table) {
        for (let ri = 0; ri < (el.table.tableRows || []).length; ri++) {
          const row = el.table.tableRows[ri];
          for (let ci = 0; ci < (row.tableCells || []).length; ci++) {
            const cell = row.tableCells[ci];
            dumpRuns(cell.content, `[table row${ri} col${ci}] `);
          }
        }
      }
    }
  }
  dumpRuns(doc.data.body?.content || []);
  allRuns.forEach(r => console.log(r));
}

main().catch(console.error);
