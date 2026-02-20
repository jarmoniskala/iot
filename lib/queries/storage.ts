import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableSize } from '@/lib/types'

/**
 * Fetch the current database size in MB via the get_database_size_mb RPC.
 * Returns the numeric value or null on error.
 */
export async function fetchDatabaseSize(
  supabase: SupabaseClient
): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_database_size_mb')

  if (error) {
    console.error('fetchDatabaseSize error:', error)
    return null
  }

  return data as number | null
}

/**
 * Fetch per-table size breakdown via the get_table_sizes RPC.
 * Returns the array of TableSize rows or an empty array on error.
 */
export async function fetchTableSizes(
  supabase: SupabaseClient
): Promise<TableSize[]> {
  const { data, error } = await supabase.rpc('get_table_sizes')

  if (error) {
    console.error('fetchTableSizes error:', error)
    return []
  }

  return (data ?? []) as TableSize[]
}
