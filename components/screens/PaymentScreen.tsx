'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Session {
  id: string;
  status: string;
  qrisUrl: string | null;
  paymentVerified: boolean;
  final_collage_url?: string | null
}

interface PaymentScreenProps {
  session: Session;
  onPaymentComplete: () => void;
  generateQRIS: (amount: number) => Promise<any>;
}

const PRICE = 50000; // Rp 50.000

export default function PaymentScreen({
  session,
  onPaymentComplete,
  generateQRIS,
}: PaymentScreenProps) {
  const [loading, setLoading] = useState(false);
  const [localQr, setLocalQr] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const isCompleted = session.paymentVerified;
  const qrImage = session.qrisUrl || localQr;

  // ✅ Generate QRIS kalau belum ada di backend
useEffect(() => {
  if (!session.qrisUrl && !localQr && !loading) {
    handleGenerateQRIS();
  }
}, [session.qrisUrl, localQr, loading]);

  // ✅ Auto lanjut kalau payment sudah verified dari backend
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        onPaymentComplete();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isCompleted, onPaymentComplete]);

const handleGenerateQRIS = async () => {
  setLoading(true);

  try {
    const result = await generateQRIS(PRICE);

    if (!result || result.error) {
      throw new Error(result?.error || 'Failed generate QRIS');
    }

    if (result.qrisString) {
      setLocalQr(result.qrisString);
    }

    if (result.transactionId) {
      setTransactionId(result.transactionId);
    }

  } catch (error) {
    console.error('[PaymentScreen]', error);
  } finally {
    setLoading(false);
  }
};

const handleConfirmPayment = async () => {
  if (!transactionId) {
    console.error('Transaction ID belum ada');
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        transactionId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Verify failed');
    }

    // ❗ optional: langsung lanjut tanpa nunggu polling
    onPaymentComplete();

  } catch (error) {
    console.error('[PaymentScreen] Error verifying payment:', error);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-6 bg-linear-to-b from-slate-900 to-black">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Pembayaran
        </h2>
        <p className="text-sm text-slate-400">
          Scan QRIS dengan aplikasi e-wallet Anda
        </p>
      </div>

      {/* Price */}
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm">
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-2">Total Pembayaran</p>
          <p className="text-4xl font-bold text-white">
            Rp {PRICE.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* QR Code */}
      {!isCompleted && (
        <div className="bg-white p-4 rounded-lg">
          {qrImage ? (
            <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">📱 QR Code QRIS</p>
                <div className="w-48 h-48 bg-linear-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs text-center px-2">
                    {qrImage.substring(0, 50)}...
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-2" />
                <p className="text-sm text-slate-600">Generate QR...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {isCompleted && (
        <div className="text-center space-y-4">
          <div className="text-6xl">✅</div>
          <p className="text-2xl font-bold text-green-400">
            Pembayaran Berhasil!
          </p>
          <p className="text-slate-400">
            Mengarahkan ke kamera...
          </p>
        </div>
      )}

      {/* Button */}
      {!isCompleted && (
        <div className="flex gap-3 w-full max-w-sm">
          <Button
            onClick={handleConfirmPayment}
            disabled={loading}
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Memproses...' : 'Pembayaran Selesai'}
          </Button>
        </div>
      )}

      {/* Info */}
      {!isCompleted && (
        <div className="text-xs text-slate-500 text-center max-w-sm">
          <p>Scan QRIS lalu tekan tombol setelah bayar</p>
        </div>
      )}
    </div>
  );
}