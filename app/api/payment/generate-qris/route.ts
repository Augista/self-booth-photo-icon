import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateQRIS } from '@/lib/qrisGenerator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, amount } = body

    if (!sessionId || !amount) {
      return NextResponse.json(
        { error: 'sessionId dan amount diperlukan' },
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

    const { data: session, error: sessionFetchError } = await supabase
      .from('photobooth_sessions')
      .select('id, status, transaction_id')
      .eq('id', sessionId)
      .single()

      console.log('[QRIS API] session result:', session)
console.log('[QRIS API] session error:', sessionFetchError)

    if (sessionFetchError || !session) {
      return NextResponse.json(
        { error: 'Session tidak ditemukan' },
        { status: 404 }
      )
    }

    // to Prevent duplicate QRIS
    if (session.transaction_id) {
      return NextResponse.json(
        { error: 'QRIS sudah dibuat untuk session ini' },
        { status: 400 }
      )
    }

    // 🔥 Generate transaction ID
    const transactionId = `TXN-${sessionId}-${Date.now()}`

    // 🔥 Generate QRIS
    const qrisString = generateQRIS(
      process.env.QRIS_MERCHANT_NAME || 'PHOTOBOOTH',
      process.env.QRIS_CITY || 'SURABAYA',
      amount,
      transactionId
    )

    // 🔥 Insert payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        session_id: sessionId,
        amount,
        qris_string: qrisString,
        transaction_id: transactionId,
        status: 'pending',
      })

    if (paymentError) {
      console.error('[API] Payment insert error:', paymentError)
      return NextResponse.json(
        { error: 'Gagal membuat payment record' },
        { status: 500 }
      )
    }

    // 🔥 Update session (pakai select untuk ensure kena row)
    const { data: updatedSession, error: sessionError } = await supabase
      .from('photobooth_sessions')
      .update({
        status: 'payment_pending',
        qris_string: qrisString,
        transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (sessionError || !updatedSession) {
      console.error('[API] Session update error:', sessionError)
      return NextResponse.json(
        { error: 'Gagal update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      qrisString,
      transactionId,
      amount,
    })
  } catch (error) {
    console.error('[API] Generate QRIS error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
