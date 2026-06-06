import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId diperlukan' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('photobooth_sessions')
          .update({ status: 'ended', updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      } catch (dbErr) {
        console.error('[API] Reset DB error:', dbErr)
      }
    }

    return NextResponse.json({ success: true, message: 'Session reset berhasil' })
  } catch (error) {
    console.error('[API] Reset session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
