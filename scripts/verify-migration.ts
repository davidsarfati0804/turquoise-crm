#!/usr/bin/env ts-node
/**
 * Script pour vérifier que la migration 005 a été correctement appliquée
 * Usage: npx ts-node scripts/verify-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyMigration() {
  console.log('🔍 Vérification de la migration 005...\n')

  let hasErrors = false

  try {
    // Test 1: Vérifier que company_settings existe
    console.log('📊 Test 1: Table company_settings')
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, siret')
        .limit(1)
        .single()

      if (error) throw error

      if (data && data.company_name === 'Club Turquoise') {
        console.log('   ✅ Table existe et contient les données Turquoise')
        console.log(`      Company: ${data.company_name}`)
        console.log(`      SIRET: ${data.siret}`)
      } else {
        console.log('   ⚠️  Table existe mais données manquantes')
        hasErrors = true
      }
    } catch (error: any) {
      console.log('   ❌ Table non trouvée ou erreur:', error.message)
      hasErrors = true
    }

    // Test 2: Vérifier les nouvelles colonnes dans events
    console.log('\n📊 Test 2: Nouvelles colonnes dans events')
    try {
      const { data, error } = await supabase
        .from('events')
        .select('arrival_date, departure_date, check_in_time, pension_type')
        .limit(1)

      if (error) {
        // Vérifier si c'est une erreur de colonne manquante
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('   ❌ Colonnes manquantes - migration non appliquée')
          hasErrors = true
        } else {
          throw error
        }
      } else {
        console.log('   ✅ Colonnes arrival_date, departure_date, check_in_time, pension_type présentes')
      }
    } catch (error: any) {
      console.log('   ❌ Erreur:', error.message)
      hasErrors = true
    }

    // Test 3: Vérifier les anciennes colonnes supprimées
    console.log('\n📊 Test 3: Anciennes colonnes supprimées')
    try {
      const { data, error } = await supabase
        .from('events')
        .select('description')
        .limit(1)

      if (error) {
        if (error.message.includes('column "description" does not exist')) {
          console.log('   ✅ Colonne "description" correctement supprimée')
        } else {
          console.log('   ⚠️  Erreur inattendue:', error.message)
        }
      } else {
        console.log('   ⚠️  Colonne "description" existe encore (devrait être supprimée)')
        hasErrors = true
      }
    } catch (error: any) {
      console.log('   ❌ Erreur:', error.message)
    }

    // Test 4: Vérifier event_room_pricing
    console.log('\n📊 Test 4: Colonne price_per_room dans event_room_pricing')
    try {
      const { data, error } = await supabase
        .from('event_room_pricing')
        .select('price_per_room')
        .limit(1)

      if (error) {
        if (error.message.includes('column "price_per_room" does not exist')) {
          console.log('   ❌ Colonne "price_per_room" manquante')
          console.log('      (devrait être renommée depuis "price_per_person")')
          hasErrors = true
        } else {
          throw error
        }
      } else {
        console.log('   ✅ Colonne "price_per_room" présente')
      }
    } catch (error: any) {
      console.log('   ❌ Erreur:', error.message)
      hasErrors = true
    }

    // Test 5: Vérifier client_files nouvelles colonnes
    console.log('\n📊 Test 5: Nouvelles colonnes dans client_files')
    try {
      const { data, error } = await supabase
        .from('client_files')
        .select('insurance_included, cancellation_policy, deposit_percentage')
        .limit(1)

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('   ❌ Colonnes manquantes - migration non appliquée')
          hasErrors = true
        } else {
          throw error
        }
      } else {
        console.log('   ✅ Colonnes insurance_included, cancellation_policy, deposit_percentage présentes')
      }
    } catch (error: any) {
      console.log('   ❌ Erreur:', error.message)
      hasErrors = true
    }

    console.log('\n' + '='.repeat(60))
    if (hasErrors) {
      console.log('❌ Migration incomplète ou non appliquée')
      console.log('\nPour appliquer la migration, suivez le GUIDE_MIGRATION.md')
      console.log('Ou exécutez directement dans Supabase Dashboard SQL Editor:')
      console.log('  → Copiez le contenu de supabase/migrations/005_bi_turquoise_format_enhancements.sql')
      console.log('  → Collez dans SQL Editor')
      console.log('  → Cliquez sur "Run"')
    } else {
      console.log('✅ Migration 005 correctement appliquée!')
      console.log('\nVous pouvez maintenant :')
      console.log('  1. Démarrer le serveur: npm run dev')
      console.log('  2. Tester la création d\'événements avec les nouveaux champs')
      console.log('  3. Générer des BIs avec le format Turquoise Club')
    }
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message)
    process.exit(1)
  }
}

;(async () => {
  console.log('='.repeat(60))
  console.log('🌊 TURQUOISE CRM - Vérification Migration 005')
  console.log('='.repeat(60))
  console.log('')

  await verifyMigration()
})()
