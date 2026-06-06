import { Button } from '@/components/ui/button';

interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
}

export default function StartScreen({ onStart, loading }: StartScreenProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-8 bg-linear-to-b from-slate-900 to-black">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-white">
          Photobooth
        </h1>
        <p className="text-xl text-slate-400">
          Ambil foto, buat kenangan
        </p>
      </div>

      <div className="w-32 h-32 bg-slate-700 rounded-xl flex items-center justify-center">
        <div className="text-5xl">📸</div>
      </div>

      <Button
        onClick={onStart}
        disabled={loading}
        size="lg"
        className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? 'Memulai...' : 'Mulai Sekarang'}
      </Button>

      <div className="text-xs text-slate-500 mt-4">
        Versi 1.0 Optimized
      </div>
    </div>
  );
}
