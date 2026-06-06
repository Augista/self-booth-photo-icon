'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ResultScreen from '@/components/screens/ResultScreen';

interface Session {
  id: string;
  status: string;
  layout: string | null;
  template: string | null;
  final_collage_url: string | null;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();

      if (data?.session) {
        setSession({
          id: data.session.id,
          status: data.session.status,
          layout: data.session.layout,
          template: data.session.template ?? null,
          final_collage_url: data.session.final_collage_url ?? null,
        });
      }
    } catch (err) {
      console.error('[ResultPage] fetch error:', err);
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

  const handleReset = async () => {
    try {
      await fetch(`/api/session/${sessionId}/reset`, { method: 'POST' });
    } catch (err) {
      console.error('[ResultPage] reset error:', err);
    }
    router.push('/');
  };

  if (loading || !session) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        Loading result...
      </div>
    );
  }

  return (
    <ResultScreen
      sessionId={session.id}
      photoPath={session.final_collage_url}
      status={session.status}
      layout={session.layout ?? undefined}
      template={session.template ?? undefined}
      onReset={handleReset}
    />
  );
}
