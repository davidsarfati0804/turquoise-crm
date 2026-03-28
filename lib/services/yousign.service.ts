/**
 * Yousign Electronic Signature Service (V3 API)
 * 
 * Correct V3 flow:
 * 1. Create a Signature Request (POST /signature_requests)
 * 2. Upload document to the SR (POST /signature_requests/{id}/documents) — multipart
 * 3. Add signer with fields (POST /signature_requests/{id}/signers)
 * 4. Activate the SR (POST /signature_requests/{id}/activate)
 * 5. Webhook notifies us when signed
 * 6. Download the signed PDF
 */

const YOUSIGN_BASE_URL = process.env.YOUSIGN_SANDBOX === 'true'
  ? 'https://api-sandbox.yousign.app/v3'
  : 'https://api.yousign.app/v3'

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY || ''

/**
 * Sanitize a string for Yousign "Safe String" format
 * Removes: HTML tags, URLs, emails, leading/trailing whitespace, special chars
 * Yousign only accepts: letters (ASCII), spaces, hyphens, apostrophes
 */
function sanitizeForYousign(value: string): string {
  if (!value) return 'N/A'
  
  // Normalize unicode accents to ASCII equivalents
  let clean = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  // Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, '')
  
  // Remove anything that's not a letter, space, hyphen, or apostrophe
  clean = clean.replace(/[^a-zA-Z\s\-']/g, '')
  
  // Trim and collapse multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim()
  
  return clean || 'N/A'
}

/**
 * Format a phone number to E.164 (required by Yousign)
 * Returns null if the phone can't be formatted properly
 */
function formatPhoneE164(phone: string): string | null {
  if (!phone) return null
  
  // Remove everything except digits and leading +
  let cleaned = phone.replace(/[\s\-().]/g, '')
  
  // Handle French numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+33' + cleaned.substring(1)
  } else if (cleaned.startsWith('33') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+33' + cleaned
  }
  
  // Remove any remaining non-digit chars after the +
  const prefix = cleaned.startsWith('+') ? '+' : ''
  const digits = cleaned.replace(/\D/g, '')
  cleaned = prefix + digits
  
  // Validate E.164: + followed by 7-15 digits
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned
  }
  
  return null
}

/**
 * Helper for JSON API calls to Yousign
 */
async function yousignFetch(path: string, options: RequestInit = {}) {
  const url = `${YOUSIGN_BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error(`Yousign API error [${res.status}] ${path}:`, errorBody)
    throw new Error(`Yousign API error ${res.status}: ${errorBody}`)
  }

  return res.json()
}

/**
 * Full signature flow with Yousign V3 API
 * 
 * 1. Create Signature Request
 * 2. Upload document (multipart) into the SR
 * 3. Add signer with signature field
 * 4. Activate
 */
export async function createSignatureRequest(params: {
  pdfBuffer: Buffer
  fileName: string
  signerFirstName: string
  signerLastName: string
  signerEmail: string
  signerPhone: string
  biNumber: string
}): Promise<{
  signatureRequestId: string
  documentId: string
  signerUrl: string
}> {
  // Step 1: Create signature request (draft)
  const signatureRequest = await yousignFetch('/signature_requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Bulletin Inscription Turquoise`,
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
    }),
  })

  const signatureRequestId = signatureRequest.id
  console.log(`Yousign: SR created ${signatureRequestId}`)

  // Step 2: Upload document to the signature request (multipart/form-data)
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(params.pdfBuffer)], { type: 'application/pdf' })
  formData.append('file', blob, params.fileName)
  formData.append('nature', 'signable_document')

  const uploadUrl = `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents`
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
    },
    body: formData,
  })

  if (!uploadRes.ok) {
    const errorBody = await uploadRes.text()
    console.error(`Yousign upload error [${uploadRes.status}]:`, errorBody)
    throw new Error(`Yousign upload error ${uploadRes.status}: ${errorBody}`)
  }

  const document = await uploadRes.json()
  const documentId = document.id
  console.log(`Yousign: Document uploaded ${documentId}`)

  // Step 3: Add signer with signature field
  const cleanFirstName = sanitizeForYousign(params.signerFirstName)
  const cleanLastName = sanitizeForYousign(params.signerLastName)

  console.log(`Yousign: Adding signer - firstName: "${cleanFirstName}", lastName: "${cleanLastName}", email: "${params.signerEmail}"`)

  const signerBody: Record<string, unknown> = {
    info: {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      email: params.signerEmail,
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

  const signer = await yousignFetch(`/signature_requests/${signatureRequestId}/signers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signerBody),
  })

  console.log(`Yousign: Signer added ${signer.id}`)

  // Step 4: Activate the signature request
  await yousignFetch(`/signature_requests/${signatureRequestId}/activate`, {
    method: 'POST',
  })

  console.log(`Yousign: SR activated`)

  return {
    signatureRequestId,
    documentId,
    signerUrl: signer.signature_link,
  }
}

/**
 * Get the status of a signature request
 */
export async function getSignatureRequestStatus(signatureRequestId: string): Promise<{
  status: string
  signers: Array<{ status: string; signed_at?: string }>
}> {
  return yousignFetch(`/signature_requests/${signatureRequestId}`)
}

/**
 * Download the signed document
 */
export async function downloadSignedDocument(signatureRequestId: string, documentId: string): Promise<Buffer> {
  const url = `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents/${documentId}/download`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Yousign download error ${res.status}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}


