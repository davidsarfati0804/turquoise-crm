/**
 * Script pour obtenir un Google OAuth2 Refresh Token.
 *
 * Prérequis :
 * 1. Créer un OAuth Client ID (type "Application de bureau") dans Google Cloud Console
 * 2. Récupérer le Client ID et Client Secret
 *
 * Usage :
 *   npx tsx scripts/get-google-refresh-token.ts CLIENT_ID CLIENT_SECRET
 *
 * Le script va :
 * 1. Ouvrir un navigateur pour t'authentifier avec ton compte Google
 * 2. Afficher le refresh_token à copier dans .env.local
 */

import http from 'http'
import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
]

const PORT = 3333
const REDIRECT_URI = `http://localhost:${PORT}/callback`

async function main() {
  const clientId = process.argv[2]
  const clientSecret = process.argv[3]

  if (!clientId || !clientSecret) {
    console.error('\n❌ Usage: npx tsx scripts/get-google-refresh-token.ts CLIENT_ID CLIENT_SECRET\n')
    process.exit(1)
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force le refresh_token à être retourné
  })

  console.log('\n🔐 Ouvre cette URL dans ton navigateur :\n')
  console.log(authUrl)
  console.log('\n⏳ En attente de l\'authentification...\n')

  // Serveur temporaire pour capturer le code d'auth
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`)

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code')

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>❌ Pas de code reçu</h1>')
        server.close()
        return
      }

      try {
        const { tokens } = await oauth2Client.getToken(code)

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>✅ Authentification réussie ! Tu peux fermer cet onglet.</h1>')

        console.log('✅ Authentification réussie !\n')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('Ajoute ces lignes dans ton .env.local :')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        console.log(`GOOGLE_CLIENT_ID=${clientId}`)
        console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`)
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
        console.log('')
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>❌ Erreur lors de l\'échange du token</h1>')
        console.error('Erreur:', err)
      }

      server.close()
    }
  })

  server.listen(PORT, () => {
    // Try to open the URL in the browser
    const { exec } = require('child_process')
    exec(`open "${authUrl}"`)
  })
}

main()
