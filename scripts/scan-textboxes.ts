import { google } from 'googleapis';

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const docs = google.docs({ version: 'v1', auth: oauth2 });
  
  const templateId = process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!;
  const doc = await docs.documents.get({ documentId: templateId });
  
  console.log(`Titre: "${doc.data.title}"`);

  // Helper: extract text from structural elements
  function extractTextFromElements(elements: any[], location: string): string {
    let text = '';
    if (!elements) return text;
    for (const el of elements) {
      if (el.paragraph) {
        for (const elem of el.paragraph.elements || []) {
          if (elem.textRun) {
            const content = elem.textRun.content;
            text += content;
            const display = content.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
            console.log(`  [${location}] textRun: "${display}"`);
          }
        }
      }
      if (el.table) {
        for (let ri = 0; ri < (el.table.tableRows || []).length; ri++) {
          const row = el.table.tableRows[ri];
          for (let ci = 0; ci < (row.tableCells || []).length; ci++) {
            const cell = row.tableCells[ci];
            text += extractTextFromElements(cell.content, `${location} > table r${ri}c${ci}`);
          }
        }
      }
    }
    return text;
  }

  let allDocText = '';

  // 1. Body
  console.log('\n=== BODY ===');
  allDocText += extractTextFromElements(doc.data.body?.content || [], 'body');

  // 2. Headers
  if (doc.data.headers) {
    for (const [id, header] of Object.entries(doc.data.headers) as any[]) {
      console.log(`\n=== HEADER: ${id} ===`);
      allDocText += extractTextFromElements(header.content || [], `header-${id}`);
    }
  }

  // 3. Footers
  if (doc.data.footers) {
    for (const [id, footer] of Object.entries(doc.data.footers) as any[]) {
      console.log(`\n=== FOOTER: ${id} ===`);
      allDocText += extractTextFromElements((footer as any).content || [], `footer-${id}`);
    }
  }

  // 4. POSITIONED OBJECTS (text boxes!)
  console.log('\n=== POSITIONED OBJECTS (ZONES DE TEXTE) ===');
  const positionedObjects = doc.data.positionedObjects;
  if (positionedObjects && Object.keys(positionedObjects).length > 0) {
    for (const [objId, obj] of Object.entries(positionedObjects) as any[]) {
      console.log(`\nObjet positionné: ${objId}`);
      const posObj = obj.positionedObjectProperties;
      if (posObj?.embeddedObject?.embeddedDrawingProperties) {
        console.log('  Type: embeddedDrawing (dessin/zone de texte)');
      }
      if (posObj?.embeddedObject?.linkedContentReference) {
        console.log('  Type: linked content');
      }
      // Try to get text content from embedded object
      const embedded = posObj?.embeddedObject;
      if (embedded) {
        console.log('  Embedded object keys:', Object.keys(embedded));
        console.log('  Full embedded object:', JSON.stringify(embedded, null, 2));
      }
    }
  } else {
    console.log('Aucun objet positionné trouvé.');
  }

  // 5. INLINE OBJECTS
  console.log('\n=== INLINE OBJECTS ===');
  const inlineObjects = doc.data.inlineObjects;
  if (inlineObjects && Object.keys(inlineObjects).length > 0) {
    for (const [objId, obj] of Object.entries(inlineObjects) as any[]) {
      console.log(`\nObjet inline: ${objId}`);
      const inObj = (obj as any).inlineObjectProperties;
      if (inObj?.embeddedObject) {
        console.log('  Embedded object keys:', Object.keys(inObj.embeddedObject));
        console.log('  Full:', JSON.stringify(inObj.embeddedObject, null, 2));
      }
    }
  } else {
    console.log('Aucun objet inline trouvé.');
  }

  // 6. NAMED RANGES (sometimes used for bookmarks/fields)
  console.log('\n=== NAMED RANGES ===');
  const namedRanges = doc.data.namedRanges;
  if (namedRanges && Object.keys(namedRanges).length > 0) {
    for (const [name, range] of Object.entries(namedRanges) as any[]) {
      console.log(`  Range: "${name}" ->`, JSON.stringify(range));
    }
  } else {
    console.log('Aucun named range.');
  }

  // 7. Dump TOUTES les clés de premier niveau du document
  console.log('\n=== CLÉS DU DOCUMENT ===');
  console.log(Object.keys(doc.data));

  // 8. Recherche globale
  console.log('\n=== RECHERCHE GLOBALE ===');
  const fullJson = JSON.stringify(doc.data);
  
  // Chercher DATE_ARRIVEE ou tout pattern {{...}}
  const allBalisesInJson = [...new Set(fullJson.match(/\{\{[^}]+\}\}/g) || [])].sort();
  console.log(`Balises trouvées dans le JSON complet du document: ${allBalisesInJson.length}`);
  allBalisesInJson.forEach((b, i) => console.log(`  ${i+1}. ${b}`));

  // Chercher ARRIVEE partout 
  if (fullJson.includes('ARRIVEE')) {
    console.log('\nTROUVÉ: "ARRIVEE" dans le JSON complet du document!');
    const idx = fullJson.indexOf('ARRIVEE');
    console.log(`Contexte: ...${fullJson.substring(Math.max(0,idx-80), idx+40)}...`);
  } else {
    console.log('\n"ARRIVEE" absent du JSON complet du document.');
  }

  // Chercher aussi des variantes mal écrites
  const variants = ['ARIVEE', 'ARRIVÉ', 'ARRIVE', 'ARIVE', 'DATE_A', 'DATE_D', 'DEPART', 'DESTINATION', 'HOTEL', 'SEJOUR'];
  for (const v of variants) {
    if (fullJson.toUpperCase().includes(v)) {
      const idx = fullJson.toUpperCase().indexOf(v);
      const context = fullJson.substring(Math.max(0,idx-30), idx+40);
      console.log(`TROUVÉ "${v}": ...${context}...`);
    }
  }
}

main().catch(console.error);
