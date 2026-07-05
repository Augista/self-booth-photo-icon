// app/api/payment/verify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, transactionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId diperlukan' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 🔥 Update payment record if transactionId is provided
    if (transactionId) {
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId)

      if (paymentError) {
        console.error('[API] Payment update error:', paymentError)
        return NextResponse.json(
          { error: 'Gagal update payment' },
          { status: 500 }
        )
      }
    }

    // 🔥 Update session → lanjut ke camera
    const { error: sessionError } = await supabase
      .from('photobooth_sessions')
      .update({
        status: 'ready_capture', // 🔥 FINAL STATE
        payment_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (sessionError) {
      console.error('[API] Session update error:', sessionError)
      return NextResponse.json(
        { error: 'Gagal update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status: 'ready_capture',
    })
  } catch (error) {
    console.error('[API] Verify payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}