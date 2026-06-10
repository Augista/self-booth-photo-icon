import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { getTemplateConfig } from '@/lib/templateConfig'

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

export async function POST(request: NextRequest) {
  try {
    const { templateId, imageBase64 } = await request.json()

    if (!templateId || !imageBase64) {
      return NextResponse.json(
        { error: 'templateId and imageBase64 required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const config = getTemplateConfig(templateId)

    // Download template from Supabase
    let templateBuf: Buffer | null = null
    let templateWidth = 0
    let templateHeight = 0
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
        break
      } catch {
        // try next extension
      }
    }

    if (!templateBuf) {
      return NextResponse.json(
        { error: 'Template not found in Supabase storage' },
        { status: 404 }
      )
    }

    // Parse uploaded test photo
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const photoBuf = Buffer.from(base64Data, 'base64')

    // Build composite list (photo at each slot)
    const composites: sharp.OverlayOptions[] = []

    if (config.slots && config.slots.length > 0) {
      for (const slot of config.slots) {
        const slotX = Math.round(slot.left * templateWidth)
        const slotY = Math.round(slot.top * templateHeight)
        const slotW = Math.max(1, Math.round(slot.width * templateWidth))
        const slotH = Math.max(1, Math.round(slot.height * templateHeight))

        const resized = await sharp(photoBuf)
          .resize(slotW, slotH, { fit: 'cover', position: 'centre' })
          .toBuffer()
        composites.push({ input: resized, left: slotX, top: slotY })
      }
    } else {
      // Grid fallback when no slots defined
      const GRID: Record<string, [number, number]> = {
        '1x4': [1, 4], '2x2': [2, 2], '2x3': [2, 3], '3x3': [3, 3],
      }
      const [cols, rows] = GRID[config.layout] ?? [2, 2]
      const PADDING = Math.round(templateWidth * 0.05)
      const GAP = Math.round(templateWidth * 0.012)
      const cellW = Math.floor((templateWidth - PADDING * 2 - GAP * (cols - 1)) / cols)
      const cellH = Math.floor((templateHeight - PADDING * 2 - GAP * (rows - 1)) / rows)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const resized = await sharp(photoBuf)
            .resize(cellW, cellH, { fit: 'cover', position: 'centre' })
            .toBuffer()
          composites.push({
            input: resized,
            left: PADDING + col * (cellW + GAP),
            top: PADDING + row * (cellH + GAP),
          })
        }
      }
    }

    let finalBuffer: Buffer

    if (templateHasAlpha) {
      // PNG with transparent holes: photos go under template
      const blankCanvas = await sharp({
        create: {
          width: templateWidth,
          height: templateHeight,
          channels: 3,
          background: { r: 230, g: 230, b: 230 },
        },
      }).jpeg({ quality: 90 }).toBuffer()

      const photosLayer = composites.length > 0
        ? await sharp(blankCanvas).composite(composites).jpeg({ quality: 90 }).toBuffer()
        : blankCanvas

      const templatePng = await sharp(templateBuf)
        .resize(templateWidth, templateHeight, { fit: 'fill' })
        .png()
        .toBuffer()

      finalBuffer = await sharp(photosLayer)
        .composite([{ input: templatePng, blend: 'over' }])
        .jpeg({ quality: 90 })
        .toBuffer()
    } else {
      // Opaque template (black/green placeholders): template as base, photos on top
      const baseCanvas = await sharp(templateBuf)
        .resize(templateWidth, templateHeight, { fit: 'fill' })
        .jpeg({ quality: 90 })
        .toBuffer()

      finalBuffer = composites.length > 0
        ? await sharp(baseCanvas).composite(composites).jpeg({ quality: 90 }).toBuffer()
        : baseCanvas
    }

    const resultImage = `data:image/jpeg;base64,${finalBuffer.toString('base64')}`
    return NextResponse.json({ success: true, resultImage })
  } catch (err) {
    console.error('[PREVIEW ERROR]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Preview failed' },
      { status: 500 }
    )
  }
}
