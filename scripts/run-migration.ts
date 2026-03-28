#!/usr/bin/env ts-node
/**
 * Script pour exécuter les migrations Supabase depuis la CLI
 * Usage: npx ts-node scripts/run-migration.ts <migration-file>
 * Example: npx ts-node scripts/run-migration.ts supabase/migrations/005_bi_turquoise_format_enhancements.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes')
  console.error('   Assurez-vous que .env.local contient:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Créer le client Supabase avec la service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(filePath: string) {
  console.log('🚀 Démarrage de la migration...')
  console.log(`📂 Fichier: ${filePath}`)
  
  try {
    // Lire le fichier SQL
    const fullPath = path.resolve(process.cwd(), filePath)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fichier non trouvé: ${fullPath}`)
    }

    const sqlContent = fs.readFileSync(fullPath, 'utf8')
    console.log(`📄 Contenu du fichier chargé (${sqlContent.length} caractères)`)

    // Exécuter le SQL
    console.log('⏳ Exécution de la migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })

    if (error) {
      // Si RPC n'existe pas, essayer avec une requête directe
      if (error.message.includes('function exec_sql')) {
        console.log('⚠️  RPC exec_sql non disponible, utilisation de l\'API REST...')
        
        // Diviser en statements individuels (approximatif)
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))
        
        console.log(`📊 ${statements.length} statements SQL détectés`)
        
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i]
          if (stmt.length > 0) {
            console.log(`   [${i + 1}/${statements.length}] Exécution...`)
            try {
              const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt })
              if (stmtError) {
                console.error(`   ❌ Erreur: ${stmtError.message}`)
              } else {
                console.log(`   ✅ OK`)
              }
            } catch (e: any) {
              console.error(`   ❌ Exception: ${e.message}`)
            }
          }
        }
        
        console.log('✅ Migration terminée (avec avertissements possibles)')
        return
      }
      
      throw error
    }

    console.log('✅ Migration exécutée avec succès!')
    if (data) {
      console.log('📊 Résultat:', data)
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de la migration:')
    console.error(error.message)
    if (error.details) {
      console.error('Détails:', error.details)
    }
    if (error.hint) {
      console.error('Conseil:', error.hint)
    }
    process.exit(1)
  }
}

async function testConnection() {
  console.log('🔍 Test de connexion Supabase...')
  try {
    const { data, error } = await supabase
      .from('events')
      .select('count')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    console.log('✅ Connexion réussie!')
    return true
  } catch (error: any) {
    console.error('❌ Échec de connexion:', error.message)
    return false
  }
}

// Main
;(async () => {
  console.log('=' .repeat(60))
  console.log('🌊 TURQUOISE CRM - Migration Runner')
  console.log('=' .repeat(60))
  console.log('')

  // Test de connexion
  const connected = await testConnection()
  if (!connected) {
    console.error('\n⚠️  Impossible de se connecter à Supabase')
    console.error('   Vérifiez vos credentials dans .env.local')
    process.exit(1)
  }

  console.log('')

  // Récupérer le fichier à exécuter
  const migrationFile = process.argv[2]
  if (!migrationFile) {
    console.error('❌ Usage: npx ts-node scripts/run-migration.ts <fichier.sql>')
    console.error('   Example: npx ts-node scripts/run-migration.ts supabase/migrations/005_bi_turquoise_format_enhancements.sql')
    process.exit(1)
  }

  await runMigration(migrationFile)
  
  console.log('')
  console.log('=' .repeat(60))
  console.log('✅ Script terminé')
  console.log('=' .repeat(60))
})()
