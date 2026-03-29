#!/usr/bin/env node
/**
 * Test d'envoi WhatsApp via Meta Cloud API
 * Usage: node scripts/test-whatsapp-send.js <numéro>
 * Exemple: node scripts/test-whatsapp-send.js 33612345678
 */

require('dotenv').config({ path: '.env.local' })

const TOKEN = process.env.WHATSAPP_API_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const TO = process.argv[2]

if (!TOKEN || !PHONE_NUMBER_ID) {
  console.error('❌ Variables manquantes: WHATSAPP_API_TOKEN ou WHATSAPP_PHONE_NUMBER_ID')
  process.exit(1)
}

if (!TO) {
  console.error('❌ Numéro destinataire manquant. Usage: node scripts/test-whatsapp-send.js 33612345678')
  process.exit(1)
}

async function sendTestMessage() {
  console.log(`📱 Envoi d'un message test à ${TO}...`)
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`)
  
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`
  
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: TO,
    type: 'text',
    text: {
      preview_url: false,
      body: '✅ Test Turquoise CRM — connexion WhatsApp Business réussie ! 🌊'
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Message envoyé avec succès!')
      console.log('   Message ID:', data.messages?.[0]?.id)
    } else {
      console.error('❌ Erreur API Meta:')
      console.error('   Code:', data.error?.code)
      console.error('   Message:', data.error?.message)
      console.error('   Détails:', data.error?.error_data?.details)
    }
  } catch (err) {
    console.error('❌ Erreur réseau:', err.message)
  }
}

sendTestMessage()
