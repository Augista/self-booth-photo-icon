import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: session, error: sessionError } = await supabase
      .from('photobooth_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const layout = session.layout || '2x2'

    let width = 1200
    let height = 1800

    switch (layout) {
      case '1x4':
        width = 900
        height = 2400
        break

      case '2x2':
        width = 1200
        height = 1200
        break

      case '2x3':
        width = 1200
        height = 1800
        break

      case '3x3':
        width = 1800
        height = 1800
        break
    }

    const imageBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: {
          r: 20,
          g: 20,
          b: 20,
        },
      },
    })
      .jpeg({
        quality: 90,
      })
      .toBuffer()

    const filePath = `photos/session-${sessionId}-final-${layout}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('photobooth-results')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('[UPLOAD ERROR]', uploadError)

      return NextResponse.json(
        {
          error: uploadError.message,
        },
        {
          status: 500,
        }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from('photobooth-results')
      .getPublicUrl(filePath)

    // Save to results table
    const { error: resultError } = await supabase
      .from('results')
      .insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        layout,
        collage_url: publicUrl,
      })

    if (resultError) {
      console.error('[RESULT INSERT ERROR]', resultError)

      return NextResponse.json(
        {
          error: resultError.message,
        },
        {
          status: 500,
        }
      )
    }

    // Update session
    const { error: updateError } = await supabase
      .from('photobooth_sessions')
      .update({
        status: 'completed',
        final_collage_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[SESSION UPDATE ERROR]', updateError)

      return NextResponse.json(
        {
          error: updateError.message,
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
      layout,
      photoUrl: publicUrl,
    })
  } catch (err) {
    console.error('[CREATE COLLAGE ERROR]', err)

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      {
        status: 500,
      }
    )
  }
}