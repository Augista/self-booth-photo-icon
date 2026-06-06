import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COLLEGE_NAMES: Record<string, string> = {
  binus: 'BINUS University',
  ui: 'Universitas Indonesia',
  itb: 'Institut Teknologi Bandung',
  ugm: 'Universitas Gadjah Mada',
  unpad: 'Universitas Padjadjaran',
  its: 'Institut Teknologi Sepuluh Nopember',
  undip: 'Universitas Diponegoro',
  uny: 'Universitas Negeri Yogyakarta',
  unesa: 'Universitas Negeri Surabaya',
  custom: 'Classic Photobooth',
}

function toDisplayName(id: string): string {
  return COLLEGE_NAMES[id.toLowerCase()] ?? id.charAt(0).toUpperCase() + id.slice(1)
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: files, error } = await supabase.storage
      .from('college-templates')
      .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } })

    if (error || !files || files.length === 0) {
      // Fallback: return default list pointing to the bucket (may show placeholders)
      const defaults = ['binus', 'ui', 'itb', 'custom']
      const colleges = defaults.map((id) => {
        const { data } = supabase.storage
          .from('college-templates')
          .getPublicUrl(`${id}.jpg`)
        return { id, name: toDisplayName(id), previewUrl: data.publicUrl }
      })
      return NextResponse.json({ colleges })
    }

    const imageFiles = files.filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f.name)
    )

    if (imageFiles.length === 0) {
      return NextResponse.json({ colleges: [] })
    }

    const colleges = imageFiles.map((file) => {
      const id = file.name.replace(/\.[^/.]+$/, '')
      const { data } = supabase.storage
        .from('college-templates')
        .getPublicUrl(file.name)
      return { id, name: toDisplayName(id), previewUrl: data.publicUrl }
    })

    return NextResponse.json({ colleges })
  } catch (err) {
    console.error('[COLLEGES API]', err)
    return NextResponse.json(
      { error: 'Failed to fetch colleges' },
      { status: 500 }
    )
  }
}
