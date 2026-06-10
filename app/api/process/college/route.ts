import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { getTemplateConfig } from '@/lib/templateConfig'

interface PhotoCapture {
  shotNumber: number
  photoUrl: string
  photoPath?: string
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, template, photos } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const templateId: string = template || session.template || 'default'
    const config = getTemplateConfig(templateId)
    const layout = session.layout || config.layout || '2x2'

    // --- Load template from 'templates' bucket ---
    let baseCanvas: Buffer | null = null
    let templateWidth = 0
    let templateHeight = 0

    let templateBuf: Buffer | null = null
    let templateHasAlpha = false

    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      try {
        const { data: urlData } = supabase.storage
          .from('templates')
          .getPublicUrl(`${templateId}.${ext}`)

        const buf = await downloadImage(urlData.publicUrl)
        const meta = await sharp(buf).metadata()
        templateWidth = meta.width ?? 1200
        templateHeight = meta.height ?? 1800
        templateHasAlpha = (meta.channels ?? 3) >= 4
        templateBuf = buf

        // For opaque templates (green/black placeholders): use as base canvas
        if (!templateHasAlpha) {
          baseCanvas = await sharp(buf)
            .resize(templateWidth, templateHeight, { fit: 'fill' })
            .jpeg({ quality: 90 })
            .toBuffer()
        } else {
          // For transparent PNG: blank canvas, photos first, template on top later
          baseCanvas = await sharp({
            create: { width: templateWidth, height: templateHeight, channels: 3, background: { r: 230, g: 230, b: 230 } },
          }).jpeg({ quality: 90 }).toBuffer()
        }
        break
      } catch {
        // try next extension
      }
    }

    // Fallback canvas when template not found
    if (!baseCanvas) {
      const FALLBACK: Record<string, [number, number]> = {
        '1x4': [900, 2400], '2x2': [1200, 1200],
        '2x3': [1200, 1800], '3x3': [1800, 1800],
      }
      const [fw, fh] = FALLBACK[layout] ?? [1200, 1800]
      templateWidth = fw
      templateHeight = fh
      baseCanvas = await sharp({
        create: { width: fw, height: fh, channels: 3, background: { r: 18, g: 18, b: 36 } },
      }).jpeg({ quality: 90 }).toBuffer()
    }

    // --- Composite photos ---
    const photoList: PhotoCapture[] = Array.isArray(photos) ? photos : []
    const composites: sharp.OverlayOptions[] = []

    if (config.slots && config.slots.length > 0) {
      // Template has defined slot positions — use them exactly
      for (let i = 0; i < config.slots.length; i++) {
        const slot = config.slots[i]
        const photo = photoList[i]
        if (!photo?.photoUrl) continue

        const slotX = Math.round(slot.left * templateWidth)
        const slotY = Math.round(slot.top * templateHeight)
        const slotW = Math.max(1, Math.round(slot.width * templateWidth))
        const slotH = Math.max(1, Math.round(slot.height * templateHeight))

        try {
          const photoBuf = await downloadImage(photo.photoUrl)
          const resized = await sharp(photoBuf)
            .resize(slotW, slotH, { fit: 'cover', position: 'centre' })
            .toBuffer()
          composites.push({ input: resized, left: slotX, top: slotY })
        } catch (err) {
          console.warn(`[COLLEGE] Skipping slot ${i + 1}:`, err)
        }
      }
    } else {
      // Generic grid layout — divide template into equal cells
      const GRID: Record<string, [number, number]> = {
        '1x4': [1, 4], '2x2': [2, 2], '2x3': [2, 3], '3x3': [3, 3],
      }
      const [cols, rows] = GRID[layout] ?? [2, 2]
      const PADDING = Math.round(templateWidth * 0.05)
      const GAP = Math.round(templateWidth * 0.012)
      const availW = templateWidth - PADDING * 2
      const availH = templateHeight - PADDING * 2
      const cellW = Math.floor((availW - GAP * (cols - 1)) / cols)
      const cellH = Math.floor((availH - GAP * (rows - 1)) / rows)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = row * cols + col
          const photo = photoList[index]
          if (!photo?.photoUrl) continue

          try {
            const photoBuf = await downloadImage(photo.photoUrl)
            const resized = await sharp(photoBuf)
              .resize(cellW, cellH, { fit: 'cover', position: 'centre' })
              .toBuffer()
            composites.push({
              input: resized,
              left: PADDING + col * (cellW + GAP),
              top: PADDING + row * (cellH + GAP),
            })
          } catch (err) {
            console.warn(`[COLLEGE] Skipping grid photo ${index + 1}:`, err)
          }
        }
      }
    }

    let finalBuffer = baseCanvas
    if (composites.length > 0) {
      finalBuffer = await sharp(baseCanvas).composite(composites).jpeg({ quality: 90 }).toBuffer()
    }

    // For PNG templates with transparent holes: overlay template on top of photos
    if (templateHasAlpha && templateBuf) {
      const templatePng = await sharp(templateBuf)
        .resize(templateWidth, templateHeight, { fit: 'fill' })
        .png()
        .toBuffer()
      finalBuffer = await sharp(finalBuffer)
        .composite([{ input: templatePng, blend: 'over' }])
        .jpeg({ quality: 90 })
        .toBuffer()
    }

    // --- Upload result ---
    const filePath = `results/${sessionId}-${templateId}-${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('photobooth-results')
      .upload(filePath, finalBuffer, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('photobooth-results')
      .getPublicUrl(filePath)

    await supabase
      .from('photobooth_sessions')
      .update({ status: 'completed', final_collage_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({ success: true, photoUrl: publicUrl, layout, template: templateId })
  } catch (err) {
    console.error('[COLLEGE PROCESS ERROR]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
