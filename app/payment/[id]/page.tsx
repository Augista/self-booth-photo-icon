'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PaymentScreen from '@/components/screens/PaymentScreen';

interface Session {
  id: string;
  status: string;
  qrisUrl: string | null;
  paymentVerified: boolean;
  final_collage_url?: string | null;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (!res.ok) throw new Error('Session tidak ditemukan');
      const data = await res.json();

      if (data?.session) {
        setSession({
          id: data.session.id,
          status: data.session.status,
          qrisUrl: data.session.qrisUrl,
          paymentVerified: data.session.paymentVerified,
          final_collage_url: data.session.final_collage_url,
        });
      }
    } catch (err) {
      console.error('[PaymentPage] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    fetchSession();
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const generateQRIS = async (amount: number) => {
    const res = await fetch('/api/payment/qris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed generate QRIS');
    return data;
  };

  const handlePaymentComplete = () => {
    router.push(`/college/${sessionId}`);
  };

  if (loading || !session) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <PaymentScreen
      session={session}
      onPaymentComplete={handlePaymentComplete}
      generateQRIS={generateQRIS}
    />
  );
}
