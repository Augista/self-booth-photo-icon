import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

// ── DigiCamControl config (production only) ───────────────────────────────────
const DIGICAM_CONFIG = {
  executablePath:
    process.env.DIGICAM_EXECUTABLE_PATH ||
    'C:\\Program Files (x86)\\digiCamControl\\CameraControlRemoteCmd.exe',
  photoDir:
    process.env.DIGICAM_PHOTO_DIR ||
    'C:\\Users\\augista\\Pictures\\digiCamControl\\Session1',
  captureTimeout: 60000,
  photoWaitTime: 5000,
}

// ── Supabase upload helper ────────────────────────────────────────────────────
async function uploadPhotoToSupabase(
  fileBuffer: Buffer,
  sessionId: string,
  shotNumber: number
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const uploadPath = `photos/session-${sessionId}-shot-${shotNumber}.jpg`
  const { error } = await supabase.storage
    .from('photobooth-results')
    .upload(uploadPath, fileBuffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Supabase upload failed: ${error.message}`)
  return supabase.storage.from('photobooth-results').getPublicUrl(uploadPath).data.publicUrl
}

// ── TEST MODE: receive base64 image from browser webcam ───────────────────────
async function handleTestCapture(
  imageData: string,
  sessionId: string,
  shotNumber: number
): Promise<string> {
  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0) throw new Error('Empty webcam capture received')
  return uploadPhotoToSupabase(buffer, sessionId, shotNumber)
}

// ── PRODUCTION MODE: trigger DigiCamControl ───────────────────────────────────
async function captureWithDigiCam(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(DIGICAM_CONFIG.executablePath, ['/c', 'capture'], {
      shell: false,
      windowsHide: true,
    })
    let stderr = ''
    proc.stderr?.on('data', (d) => { stderr += d.toString() })
    const timer = setTimeout(() => { proc.kill(); reject(new Error('Capture timeout')) }, DIGICAM_CONFIG.captureTimeout)
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`DigiCam exit ${code}: ${stderr}`))
    })
    proc.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

async function getLatestPhoto(photoDir: string): Promise<string> {
  if (!fs.existsSync(photoDir)) throw new Error(`Photo directory not found: ${photoDir}`)
  await new Promise((r) => setTimeout(r, DIGICAM_CONFIG.photoWaitTime))
  const files = fs
    .readdirSync(photoDir)
    .filter((f) => ['.jpg', '.jpeg', '.raw', '.dng'].includes(path.extname(f).toLowerCase()))
    .map((f) => {
      const full = path.join(photoDir, f)
      return { path: full, mtime: fs.statSync(full).mtime.getTime() }
    })
    .sort((a, b) => b.mtime - a.mtime)
  if (files.length === 0) throw new Error('No photos found in: ' + photoDir)
  return files[0].path
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, shotNumber, imageData } = body

    if (!sessionId || shotNumber === undefined) {
      return NextResponse.json({ error: 'Missing sessionId or shotNumber' }, { status: 400 })
    }

    let photoUrl: string

    // imageData present → test mode (webcam frame sent from browser)
    if (imageData) {
      console.log(`[TEST] Webcam capture: session=${sessionId} shot=${shotNumber}`)
      photoUrl = await handleTestCapture(imageData as string, sessionId, shotNumber)
    } else {
      // production mode → DigiCamControl
      console.log(`[PROD] DigiCam capture: session=${sessionId} shot=${shotNumber}`)
      await captureWithDigiCam()
      const photoPath = await getLatestPhoto(DIGICAM_CONFIG.photoDir)
      const buffer = fs.readFileSync(photoPath)
      if (buffer.length === 0) throw new Error('Photo file is empty')
      photoUrl = await uploadPhotoToSupabase(buffer, sessionId, shotNumber)
    }

    return NextResponse.json({ success: true, photoUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[CAMERA TRIGGER ERROR]', msg)
    return NextResponse.json({ error: 'Capture failed', details: msg }, { status: 500 })
  }
}
