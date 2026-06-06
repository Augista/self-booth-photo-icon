import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params
    const { layout } = await request.json()

    if (!layout) {
      return NextResponse.json(
        { error: 'Layout tidak boleh kosong' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase env missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    const { data, error } = await supabase
      .from('photobooth_sessions')
      .update({
        layout,
        status: 'layout_selected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[SET LAYOUT ERROR]', error)

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          error: 'Session tidak ditemukan',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      session: {
        id: data.id,
        layout: data.layout,
        status: data.status,
      },
    })
  } catch (err) {
    console.error('[API] Unexpected error:', err)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}