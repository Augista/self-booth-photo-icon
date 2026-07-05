'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CollegeScreen from '@/components/screens/CollegeScreen';

interface Session {
  id: string;
  status: string;
  layout: string | null;
}

export default function CollegePage() {
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
          layout: data.session.layout,
        });
      }
    } catch (err) {
      console.error('[CollegePage] fetch error:', err);
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

  // Guard: redirect if session goes back/forward out of expected state
  useEffect(() => {
    if (!session) return;
    if (session.status === 'payment_pending') router.push(`/payment/${session.id}`);
    if (session.status === 'completed') router.push(`/result/${session.id}`);
  }, [session, router]);

  const handleCollegeSelect = async (designId: string, photoCount: number) => {
    try {
      const { getTemplateConfig } = await import('@/lib/templateConfig');
      const config = getTemplateConfig(designId);

      await fetch('/api/session/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, template: designId, layout: config.layout }),
      });

      router.push(`/payment/${sessionId}`);
    } catch (err) {
      console.error('[CollegePage] select error:', err);
    }
  };

  if (loading || !session) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <CollegeScreen onSelect={handleCollegeSelect} />
  );
}
