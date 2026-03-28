/**
 * Test script: Full Yousign signature flow
 * Loads BI from Supabase, generates PDF via Google Docs, sends to Yousign
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY!
const YOUSIGN_BASE_URL = process.env.YOUSIGN_SANDBOX === 'true'
  ? 'https://api-sandbox.yousign.app/v3'
  : 'https://api.yousign.app/v3'

// Target email for the test
const TARGET_EMAIL = 'es@olami.eu'

// BI ID from the test dossier
const BI_ID = process.argv[2] || ''

function sanitizeForYousign(value: string): string {
  if (!value) return 'N-A'
  let clean = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  clean = clean.replace(/<[^>]*>/g, '')
  clean = clean.replace(/[^a-zA-Z\s\-']/g, '')
  clean = clean.replace(/\s+/g, ' ').trim()
  return clean || 'N-A'
}

function formatPhoneE164(phone: string): string | null {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+33' + cleaned.substring(1)
  } else if (cleaned.startsWith('33') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+33' + cleaned
  }
  const prefix = cleaned.startsWith('+') ? '+' : ''
  const digits = cleaned.replace(/\D/g, '')
  cleaned = prefix + digits
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned
  return null
}

async function yousignFetch(p: string, options: RequestInit = {}) {
  const url = `${YOUSIGN_BASE_URL}${p}`
  console.log(`  → ${options.method || 'GET'} ${p}`)
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const errorBody = await res.text()
    console.error(`  ✗ Yousign [${res.status}]:`, errorBody)
    throw new Error(`Yousign ${res.status}: ${errorBody}`)
  }
  const data = await res.json()
  console.log(`  ✓ ${res.status} OK`)
  return data
}

async function main() {
  console.log('=== Test Yousign Full Flow ===\n')
  console.log(`Yousign URL: ${YOUSIGN_BASE_URL}`)
  console.log(`API Key: ${YOUSIGN_API_KEY.substring(0, 8)}...`)
  console.log(`Target email: ${TARGET_EMAIL}\n`)

  // Step 0: Get BI from Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let biId = BI_ID
  if (!biId) {
    console.log('No BI ID provided, finding the latest one...')
    const { data: bis, error } = await supabase
      .from('bulletin_inscriptions')
      .select('id, data')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error || !bis?.length) {
      console.error('No BI found in database:', error?.message)
      process.exit(1)
    }
    biId = bis[0].id
    console.log(`Found BI: ${biId}`)
  }

  const { data: bi, error: biErr } = await supabase
    .from('bulletin_inscriptions')
    .select('*')
    .eq('id', biId)
    .single()

  if (biErr || !bi) {
    console.error('BI not found:', biErr?.message)
    process.exit(1)
  }

  const biData = bi.data as any
  console.log(`BI: ${biData.bi_number || 'N/A'}`)
  console.log(`Client: ${biData.client?.first_name} ${biData.client?.last_name}`)
  console.log(`Email: ${biData.client?.email}`)
  console.log(`Phone: ${biData.client?.phone || 'none'}\n`)

  // Step 1: Generate PDF via Google Docs
  console.log('--- Step 1: Generate PDF ---')
  const { prepareBalisesForGoogleDoc, generateBIFromGoogleDoc } = await import('../lib/services/google-docs.service')
  const balises = prepareBalisesForGoogleDoc(biData)
  const fileLabel = `BI_${biData.file_reference || 'TEST'}_${new Date().toISOString().slice(0, 10)}`
  const { pdfBuffer, docUrl, docId } = await generateBIFromGoogleDoc(balises, fileLabel)
  console.log(`  ✓ PDF generated (${pdfBuffer.length} bytes)`)
  console.log(`  Doc URL: ${docUrl}\n`)

  // Step 2: Create Signature Request
  console.log('--- Step 2: Create Signature Request ---')
  const sr = await yousignFetch('/signature_requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Bulletin Inscription Turquoise`,
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
    }),
  })
  const signatureRequestId = sr.id
  console.log(`  SR ID: ${signatureRequestId}\n`)

  // Step 3: Upload document
  console.log('--- Step 3: Upload Document ---')
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
  formData.append('file', blob, `${fileLabel}.pdf`)
  formData.append('nature', 'signable_document')

  const uploadUrl = `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents`
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${YOUSIGN_API_KEY}` },
    body: formData,
  })
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    console.error(`  ✗ Upload failed [${uploadRes.status}]:`, err)
    process.exit(1)
  }
  const doc = await uploadRes.json()
  const documentId = doc.id
  console.log(`  ✓ Document uploaded: ${documentId}\n`)

  // Step 4: Add signer
  console.log('--- Step 4: Add Signer ---')
  const cleanFirst = sanitizeForYousign(biData.client?.first_name || '')
  const cleanLast = sanitizeForYousign(biData.client?.last_name || '')

  console.log(`  Sanitized: "${cleanFirst}" "${cleanLast}"`)
  console.log(`  Email (overridden): ${TARGET_EMAIL}`)

  const signerBody = {
    info: {
      first_name: cleanFirst,
      last_name: cleanLast,
      email: TARGET_EMAIL,
      locale: 'fr',
    },
    signature_level: 'electronic_signature',
    signature_authentication_mode: 'no_otp',
    fields: [
      {
        document_id: documentId,
        type: 'mention',
        page: 1,
        x: 60,
        y: 740,
        width: 160,
        height: 20,
        mention: 'Lu et approuvé',
      },
      {
        document_id: documentId,
        type: 'mention',
        page: 1,
        x: 310,
        y: 740,
        width: 130,
        height: 20,
        mention: new Date().toLocaleDateString('fr-FR'),
      },
      {
        document_id: documentId,
        type: 'signature',
        page: 1,
        x: 420,
        y: 720,
        width: 150,
        height: 50,
      },
    ],
  }

  console.log('  Signer body:', JSON.stringify(signerBody, null, 2))

  const signer = await yousignFetch(`/signature_requests/${signatureRequestId}/signers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signerBody),
  })
  console.log(`  Signer ID: ${signer.id}`)
  console.log(`  Signature link: ${signer.signature_link}\n`)

  // Step 5: Activate
  console.log('--- Step 5: Activate ---')
  await yousignFetch(`/signature_requests/${signatureRequestId}/activate`, {
    method: 'POST',
  })

  // Update Supabase
  await supabase
    .from('bulletin_inscriptions')
    .update({
      client_signature_status: 'ongoing',
      signature_method: 'electronique',
      yousign_signature_request_id: signatureRequestId,
      yousign_document_id: documentId,
      yousign_signer_url: signer.signature_link,
    })
    .eq('id', biId)

  console.log('\n=== SUCCESS ===')
  console.log(`Signature request: ${signatureRequestId}`)
  console.log(`Signer URL: ${signer.signature_link}`)
  console.log(`\nYousign will send a signing invitation email to: ${TARGET_EMAIL}`)
  console.log('Check your inbox (and spam folder).')
}

main().catch(err => {
  console.error('\n=== FAILED ===')
  console.error(err.message || err)
  process.exit(1)
})
