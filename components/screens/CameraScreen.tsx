'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { IS_TEST_MODE } from '@/lib/cameraConfig';

interface CameraScreenProps {
  sessionId: string;
  layout: string;
  template: string;
  photoCount?: number;
  triggerCount?: number;
  onTrigger?: () => void;
  status?: string;
  onFinish: (photoUrl: string) => void;
}

interface PhotoCapture {
  shotNumber: number;
  photoUrl: string;
  photoPath: string;
  timestamp: number;
}

const LAYOUT_CONFIG: Record<string, number> = {
  '1x4': 4, '2x2': 4, '2x3': 6, '3x3': 9,
};

export default function CameraScreen({
  sessionId,
  layout,
  template,
  photoCount,
  onFinish,
}: CameraScreenProps) {
  const totalPhotos = photoCount ?? LAYOUT_CONFIG[layout] ?? 4;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [photosTaken, setPhotosTaken] = useState<PhotoCapture[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [liveViewLoaded, setLiveViewLoaded] = useState(!IS_TEST_MODE);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!IS_TEST_MODE) return;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1296 }, height: { ideal: 864 }, facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setLiveViewLoaded(true);
        }
      })
      .catch((err) => setError(`Kamera tidak bisa diakses: ${err.message}`));
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const grabWebcamFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 1296;
    canvas.height = video.videoHeight || 864;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const triggerCapture = async (shotNumber: number): Promise<{ success: boolean; photoUrl?: string } | null> => {
    try {
      const body: Record<string, unknown> = { sessionId, shotNumber };
      if (IS_TEST_MODE) {
        const frame = grabWebcamFrame();
        if (!frame) throw new Error('Gagal mengambil frame dari webcam');
        body.imageData = frame;
      }
      const response = await fetch('/api/camera/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 100)}`);
      }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.details || data.error || 'Capture failed');
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const handleTriggerClick = () => {
    if (photosTaken.length >= totalPhotos || isCapturing) return;
    const shotNumber = photosTaken.length + 1;
    setIsCapturing(true);
    setError(null);
    setCountdown(3);

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current!);
        setCountdown(null);
      } else {
        setCountdown(count);
      }
    }, 1000);

    captureTimeoutRef.current = setTimeout(async () => {
      setCountdown(null);
      const result = await triggerCapture(shotNumber);
      if (result?.success) {
        setPhotosTaken((prev) => [
          ...prev,
          { shotNumber, photoUrl: result.photoUrl || '', photoPath: '', timestamp: Date.now() },
        ]);
      }
      setIsCapturing(false);
    }, 3000);
  };

  const handleFinish = async () => {
    if (photosTaken.length === 0) { setError('Belum ada foto yang diambil'); return; }
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/process/college', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, template, photos: photosTaken }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Gagal membuat collage');
      sessionStorage.setItem(`result-${sessionId}`, JSON.stringify({ photoUrl: data.photoUrl, layout, template }));
      onFinish(data.photoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const allPhotosTaken = photosTaken.length >= totalPhotos;

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">

      {/* ── Camera source fills the entire screen ── */}
      {IS_TEST_MODE && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {!IS_TEST_MODE && (
        <>
          <iframe
            ref={iframeRef}
            src="http://localhost:5513/"
            title="DigiCamControl Live View"
            className="absolute inset-0 w-full h-full border-0"
            allow="camera"
            onLoad={() => setLiveViewLoaded(true)}
            onError={() => setLiveViewLoaded(false)}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
          {!liveViewLoaded && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-white text-2xl font-semibold mb-4">Menghubungkan ke DigiCamControl...</p>
                <p className="text-slate-400 text-sm mb-4">Pastikan DigiCamControl berjalan di localhost:5513</p>
                <ul className="text-slate-400 text-xs mt-2 space-y-1">
                  <li>• DigiCamControl sedang berjalan</li>
                  <li>• Web server diaktifkan di port 5513</li>
                  <li>• Camera sudah terhubung</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Error bar (top) ── */}
      {error && (
        <div className="absolute top-0 inset-x-0 bg-red-600/90 px-4 py-3 text-white text-sm z-40 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:text-gray-200">✕</button>
        </div>
      )}

      {/* ── Top-left: shot indicators ── */}
      <div className="absolute top-4 left-4 space-y-2 z-20">
        {Array.from({ length: totalPhotos }).map((_, i) => {
          const taken = photosTaken.some((p) => p.shotNumber === i + 1);
          return (
            <div
              key={i}
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg transition-colors ${
                taken ? 'bg-green-600 text-white' : 'bg-slate-700/80 text-slate-300'
              }`}
            >
              {taken ? '✓' : i + 1}
            </div>
          );
        })}
      </div>

      {/* ── Top-right: photo counter + TEST badge ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {IS_TEST_MODE && (
          <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
            TEST · Webcam
          </span>
        )}
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
          <span className="text-white font-bold text-sm">{photosTaken.length} / {totalPhotos}</span>
        </div>
      </div>

      {/* ── Countdown overlay ── */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <div className="text-center">
            <div className="text-[180px] leading-none font-bold text-white animate-pulse drop-shadow-2xl">
              {countdown}
            </div>
            <p className="text-white text-2xl mt-4 font-semibold">Bersiaplah!</p>
          </div>
        </div>
      )}

      {/* ── Ready prompt ── */}
      {countdown === null && !allPhotosTaken && !isCapturing && (
        <div className="absolute inset-0 flex items-end justify-center pb-44 z-10 pointer-events-none">
          <p className="text-white/70 text-lg font-semibold bg-black/40 px-4 py-2 rounded-full">
            Tekan tombol untuk foto {photosTaken.length + 1} dari {totalPhotos}
          </p>
        </div>
      )}

      {/* ── All done overlay ── */}
      {allPhotosTaken && !isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="bg-black/60 px-10 py-6 rounded-2xl backdrop-blur-sm">
            <p className="text-white text-3xl font-bold">Semua foto selesai! ✓</p>
          </div>
        </div>
      )}

      {/* ── Uploading spinner ── */}
      {isCapturing && countdown === null && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-20 text-center">
          <div className="animate-spin inline-block mb-2">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
          </div>
          <p className="text-white text-sm">Mengupload foto...</p>
        </div>
      )}

      {/* ── Bottom controls (floating) ── */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center z-30">
        {!allPhotosTaken ? (
          <Button
            onClick={handleTriggerClick}
            disabled={isCapturing || !liveViewLoaded}
            size="lg"
            className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed text-white text-4xl font-bold shadow-2xl transition-all"
          >
            {isCapturing ? '⏳' : '📸'}
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={isProcessing}
            size="lg"
            className="px-10 py-7 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white text-xl font-bold rounded-2xl shadow-2xl transition-all"
          >
            {isProcessing ? '⏳ Memproses...' : '✓ Selesai & Proses'}
          </Button>
        )}
      </div>

      {/* ── Processing full-screen overlay ── */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin inline-block mb-4">
              <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full" />
            </div>
            <p className="text-white text-2xl font-semibold">Membuat collage foto...</p>
          </div>
        </div>
      )}
    </div>
  );
}
