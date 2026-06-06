'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface ResultScreenProps {
  sessionId: string;
  photoPath: string | null;
  status: string;
  layout?: string;
  template?: string;
  onReset: () => void;
}

function QRCodeDisplay({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !url) return;
    let mounted = true;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (!mounted || !ref.current) return;
      ref.current.innerHTML = '';
      const qrCode = new QRCodeStyling({
        width: 260,
        height: 260,
        type: 'canvas',
        data: url,
        dotsOptions: { color: '#1a1a1a', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        cornersSquareOptions: { type: 'extra-rounded' },
        cornersDotOptions: { color: '#1a1a1a' },
      });
      qrCode.append(ref.current);
    });
    return () => { mounted = false; };
  }, [url]);

  return <div ref={ref} className="rounded-xl overflow-hidden" />;
}

export default function ResultScreen({
  sessionId,
  photoPath,
  status,
  layout = '2x2',
  template,
  onReset,
}: ResultScreenProps) {
  const [displayedPath, setDisplayedPath] = useState<string | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    if (photoPath) {
      setCleanUrl(photoPath);
      setDisplayedPath(`${photoPath}${photoPath.includes('?') ? '&' : '?'}t=${Date.now()}`);
      setImageLoaded(false);
      return;
    }
    try {
      const cached = sessionStorage.getItem(`result-${sessionId}`);
      if (cached) {
        const { photoUrl } = JSON.parse(cached);
        if (photoUrl) {
          setCleanUrl(photoUrl);
          setDisplayedPath(`${photoUrl}${photoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
          setImageLoaded(false);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [photoPath, sessionId]);

  useEffect(() => {
    setCountdown(120);
  }, [sessionId]);

  useEffect(() => {
    const isCompleted = status === 'completed' && displayedPath;
    if (!isCompleted) return;
    if (countdown <= 0) {
      onReset();
      return;
    }
    const timer = setTimeout(() => setCountdown((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, status, displayedPath, onReset]);

  const handleDownload = async () => {
    if (!cleanUrl) return;
    setHasDownloaded(true);
    setShowQR(true);
    try {
      const response = await fetch(cleanUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `photobooth-${sessionId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // CORS or network failure — QR code is still shown for phone download
    }
  };

  const isLoading = !displayedPath || status === 'processing';
  const isCompleted = status === 'completed' && displayedPath;

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black">
          <div className="text-center">
            <div className="text-8xl mb-6 animate-pulse">⏳</div>
            <h2 className="text-4xl font-bold text-white mb-4">Sedang Memproses...</h2>
            <p className="text-slate-400 text-lg mb-8">Membuat collage foto Anda</p>
            <div className="flex justify-center gap-3">
              {[0, 0.15, 0.3].map((delay, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full bg-blue-500 animate-bounce"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen image ── */}
      {!isLoading && (
        <>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin inline-block mb-4">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
                </div>
                <p className="text-slate-400 text-sm">Memuat hasil foto...</p>
              </div>
            </div>
          )}
          <Image
            src={displayedPath!}
            alt="Photo Collage Result"
            fill
            sizes="100vw"
            priority
            unoptimized
            onLoad={() => setImageLoaded(true)}
            className={`object-contain transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}

      {/* ── Top-left: template + layout labels ── */}
      {!isLoading && imageLoaded && (
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {template && (
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
              <p className="text-white text-xs font-semibold">{template}</p>
            </div>
          )}
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
            <p className="text-white text-xs font-semibold">Layout {layout}</p>
          </div>
        </div>
      )}

      {/* ── Top-right: countdown ── */}
      {isCompleted && (
        <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
          <p className="text-sm text-slate-300">
            Reset dalam{' '}
            <span className={`font-bold ${countdown <= 30 ? 'text-red-400' : 'text-white'}`}>
              {countdown}s
            </span>
          </p>
        </div>
      )}

      {/* ── Bottom controls (floating) ── */}
      {isCompleted && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center gap-4 z-20">
          <Button
            onClick={onReset}
            size="lg"
            className="px-8 py-6 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm border border-slate-600 text-white text-lg font-bold rounded-2xl shadow-xl"
          >
            Mulai Lagi
          </Button>
          <Button
            onClick={hasDownloaded ? () => setShowQR(true) : handleDownload}
            size="lg"
            className="px-8 py-6 bg-blue-600/90 hover:bg-blue-700 backdrop-blur-sm text-white text-lg font-bold rounded-2xl shadow-xl"
          >
            {hasDownloaded ? '📱 Lihat QR' : '⬇ Download'}
          </Button>
        </div>
      )}

      {/* ── QR Modal ── */}
      {showQR && cleanUrl && (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-gray-900 text-xl font-bold mb-1">Scan untuk Download</h3>
            <p className="text-gray-500 text-sm mb-6">
              Scan QR ini dengan kamera HP untuk mendownload foto ke galeri
            </p>
            <div className="flex justify-center mb-5">
              <QRCodeDisplay url={cleanUrl} />
            </div>
            {/* <p className="text-gray-400 text-xs mb-6 break-all line-clamp-2">
              {cleanUrl.split('?')[0]}
            </p> */}
            {/* Countdown reminder inside modal */}
            {countdown > 0 && (
              <p className="text-gray-400 text-xs mb-4">
                Halaman akan reset dalam <span className={`font-bold ${countdown <= 30 ? 'text-red-500' : 'text-gray-700'}`}>{countdown}s</span>
              </p>
            )}
            <button
              onClick={() => setShowQR(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
