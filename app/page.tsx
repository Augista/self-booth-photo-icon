'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/useSession';
import { getTemplateConfig } from '@/lib/templateConfig';
import StartScreen from '@/components/screens/StartScreen';
import PaymentScreen from '@/components/screens/PaymentScreen';
import CollegeScreen from '@/components/screens/CollegeScreen';
import CameraScreen from '@/components/screens/CameraScreen';
import ResultScreen from '@/components/screens/ResultScreen';
import TemplatePreviewScreen from '@/components/screens/TemplatePreviewScreen';

export default function Home() {
  const {
    session,
    loading,
    error,
    createSession,
    startPolling,
    generateQRIS,
    updateSession,
    resetSession,
  } = useSession();

  const [currentScreen, setCurrentScreen] = useState<
    'start' | 'college' | 'payment' | 'camera' | 'result' | 'admin-preview'
  >('start');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [photoCount, setPhotoCount] = useState<number>(4);

  // Drive screen transitions from polled session status
  useEffect(() => {
    if (!session) {
      setCurrentScreen('start');
      return;
    }

    switch (session.status) {
      case 'waiting':
        setCurrentScreen('college');
        break;
      case 'payment_pending':
        if (currentScreen === 'college') setCurrentScreen('payment');
        break;
      case 'ready_capture':
        if (currentScreen === 'payment' || currentScreen === 'college') {
          setCurrentScreen('camera');
        }
        break;
      case 'processing':
      case 'completed':
        if (currentScreen !== 'result') setCurrentScreen('result');
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  const handleStart = async () => {
    const sessionId = await createSession();
    if (sessionId) startPolling(sessionId);
  };

  const handleCollegeSelect = async (designId: string, count: number) => {
    setSelectedTemplate(designId);
    setPhotoCount(count);

    const config = getTemplateConfig(designId);

    // Save template + derived layout to session; API also sets status → payment_pending
    await fetch('/api/session/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session?.id,
        template: designId,
        layout: config.layout,
      }),
    });

    updateSession({ layout: config.layout, status: 'payment_pending' });
    setCurrentScreen('payment');
  };

  const handlePaymentComplete = () => {
    updateSession({ paymentVerified: true, status: 'ready_capture' });
    setCurrentScreen('camera');
  };

  const handleFinishCamera = (photoUrl: string) => {
    updateSession({ status: 'completed', final_collage_url: photoUrl });
    setCurrentScreen('result');
  };

  const handleReset = async () => {
    await resetSession();
    setSelectedTemplate('');
    setPhotoCount(4);
    setCurrentScreen('start');
  };

  return (
    <main className="w-full h-screen bg-black flex items-center justify-center">
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-destructive text-destructive-foreground p-4 rounded z-50">
          {error}
        </div>
      )}

      {currentScreen === 'admin-preview' && (
        <TemplatePreviewScreen onClose={() => setCurrentScreen('start')} />
      )}

      {currentScreen === 'start' && (
        <StartScreen
          onStart={handleStart}
          loading={loading}
          onAdminPreview={() => setCurrentScreen('admin-preview')}
        />
      )}

      {currentScreen === 'college' && session && (
        <CollegeScreen onSelect={handleCollegeSelect} />
      )}

      {currentScreen === 'payment' && session && (
        <PaymentScreen
          session={session}
          onPaymentComplete={handlePaymentComplete}
          generateQRIS={generateQRIS}
        />
      )}

      {currentScreen === 'camera' && session && (
        <CameraScreen
          sessionId={session.id}
          layout={session.layout || '2x2'}
          template={selectedTemplate}
          photoCount={photoCount}
          triggerCount={session.cameraTriggerCount}
          status={session.status}
          onFinish={handleFinishCamera}
        />
      )}

      {currentScreen === 'result' && session && (
        <ResultScreen
          sessionId={session.id}
          photoPath={session.final_collage_url}
          status={session.status}
          layout={session.layout ?? undefined}
          template={selectedTemplate}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
