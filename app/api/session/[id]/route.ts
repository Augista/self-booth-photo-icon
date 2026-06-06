import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params

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
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (error) {
      console.error('[GET SESSION ERROR]', error)

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
        createdAt: data.created_at,
        layout: data.layout,
        status: data.status,
        template: data.template ?? null,
        qrisUrl: data.qris_string,
        paymentVerified: data.payment_verified,
        photoPath: data.photo_path,
        final_collage_url: data.final_collage_url ?? null,
        cameraTriggerCount: data.camera_trigger_count || 0,
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