import { google } from 'googleapis';
import PizZip from 'pizzip';

async function analyze() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth });

  // Download as docx
  const res = await drive.files.export({
    fileId: process.env.GOOGLE_DOCS_BI_TEMPLATE_ID!,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }, { responseType: 'arraybuffer' });

  const zip = new PizZip(Buffer.from(res.data as ArrayBuffer));
  const xml = zip.file('word/document.xml')!.asText();

  // Find key sections
  const sections = [
    'TYPE_CHAMBRE', 'Check in', 'Check out', 'Pension', 'Assurance',
    'Non incluse', 'Accept', 'Refus', 'Annulation', 'compl'
  ];

  console.log('=== POSITIONS CLÉS DANS LE XML ===');
  for (const s of sections) {
    const idx = xml.indexOf(s);
    console.log(`  ${s}: position ${idx}`);
  }

  // Extract the full section from TYPE_CHAMBRE to after Refusée
  const startKeyword = 'TYPE_CHAMBRE';
  const endKeyword = 'multirisque';
  
  let startIdx = xml.indexOf(startKeyword);
  let endIdx = xml.lastIndexOf(endKeyword);
  
  if (startIdx === -1 || endIdx === -1) {
    console.log('Keywords not found, trying broader search');
    startIdx = xml.indexOf('Pension');
    endIdx = xml.indexOf('Conditions');
  }
  
  // Go back to find the enclosing paragraph
  const searchStart = Math.max(0, startIdx - 3000);
  const searchEnd = Math.min(xml.length, endIdx + 3000);
  const section = xml.substring(searchStart, searchEnd);
  
  // Show raw XML structure (abbreviated)
  console.log('\n=== STRUCTURE XML BRUTE (section Hébergement → Assurance) ===');
  console.log('Longueur section:', section.length, 'caractères');
  
  // Extract paragraphs with their text content
  const paraRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let match;
  let paraNum = 0;
  
  console.log('\n=== PARAGRAPHES DANS LA SECTION ===');
  while ((match = paraRegex.exec(section)) !== null) {
    paraNum++;
    const para = match[0];
    
    // Extract text from paragraph
    const textParts: string[] = [];
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(para)) !== null) {
      textParts.push(textMatch[1]);
    }
    const text = textParts.join('');
    
    if (text.trim()) {
      // Check if this paragraph is inside a text box (mc:AlternateContent or v:textbox)
      const isInTextBox = para.includes('mc:AlternateContent') || 
                          para.includes('v:textbox') ||
                          para.includes('wps:txbx');
      
      console.log(`\n  P${paraNum}: "${text.substring(0, 120)}${text.length > 120 ? '...' : ''}"`);
      if (isInTextBox) console.log(`         [DANS ZONE DE TEXTE]`);
    }
  }

  // Check for text boxes specifically
  console.log('\n=== ZONES DE TEXTE (mc:AlternateContent) ===');
  const altContentRegex = /<mc:AlternateContent[\s\S]*?<\/mc:AlternateContent>/g;
  let altMatch;
  let tbNum = 0;
  while ((altMatch = altContentRegex.exec(section)) !== null) {
    tbNum++;
    const altContent = altMatch[0];
    const textParts: string[] = [];
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(altContent)) !== null) {
      textParts.push(textMatch[1]);
    }
    const text = textParts.join('');
    console.log(`\n  Zone de texte ${tbNum}: "${text.substring(0, 200)}"`);
    
    // Check positioning
    const posOffsetRegex = /<wp:posOffset>([\d-]+)<\/wp:posOffset>/g;
    let posMatch;
    const positions: string[] = [];
    while ((posMatch = posOffsetRegex.exec(altContent)) !== null) {
      positions.push(posMatch[1]);
    }
    if (positions.length > 0) {
      console.log(`    Positions (EMU): ${positions.join(', ')}`);
      console.log(`    Positions (cm): ${positions.map(p => (parseInt(p) / 914400).toFixed(2)).join(', ')}`);
    }

    // Check anchor type
    const isInline = altContent.includes('<wp:inline');
    const isAnchor = altContent.includes('<wp:anchor');
    console.log(`    Type: ${isInline ? 'inline' : isAnchor ? 'anchor (flottant)' : 'inconnu'}`);
  }

  // Show the full text flow 
  console.log('\n=== FLUX TEXTE COMPLET (section pertinente) ===');
  const allText: string[] = [];
  const fullTextRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let ft;
  while ((ft = fullTextRegex.exec(section)) !== null) {
    allText.push(ft[1]);
  }
  const fullText = allText.join('');
  
  // Find and display around Assurance
  const assIdx = fullText.indexOf('Assurance');
  if (assIdx > -1) {
    const contextStart = Math.max(0, assIdx - 200);
    const contextEnd = Math.min(fullText.length, assIdx + 400);
    console.log(fullText.substring(contextStart, contextEnd));
  }
}

analyze().catch(e => console.error(e));
