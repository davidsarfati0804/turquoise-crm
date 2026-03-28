import { google } from 'googleapis';
import PizZip from 'pizzip';

async function analyze() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.export({
    fileId: process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }, { responseType: 'arraybuffer' });

  const zip = new PizZip(Buffer.from(res.data as ArrayBuffer));
  const xml = zip.file('word/document.xml')!.asText();

  function extractText(xmlFragment: string): string {
    const parts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    while ((m = regex.exec(xmlFragment)) !== null) {
      parts.push(m[1]);
    }
    return parts.join('');
  }

  // Find ALL text boxes
  console.log('=== TOUTES LES ZONES DE TEXTE ===\n');
  const altRegex = /<mc:AlternateContent[\s\S]*?<\/mc:AlternateContent>/g;
  let altMatch;
  let tbIdx = 0;
  while ((altMatch = altRegex.exec(xml)) !== null) {
    tbIdx++;
    const content = altMatch[0];
    const text = extractText(content);
    
    // Get position
    const hPosMatch = content.match(/<wp:positionH[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/);
    const vPosMatch = content.match(/<wp:positionV[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)<\/wp:posOffset>/);
    const hPos = hPosMatch ? (parseInt(hPosMatch[1]) / 914400).toFixed(2) : '?';
    const vPos = vPosMatch ? (parseInt(vPosMatch[1]) / 914400).toFixed(2) : '?';
    
    // Get size
    const cxMatch = content.match(/<wp:extent cx="(\d+)"/);
    const cyMatch = content.match(/cy="(\d+)"/);
    const width = cxMatch ? (parseInt(cxMatch[1]) / 914400).toFixed(2) : '?';
    const height = cyMatch ? (parseInt(cyMatch[1]) / 914400).toFixed(2) : '?';
    
    console.log(`Zone ${tbIdx}: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log(`  Position: H=${hPos}cm, V=${vPos}cm`);
    console.log(`  Taille: ${width}cm x ${height}cm`);
    console.log(`  Position XML: caractère ${altMatch.index}`);
    console.log();
  }

  // Now check the body text order around Assurance 
  console.log('=== TEXTE BODY (hors zones de texte) - SECTION HÉBERGEMENT À CONDITIONS ===\n');
  
  // Remove all mc:AlternateContent blocks to get body text only
  const bodyXml = xml.replace(/<mc:AlternateContent[\s\S]*?<\/mc:AlternateContent>/g, '[ZONE_TEXTE]');
  
  // Find paragraphs
  const paraRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pMatch;
  let pNum = 0;
  const relevantStart = bodyXml.indexOf('bergement');
  const relevantEnd = bodyXml.indexOf('Conditions d');
  
  if (relevantStart > -1 && relevantEnd > -1) {
    const relevantSection = bodyXml.substring(relevantStart - 500, relevantEnd + 500);
    while ((pMatch = paraRegex.exec(relevantSection)) !== null) {
      pNum++;
      const text = extractText(pMatch[0]);
      const hasTextBox = pMatch[0].includes('[ZONE_TEXTE]');
      if (text.trim() || hasTextBox) {
        console.log(`  P${pNum}: "${text.trim().substring(0, 120)}"${hasTextBox ? ' [contient une zone de texte]' : ''}`);
      }
    }
  }

  // Specifically look for the Assurance section
  console.log('\n=== CONTENU EXACT AUTOUR DE "Assurance" ===');
  const assIdx = xml.indexOf('Assurance');
  if (assIdx > -1) {
    // Check if Assurance is inside a text box
    const before = xml.substring(Math.max(0, assIdx - 5000), assIdx);
    const lastAltOpen = before.lastIndexOf('<mc:AlternateContent');
    const lastAltClose = before.lastIndexOf('</mc:AlternateContent>');
    const isInTextBox = lastAltOpen > lastAltClose;
    console.log(`"Assurance" est ${isInTextBox ? 'DANS' : 'HORS'} une zone de texte`);
    
    // Get the full paragraph containing Assurance
    const paraStart = xml.lastIndexOf('<w:p ', assIdx);
    const paraEnd = xml.indexOf('</w:p>', assIdx);
    if (paraStart > -1 && paraEnd > -1) {
      const assurancePara = xml.substring(paraStart, paraEnd + 6);
      console.log(`Texte du paragraphe: "${extractText(assurancePara)}"`);
    }
  }
  
  // Check Acceptée
  console.log('\n=== CONTENU DE "Acceptée par le client" ===');
  const accIdx = xml.indexOf('Accept');
  if (accIdx > -1) {
    const before = xml.substring(Math.max(0, accIdx - 5000), accIdx);
    const lastAltOpen = before.lastIndexOf('<mc:AlternateContent');
    const lastAltClose = before.lastIndexOf('</mc:AlternateContent>');
    const isInTextBox = lastAltOpen > lastAltClose;
    console.log(`"Acceptée" est ${isInTextBox ? 'DANS' : 'HORS'} une zone de texte`);
    
    const paraStart = xml.lastIndexOf('<w:p ', accIdx);
    const paraEnd = xml.indexOf('</w:p>', accIdx);
    if (paraStart > -1 && paraEnd > -1) {
      console.log(`Texte: "${extractText(xml.substring(paraStart, paraEnd + 6))}"`);
    }
  }
  
  // Check Refusée
  console.log('\n=== CONTENU DE "Refusée par le client" ===');
  const refIdx = xml.indexOf('Refus');
  if (refIdx > -1) {
    const before = xml.substring(Math.max(0, refIdx - 5000), refIdx);
    const lastAltOpen = before.lastIndexOf('<mc:AlternateContent');
    const lastAltClose = before.lastIndexOf('</mc:AlternateContent>');
    const isInTextBox = lastAltOpen > lastAltClose;
    console.log(`"Refusée" est ${isInTextBox ? 'DANS' : 'HORS'} une zone de texte`);
    
    const paraStart = xml.lastIndexOf('<w:p ', refIdx);
    const paraEnd = xml.indexOf('</w:p>', refIdx);
    if (paraStart > -1 && paraEnd > -1) {
      console.log(`Texte: "${extractText(xml.substring(paraStart, paraEnd + 6))}"`);
    }
  }

  // Check "Check in"
  console.log('\n=== CONTENU DE "Check in" ===');
  const ciIdx = xml.indexOf('Check in');
  if (ciIdx > -1) {
    const before = xml.substring(Math.max(0, ciIdx - 5000), ciIdx);
    const lastAltOpen = before.lastIndexOf('<mc:AlternateContent');
    const lastAltClose = before.lastIndexOf('</mc:AlternateContent>');
    const isInTextBox = lastAltOpen > lastAltClose;
    console.log(`"Check in" est ${isInTextBox ? 'DANS' : 'HORS'} une zone de texte`);
  }
}

analyze().catch(e => console.error(e));
