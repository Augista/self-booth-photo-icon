import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    const { data, error } = await supabase
      .from('photobooth_sessions')
      .insert({
        id: sessionId,
        status: 'waiting',
      })
      .select()
      .single()

    if (error) {
      console.error('[SESSION CREATE ERROR]', error)

      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessionId: data.id,
      createdAt: data.created_at,
      status: data.status,
    })
  } catch (err) {
    console.error('[API] Unexpected error:', err)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}