'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import CameraScreen from '@/components/screens/CameraScreen';

interface Session {
  id: string;
  layout: string;
  status: string;
  template: string | null;
  cameraTriggerCount: number;
}

function CameraPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = params?.id as string;
  const templateFromUrl = searchParams?.get('template') ?? null;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();

      if (data?.session) {
        setSession({
          id: data.session.id,
          layout: data.session.layout || '2x2',
          status: data.session.status,
          template: data.session.template ?? null,
          cameraTriggerCount: data.session.cameraTriggerCount || 0,
        });
      }
    } catch (err) {
      console.error('[CameraPage] fetch error:', err);
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

  const handleFinish = (photoUrl: string) => {
    sessionStorage.setItem(
      `result-${sessionId}`,
      JSON.stringify({ photoUrl })
    );
    router.push(`/result/${sessionId}`);
  };

  if (loading || !session) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white bg-black">
        Loading camera...
      </div>
    );
  }

  return (
    <CameraScreen
      sessionId={session.id}
      layout={session.layout}
      template={templateFromUrl ?? session.template ?? 'custom'}
      triggerCount={session.cameraTriggerCount}
      status={session.status}
      onFinish={handleFinish}
    />
  );
}

export default function CameraPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center text-white bg-black">
          Loading...
        </div>
      }
    >
      <CameraPageContent />
    </Suspense>
  );
}
