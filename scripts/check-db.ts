#!/usr/bin/env ts-node
/**
 * Script pour vérifier l'état de la base de données Supabase
 * Usage: npx ts-node scripts/check-db.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkDatabase() {
  console.log('🔍 Vérification de la structure de la base de données...\n')

  try {
    // Vérifier la table events
    console.log('📊 Table EVENTS:')
    console.log('   Colonnes à vérifier après migration 005:')
    console.log('   ❌ description (devrait être supprimée)')
    console.log('   ❌ hotel_name (devrait être supprimée)')
    console.log('   ✅ arrival_date (nouvelle)')
    console.log('   ✅ departure_date (nouvelle)')
    console.log('   ✅ check_in_time (nouvelle)')
    console.log('   ✅ pension_type (nouvelle)')

    if (false) {
      console.log('   Colonnes clés à vérifier:')
      console.log('   - description (devrait être supprimée)')
      console.log('   - hotel_name (devrait être supprimée)')
      console.log('   - arrival_date (nouvelle)')
      console.log('   - departure_date (nouvelle)')
      console.log('   - check_in_time (nouvelle)')
      console.log('   - pension_type (nouvelle)')
    }

    console.log('\n📊 Table EVENT_ROOM_PRICING:')
    console.log('   Colonnes clés à vérifier:')
    console.log('   - price_per_room (renommée depuis price_per_person)')
    console.log('   - deposit_amount (devrait être supprimée)')

    console.log('\n📊 Table CLIENT_FILES:')
    console.log('   Nouvelles colonnes à vérifier:')
    console.log('   - insurance_included')
    console.log('   - cancellation_policy (JSONB)')
    console.log('   - deposit_percentage')
    console.log('   - payment_methods (JSONB)')
    console.log('   - included_services (TEXT[])')

    console.log('\n📊 Table COMPANY_SETTINGS:')
    console.log('   Cette table devrait exister avec:')
    console.log('   - company_name = "Club Turquoise"')
    console.log('   - siret = "882 208 374 00018"')

    // Test simple de connexion
    console.log('\n🔗 Test de connexion...')
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    console.log(`✅ Connexion réussie! (${count} événements dans la base)`)

  } catch (error: any) {
    console.error('\n❌ Erreur:', error.message)
    process.exit(1)
  }
}

;(async () => {
  console.log('=' .repeat(60))
  console.log('🌊 TURQUOISE CRM - Database Checker')
  console.log('=' .repeat(60))
  console.log('')

  await checkDatabase()

  console.log('\n' + '=' .repeat(60))
  console.log('Pour exécuter la migration 005:')
  console.log('npx ts-node scripts/run-migration.ts supabase/migrations/005_bi_turquoise_format_enhancements.sql')
  console.log('=' .repeat(60))
})()
