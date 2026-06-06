'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface LayoutOption {
  id: string;
  label: string;
  grid: string;
  photos: number;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: '1x4', label: 'Vertikal (4 Foto)', grid: 'grid-cols-1 grid-rows-4', photos: 4 },
  { id: '2x2', label: '2x2 (4 Foto)', grid: 'grid-cols-2 grid-rows-2', photos: 4 },
  { id: '2x3', label: '2x3 (6 Foto)', grid: 'grid-cols-2 grid-rows-3', photos: 6 },
  { id: '3x3', label: '3x3 (9 Foto)', grid: 'grid-cols-3 grid-rows-3', photos: 9 },
];

interface LayoutSelectorProps {
  sessionId: string;
  onSelect?: (layout: string) => void;
}

export default function LayoutSelector({ sessionId, onSelect }: LayoutSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSelect = (layoutId: string) => {
    setSelected(layoutId);
  };

  const handleContinue = async () => {
    if (!selected || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: selected }),
      });

      if (!res.ok) {
        throw new Error('Gagal update layout');
      }

      if (onSelect) {
        onSelect(selected);
      } else {
        router.push(`/payment/${sessionId}`);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan layout, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-6 bg-linear-to-b from-slate-900 to-black">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Pilih Layout Foto
        </h2>
        <p className="text-sm text-slate-400">
          Berapa banyak foto yang ingin Anda ambil?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 p-4 ${
              selected === option.id
                ? 'border-blue-600 bg-blue-600/20'
                : 'border-slate-600 bg-slate-800 hover:border-slate-500'
            }`}
          >
            <div className={`w-full h-16 grid ${option.grid} gap-1 bg-slate-700/50 p-2 rounded`}>
              {Array.from({ length: option.photos }).map((_, i) => (
                <div key={i} className="bg-slate-600 rounded" />
              ))}
            </div>
            <span className="text-xs font-semibold text-white text-center">
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <Button
          onClick={handleContinue}
          disabled={loading}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
        >
          {loading ? 'Memproses...' : 'Lanjut ke Pembayaran'}
        </Button>
      )}
    </div>
  );
}