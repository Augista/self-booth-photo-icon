import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions untuk database
export interface PhotoboothSession {
  id: string
  created_at: string
  layout: string | null
  status: 'waiting' | 'layout_selected' | 'payment_pending' | 'payment_verified' | 'ready_capture' | 'capturing' | 'photo_ready' | 'processing' | 'completed' | 'error'
  qris_string: string | null
  transaction_id: string | null
  payment_verified: boolean
  photo_path: string | null
  camera_trigger_count: number
  updated_at: string
}

export interface PaymentRecord {
  id: string
  session_id: string
  amount: number
  qris_string: string | null
  transaction_id: string | null
  status: 'pending' | 'verified' | 'failed'
  verified_at: string | null
  created_at: string
}

export interface PhotoResult {
  id: string
  session_id: string
  layout: string
  photo_url: string
  created_at: string
}
