/**
 * Utility functions for handling event_room_pricing table
 * Handles schema compatibility with different column names:
 * - price_per_person (old)
 * - price_per_room (intermediate)
 * - price_per_night (current)
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface PricingRow {
  event_id: string
  room_type_id: string
  price_per_night?: number | null
  price_per_person?: number | null
  price_per_room?: number | null
  [key: string]: any
}

/**
 * Determine the correct price column name in the database
 * Try to detect which column exists: price_per_night, price_per_room, or price_per_person
 */
export async function detectPriceColumnName(
  supabase: SupabaseClient
): Promise<string> {
  // Try fetching with price_per_night first (latest schema)
  const { data: test1 } = await supabase
    .from('event_room_pricing')
    .select('price_per_night')
    .limit(1)

  if (test1 !== null) {
    return 'price_per_night'
  }

  // Try price_per_room (intermediate)
  const { data: test2 } = await supabase
    .from('event_room_pricing')
    .select('price_per_room')
    .limit(1)

  if (test2 !== null) {
    return 'price_per_room'
  }

  // Default to price_per_person (fallback)
  return 'price_per_person'
}

/**
 * Safely upsert pricing rows by normalizing to the correct column name
 */
export async function upsertPricing(
  supabase: SupabaseClient,
  pricingRows: PricingRow[],
  priceColumnName: string
): Promise<{ error: any }> {
  // Normalize all rows to use the correct column name
  const normalizedRows = pricingRows.map(row => {
    // Extract the actual price value from any source column
    const priceValue =
      row.price_per_night ?? row.price_per_room ?? row.price_per_person

    // Build a new row with only the correct column name
    const normalized: any = {
      event_id: row.event_id,
      room_type_id: row.room_type_id,
      is_active: row.is_active !== false,
      [priceColumnName]: priceValue,
    }

    // Note: deposit_amount and max_occupancy are no longer used
    // We only keep: event_id, room_type_id, price_per_* and is_active
    if (row.currency !== undefined) {
      normalized.currency = row.currency
    }
    if (row.label !== undefined) {
      normalized.label = row.label
    }
    if (row.notes !== undefined) {
      normalized.notes = row.notes
    }

    return normalized
  })

  return supabase.from('event_room_pricing').upsert(normalizedRows, {
    onConflict: 'event_id,room_type_id',
  })
}
