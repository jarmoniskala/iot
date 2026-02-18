import type { SupabaseClient } from '@supabase/supabase-js'
import type { HistoryBucket, GapInterval, SummaryStatsRow } from '@/lib/types'

/**
 * Determine optimal bucket size based on time range.
 * Returns bucket width in minutes.
 */
export function getBucketMinutes(rangeHours: number): number {
  if (rangeHours <= 24) return 5
  if (rangeHours <= 168) return 15 // 7 days
  if (rangeHours <= 720) return 60 // 30 days
  return Math.max(5, Math.floor((rangeHours * 60) / 1500))
}

/**
 * Fetch time-bucketed sensor history via the get_sensor_history RPC.
 */
export async function fetchSensorHistory(
  supabase: SupabaseClient,
  from: string,
  to: string,
  bucketMinutes: number
): Promise<HistoryBucket[]> {
  const { data, error } = await supabase.rpc('get_sensor_history', {
    p_from: from,
    p_to: to,
    p_bucket_minutes: bucketMinutes,
  })

  if (error) {
    console.error('fetchSensorHistory error:', error)
    return []
  }

  return (data ?? []) as HistoryBucket[]
}

/**
 * Fetch data gaps via the detect_gaps RPC.
 */
export async function fetchGaps(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<GapInterval[]> {
  const { data, error } = await supabase.rpc('detect_gaps', {
    p_from: from,
    p_to: to,
  })

  if (error) {
    console.error('fetchGaps error:', error)
    return []
  }

  return (data ?? []) as GapInterval[]
}

/**
 * Fetch summary stats via the get_summary_stats RPC.
 */
export async function fetchSummaryStats(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<SummaryStatsRow[]> {
  const { data, error } = await supabase.rpc('get_summary_stats', {
    p_from: from,
    p_to: to,
  })

  if (error) {
    console.error('fetchSummaryStats error:', error)
    return []
  }

  return (data ?? []) as SummaryStatsRow[]
}
