'use client'

import { useState, useCallback, useRef } from 'react'

const POLL_INTERVAL = 3000

export interface PhotoboothSession {
  id: string
  createdAt: string
  layout: string | null
  status:
    | 'waiting'
    | 'layout_selected'
    | 'payment_pending'
    | 'payment_verified'
    | 'ready_capture'
    | 'capturing'
    | 'photo_ready'
    | 'processing'
    | 'completed'
    | 'error'
  qrisUrl: string | null
  paymentVerified: boolean
  photoPath: string | null
  final_collage_url: string | null
  cameraTriggerCount: number
}

export function useSession() {
  const [session, setSession] = useState<PhotoboothSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const createSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Gagal membuat session')
      const data = await response.json()

      setSession({
        id: data.sessionId,
        createdAt: new Date().toISOString(),
        layout: null,
        status: 'waiting',
        qrisUrl: null,
        paymentVerified: false,
        photoPath: null,
        final_collage_url: null,
        cameraTriggerCount: 0,
      })

      return data.sessionId as string
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('[useSession] createSession:', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const startPolling = useCallback(async (sessionId: string) => {
    if (!sessionId) return

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}`)
        if (!response.ok) throw new Error('Session not found')
        const data = await response.json()
        const s = data.session

        setSession((prev) =>
          prev
            ? {
                ...prev,
                layout: s.layout,
                status: s.status,
                qrisUrl: s.qrisUrl,
                paymentVerified: s.paymentVerified,
                photoPath: s.photoPath,
                final_collage_url: s.final_collage_url ?? null,
                cameraTriggerCount: s.cameraTriggerCount ?? 0,
              }
            : null
        )
      } catch (err) {
        console.error('[useSession] poll:', err)
      }
    }

    await fetchSession()
    pollIntervalRef.current = setInterval(fetchSession, POLL_INTERVAL)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const setLayout = useCallback(
    async (layout: string) => {
      if (!session) return

      try {
        const response = await fetch(`/api/session/${session.id}/layout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layout }),
        })

        if (!response.ok) throw new Error('Gagal set layout')
        const data = await response.json()

        setSession((prev) =>
          prev ? { ...prev, layout: data.session.layout, status: data.session.status } : null
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        console.error('[useSession] setLayout:', msg)
      }
    },
    [session]
  )

  const generateQRIS = useCallback(
    async (amount: number) => {
      if (!session) return null

      try {
        const response = await fetch('/api/payment/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        })

        if (!response.ok) throw new Error('Gagal generate QRIS')
        const data = await response.json()

        setSession((prev) =>
          prev ? { ...prev, qrisUrl: data.qrisString, status: 'payment_pending' } : null
        )

        return data
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        console.error('[useSession] generateQRIS:', msg)
        return null
      }
    },
    [session]
  )

  const verifyPayment = useCallback(
    async (transactionId: string) => {
      if (!session) return false

      try {
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, transactionId }),
        })

        if (!response.ok) throw new Error('Gagal verify payment')

        setSession((prev) =>
          prev ? { ...prev, paymentVerified: true, status: 'ready_capture' } : null
        )

        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        console.error('[useSession] verifyPayment:', msg)
        return false
      }
    },
    [session]
  )

  const triggerCamera = useCallback(
    async (shotNumber: number = 1) => {
      if (!session) return false

      try {
        const response = await fetch('/api/camera/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, shotNumber }),
        })

        if (!response.ok) throw new Error('Gagal trigger camera')
        const data = await response.json()

        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'photo_ready',
                photoPath: data.photoPath ?? prev.photoPath,
                cameraTriggerCount: data.triggerCount ?? prev.cameraTriggerCount + 1,
              }
            : null
        )

        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        console.error('[useSession] triggerCamera:', msg)
        return false
      }
    },
    [session]
  )

  // createCollage is kept as a backup; primary collage creation is done by CameraScreen
  const createCollage = useCallback(
    async (template?: string) => {
      if (!session) return false

      try {
        const response = await fetch('/api/process/college', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, template }),
        })

        if (!response.ok) throw new Error('Gagal proses collage')
        const data = await response.json()

        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                final_collage_url: data.photoUrl ?? null,
              }
            : null
        )

        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        console.error('[useSession] createCollage:', msg)
        return false
      }
    },
    [session]
  )

  const updateSession = useCallback((updates: Partial<PhotoboothSession>) => {
    setSession((prev) => (prev ? { ...prev, ...updates } : null))
  }, [])

  const resetSession = useCallback(async () => {
    if (!session) return

    try {
      stopPolling()
      await fetch(`/api/session/${session.id}/reset`, { method: 'POST' })
      setSession(null)
      setError(null)
    } catch (err) {
      console.error('[useSession] resetSession:', err)
    }
  }, [session, stopPolling])

  return {
    session,
    loading,
    error,
    createSession,
    startPolling,
    stopPolling,
    setLayout,
    generateQRIS,
    verifyPayment,
    triggerCamera,
    createCollage,
    updateSession,
    resetSession,
  }
}
