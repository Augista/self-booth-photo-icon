'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Template {
  id: string;
  name: string;
  previewUrl: string;
  photoCount: number;
}

interface CollegeScreenProps {
  onSelect: (designId: string, photoCount: number) => void;
}

export default function CollegeScreen({ onSelect }: CollegeScreenProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  const fetchTemplates = () => {
    setLoading(true);
    setError(null);
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTemplates(data.templates ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelect = (template: Template) => {
    setSelecting(template.id);
    onSelect(template.id, template.photoCount);
  };

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col">
      <div className="shrink-0 p-8 text-center border-b border-slate-800">
        <h1 className="text-4xl font-bold">Pilih Template</h1>
        <p className="text-slate-400 mt-2">Pilih desain frame fotomu</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Memuat template...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-red-400 text-lg">Gagal memuat template</p>
            <p className="text-slate-500 text-sm">{error}</p>
            <button
              onClick={fetchTemplates}
              className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-slate-400 text-lg">Tidak ada template tersedia</p>
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                disabled={selecting !== null}
                className="group text-left disabled:opacity-60 disabled:cursor-wait"
              >
                <div
                  className={`bg-slate-900 rounded-3xl overflow-hidden border transition-all duration-200 ${
                    selecting === template.id
                      ? 'border-blue-400 scale-95'
                      : 'border-slate-700 hover:border-blue-500 hover:scale-[1.02]'
                  }`}
                >
                  <div className="relative w-full aspect-3/5 bg-slate-800">
                    <Image
                      src={template.previewUrl}
                      alt={template.name}
                      fill
                      unoptimized
                      className="object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {template.photoCount} foto
                    </div>
                    {selecting === template.id && (
                      <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-bold text-base leading-tight">{template.name}</h2>
                    <p className="text-slate-500 text-xs mt-1">{template.photoCount} foto</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
