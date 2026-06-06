import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTemplateConfig } from '@/lib/templateConfig'

function toDisplayName(id: string): string {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: files, error } = await supabase.storage
      .from('templates')
      .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } })

    if (error || !files || files.length === 0) {
      console.warn('[TEMPLATES API] bucket empty or error:', error?.message)
      return NextResponse.json({ templates: [] })
    }

    const imageFiles = files.filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f.name)
    )

    if (imageFiles.length === 0) {
      return NextResponse.json({ templates: [] })
    }

    const templates = imageFiles.map((file) => {
      const id = file.name.replace(/\.[^/.]+$/, '')
      const { data } = supabase.storage.from('templates').getPublicUrl(file.name)
      const config = getTemplateConfig(id)
      return {
        id,
        name: config.displayName ?? toDisplayName(id),
        previewUrl: data.publicUrl,
        photoCount: config.photoCount,
        layout: config.layout,
      }
    })

    return NextResponse.json({ templates })
  } catch (err) {
    console.error('[TEMPLATES API]', err)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
