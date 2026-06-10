'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { getTemplateConfig } from '@/lib/templateConfig'

interface TemplateItem {
  id: string
  name: string
  previewUrl: string
  photoCount: number
  layout: string
}

interface SlotDraft {
  id: string
  left: number
  top: number
  width: number
  height: number
}

type Interaction =
  | null
  | { type: 'draw'; startX: number; startY: number; currentX: number; currentY: number }
  | { type: 'move'; slotId: string; startX: number; startY: number; origLeft: number; origTop: number }
  | { type: 'resize'; slotId: string; corner: 'tl' | 'tr' | 'bl' | 'br'; startX: number; startY: number; origSlot: SlotDraft }

interface TemplatePreviewScreenProps {
  onClose: () => void
}

export default function TemplatePreviewScreen({ onClose }: TemplatePreviewScreenProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<string | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Slot editor state
  const [editMode, setEditMode] = useState(false)
  const [slots, setSlots] = useState<SlotDraft[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [interaction, setInteraction] = useState<Interaction>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextIdRef = useRef(1)

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []))
      .catch(() => setError('Gagal memuat daftar template'))
      .finally(() => setLoadingTemplates(false))
  }, [])

  // When template changes, load existing slots from config
  useEffect(() => {
    if (!selectedId) return
    const config = getTemplateConfig(selectedId)
    if (config.slots && config.slots.length > 0) {
      const loaded = config.slots.map((s, i) => ({ ...s, id: String(i + 1) }))
      setSlots(loaded)
      nextIdRef.current = loaded.length + 1
    } else {
      setSlots([])
      nextIdRef.current = 1
    }
    setSelectedSlotId(null)
    setPreviewResult(null)
  }, [selectedId])

  const getRelativePos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    }
  }, [])

  const onContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editMode) return
    e.preventDefault()
    const pos = getRelativePos(e)
    setInteraction({ type: 'draw', startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
    setSelectedSlotId(null)
  }, [editMode, getRelativePos])

  const onSlotMouseDown = useCallback((e: React.MouseEvent, slotId: string) => {
    if (!editMode) return
    e.stopPropagation()
    e.preventDefault()
    const pos = getRelativePos(e)
    const slot = slots.find(s => s.id === slotId)
    if (!slot) return
    setSelectedSlotId(slotId)
    setInteraction({ type: 'move', slotId, startX: pos.x, startY: pos.y, origLeft: slot.left, origTop: slot.top })
  }, [editMode, getRelativePos, slots])

  const onCornerMouseDown = useCallback((
    e: React.MouseEvent, slotId: string, corner: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    if (!editMode) return
    e.stopPropagation()
    e.preventDefault()
    const pos = getRelativePos(e)
    const slot = slots.find(s => s.id === slotId)
    if (!slot) return
    setSelectedSlotId(slotId)
    setInteraction({ type: 'resize', slotId, corner, startX: pos.x, startY: pos.y, origSlot: { ...slot } })
  }, [editMode, getRelativePos, slots])

  const onGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!interaction) return
    const pos = getRelativePos(e)

    if (interaction.type === 'draw') {
      setInteraction(prev =>
        prev?.type === 'draw' ? { ...prev, currentX: pos.x, currentY: pos.y } : prev
      )
      return
    }

    if (interaction.type === 'move') {
      const dx = pos.x - interaction.startX
      const dy = pos.y - interaction.startY
      setSlots(prev => prev.map(s => {
        if (s.id !== interaction.slotId) return s
        return {
          ...s,
          left: Math.max(0, Math.min(1 - s.width, interaction.origLeft + dx)),
          top: Math.max(0, Math.min(1 - s.height, interaction.origTop + dy)),
        }
      }))
      return
    }

    if (interaction.type === 'resize') {
      const orig = interaction.origSlot
      const dx = pos.x - interaction.startX
      const dy = pos.y - interaction.startY
      const MIN = 0.03
      setSlots(prev => prev.map(s => {
        if (s.id !== interaction.slotId) return s
        let { left, top, width, height } = orig
        if (interaction.corner === 'br') {
          width = Math.max(MIN, orig.width + dx)
          height = Math.max(MIN, orig.height + dy)
        } else if (interaction.corner === 'bl') {
          const newLeft = Math.min(orig.left + orig.width - MIN, orig.left + dx)
          width = orig.width - (newLeft - orig.left)
          left = newLeft
          height = Math.max(MIN, orig.height + dy)
        } else if (interaction.corner === 'tr') {
          width = Math.max(MIN, orig.width + dx)
          const newTop = Math.min(orig.top + orig.height - MIN, orig.top + dy)
          height = orig.height - (newTop - orig.top)
          top = newTop
        } else {
          // tl
          const newLeft = Math.min(orig.left + orig.width - MIN, orig.left + dx)
          const newTop = Math.min(orig.top + orig.height - MIN, orig.top + dy)
          width = orig.width - (newLeft - orig.left)
          height = orig.height - (newTop - orig.top)
          left = newLeft
          top = newTop
        }
        return { ...s, left, top, width: Math.min(width, 1 - left), height: Math.min(height, 1 - top) }
      }))
    }
  }, [interaction, getRelativePos])

  const onGlobalMouseUp = useCallback(() => {
    if (interaction?.type === 'draw') {
      const minX = Math.min(interaction.startX, interaction.currentX)
      const maxX = Math.max(interaction.startX, interaction.currentX)
      const minY = Math.min(interaction.startY, interaction.currentY)
      const maxY = Math.max(interaction.startY, interaction.currentY)
      const w = maxX - minX
      const h = maxY - minY
      if (w > 0.02 && h > 0.02) {
        const id = String(nextIdRef.current++)
        setSlots(prev => [...prev, { id, left: minX, top: minY, width: w, height: h }])
        setSelectedSlotId(id)
      }
    }
    setInteraction(null)
  }, [interaction])

  useEffect(() => {
    window.addEventListener('mousemove', onGlobalMouseMove)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove)
      window.removeEventListener('mouseup', onGlobalMouseUp)
    }
  }, [onGlobalMouseMove, onGlobalMouseUp])

  const deleteSlot = (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id))
    if (selectedSlotId === id) setSelectedSlotId(null)
  }

  // Slots sorted top-to-bottom for numbering
  const sortedSlots = [...slots].sort((a, b) => a.top - b.top)
  const slotNumber = (id: string) => sortedSlots.findIndex(s => s.id === id) + 1

  const drawPreview = interaction?.type === 'draw' ? {
    left: Math.min(interaction.startX, interaction.currentX),
    top: Math.min(interaction.startY, interaction.currentY),
    width: Math.abs(interaction.currentX - interaction.startX),
    height: Math.abs(interaction.currentY - interaction.startY),
  } : null

  const copyConfig = () => {
    const lines = sortedSlots.map((s, i) =>
      `      { left: ${s.left.toFixed(3)}, top: ${s.top.toFixed(3)}, width: ${s.width.toFixed(3)}, height: ${s.height.toFixed(3)} }, // slot ${i + 1}`
    ).join('\n')
    const snippet =
`  '${selectedId}': {
    displayName: '${selectedTemplate?.name ?? '...'}',
    photoCount: ${sortedSlots.length},
    layout: '2x2',
    slots: [
${lines}
    ],
  },`
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setThumbnail(ev.target?.result as string)
      setPreviewResult(null)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!selectedId || !thumbnail) {
      setError('Pilih template dan upload gambar thumbnail terlebih dahulu')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedId, imageBase64: thumbnail }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Preview gagal')
      setPreviewResult(data.resultImage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview gagal')
    } finally {
      setGenerating(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === selectedId)

  return (
    <div className="w-screen h-screen bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          ← Kembali
        </button>
        <h1 className="text-white font-bold text-base">Admin Preview</h1>
        <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
          TEST MODE
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex justify-between items-start">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-white shrink-0">✕</button>
          </div>
        )}

        {/* Step 1 — Template selection */}
        <section>
          <h2 className="text-white font-semibold mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2">1</span>
            Pilih Template
          </h2>
          {loadingTemplates ? (
            <p className="text-slate-400 text-sm">Memuat template...</p>
          ) : templates.length === 0 ? (
            <p className="text-slate-500 text-sm">Tidak ada template di Supabase storage.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); setEditMode(false) }}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                    selectedId === t.id
                      ? 'border-blue-500 ring-2 ring-blue-400/50'
                      : 'border-slate-600 hover:border-slate-400'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.previewUrl} alt={t.name} className="w-full aspect-3/4 object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1.5">
                    <p className="text-white text-xs font-semibold truncate">{t.name}</p>
                    <p className="text-slate-300 text-[11px]">{t.photoCount} foto</p>
                  </div>
                  {selectedId === t.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Slot Editor */}
        {selectedTemplate && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2">S</span>
                Posisi Slot Foto
                <span className="ml-2 text-slate-400 font-normal text-sm">
                  ({slots.length} slot)
                </span>
              </h2>
              <div className="flex gap-2">
                {editMode && slots.length > 0 && (
                  <button
                    onClick={copyConfig}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {copied ? '✓ Tersalin!' : '📋 Copy Config'}
                  </button>
                )}
                <button
                  onClick={() => setEditMode(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    editMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {editMode ? '✓ Mode Edit Aktif' : '✏️ Edit Slot'}
                </button>
              </div>
            </div>

            {editMode && (
              <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg px-3 py-2 text-purple-200 text-xs mb-3 space-y-0.5">
                <p>• <strong>Drag</strong> di area kosong untuk gambar slot baru</p>
                <p>• <strong>Drag</strong> slot untuk geser posisi</p>
                <p>• <strong>Drag sudut</strong> slot untuk resize</p>
                <p>• Klik <strong>✕</strong> pada slot untuk hapus</p>
              </div>
            )}

            <div
              ref={containerRef}
              className={`relative inline-block w-full max-w-sm border border-slate-600 rounded-xl overflow-hidden select-none ${
                editMode ? 'cursor-crosshair' : ''
              }`}
              onMouseDown={onContainerMouseDown}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedTemplate.previewUrl}
                alt={selectedTemplate.name}
                className="w-full block pointer-events-none"
                draggable={false}
              />

              {/* Draw preview ghost */}
              {drawPreview && drawPreview.width > 0.005 && drawPreview.height > 0.005 && (
                <div
                  className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none"
                  style={{
                    left: `${drawPreview.left * 100}%`,
                    top: `${drawPreview.top * 100}%`,
                    width: `${drawPreview.width * 100}%`,
                    height: `${drawPreview.height * 100}%`,
                  }}
                />
              )}

              {/* Existing slots */}
              {slots.map(slot => {
                const num = slotNumber(slot.id)
                const isSelected = selectedSlotId === slot.id
                return (
                  <div
                    key={slot.id}
                    className={`absolute border-2 ${
                      editMode ? 'cursor-move' : ''
                    } ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400/20'
                        : 'border-blue-400 bg-blue-400/20'
                    }`}
                    style={{
                      left: `${slot.left * 100}%`,
                      top: `${slot.top * 100}%`,
                      width: `${slot.width * 100}%`,
                      height: `${slot.height * 100}%`,
                    }}
                    onMouseDown={e => onSlotMouseDown(e, slot.id)}
                  >
                    {/* Slot number */}
                    <span className={`absolute top-0.5 left-0.5 text-white text-[10px] font-bold px-1 rounded ${
                      isSelected ? 'bg-yellow-500/90' : 'bg-blue-600/90'
                    }`}>
                      {num}
                    </span>

                    {/* Delete button */}
                    {editMode && (
                      <button
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600/90 hover:bg-red-500 text-white text-[10px] font-bold rounded flex items-center justify-center leading-none"
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); deleteSlot(slot.id) }}
                      >
                        ✕
                      </button>
                    )}

                    {/* Resize handles (4 corners) */}
                    {editMode && (
                      <>
                        {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
                          <div
                            key={corner}
                            className="absolute w-3 h-3 bg-white border-2 border-slate-700 rounded-sm cursor-nwse-resize"
                            style={{
                              top: corner.startsWith('t') ? -4 : undefined,
                              bottom: corner.startsWith('b') ? -4 : undefined,
                              left: corner.endsWith('l') ? -4 : undefined,
                              right: corner.endsWith('r') ? -4 : undefined,
                            }}
                            onMouseDown={e => onCornerMouseDown(e, slot.id, corner)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Slot coordinate readout */}
            {slots.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedSlots.map((slot, i) => (
                  <div
                    key={slot.id}
                    className={`rounded-lg px-3 py-2 text-xs font-mono cursor-pointer transition-colors ${
                      selectedSlotId === slot.id
                        ? 'bg-yellow-900/50 border border-yellow-600/50 text-yellow-200'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedSlotId(selectedSlotId === slot.id ? null : slot.id)}
                  >
                    <span className="text-blue-400 font-semibold">Slot {i + 1}:</span>{' '}
                    L {(slot.left * 100).toFixed(1)}%,{' '}
                    T {(slot.top * 100).toFixed(1)}%,{' '}
                    {(slot.width * 100).toFixed(1)}% × {(slot.height * 100).toFixed(1)}%
                  </div>
                ))}
              </div>
            )}

            {/* Copy config snippet */}
            {editMode && slots.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-slate-400 text-xs">Snippet untuk <code className="text-slate-300">templateConfig.ts</code></p>
                  <button
                    onClick={copyConfig}
                    className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
                      copied ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {copied ? '✓ Tersalin!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
{`  '${selectedId}': {
    displayName: '${selectedTemplate.name}',
    photoCount: ${sortedSlots.length},
    layout: '2x2',
    slots: [
${sortedSlots.map((s, i) =>
  `      { left: ${s.left.toFixed(3)}, top: ${s.top.toFixed(3)}, width: ${s.width.toFixed(3)}, height: ${s.height.toFixed(3)} }, // ${i + 1}`
).join('\n')}
    ],
  },`}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Step 2 — Thumbnail upload */}
        <section>
          <h2 className="text-white font-semibold mb-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2">2</span>
            Upload Gambar Thumbnail
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-600 hover:border-slate-400 rounded-xl p-6 text-center transition-colors"
          >
            {thumbnail ? (
              <div className="flex items-center justify-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt="thumbnail"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-600"
                />
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">Gambar dipilih ✓</p>
                  <p className="text-slate-400 text-xs mt-1">Klik untuk ganti</p>
                  <p className="text-slate-500 text-xs">Gambar ini dipakai di semua slot</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-2">🖼</p>
                <p className="text-slate-300 text-sm font-medium">Klik untuk upload gambar</p>
                <p className="text-slate-500 text-xs mt-1">
                  JPG, PNG · Gambar ini akan ditempatkan di semua slot template
                </p>
              </div>
            )}
          </button>
        </section>

        {/* Step 3 — Generate preview */}
        <section className="space-y-4">
          <Button
            onClick={handleGenerate}
            disabled={!selectedId || !thumbnail || generating}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-base"
          >
            {generating ? '⏳ Memproses Preview...' : '🔍 Generate Preview'}
          </Button>

          {previewResult && (
            <div>
              <h2 className="text-white font-semibold text-sm mb-3">
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded mr-2">✓</span>
                Hasil Preview — {selectedTemplate?.name}
              </h2>
              <div className="rounded-xl overflow-hidden border border-slate-600 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewResult}
                  alt="Preview Result"
                  className="w-full object-contain max-h-[70vh]"
                />
              </div>
              <p className="text-slate-500 text-xs mt-2 text-center">
                {selectedTemplate?.name} · {slots.length > 0 ? `${slots.length} slot (custom)` : 'Grid otomatis'}
              </p>
            </div>
          )}
        </section>

        <div className="h-8" />
      </div>
    </div>
  )
}
