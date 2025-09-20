'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import type { CropArea } from '../utils/image';
import { getCroppedBlob } from '../utils/image';
import { useIsMobile } from '../hooks/useIsMobile';
type CropPoint = { x: number; y: number };

type Props = {
  src: string;
  open: boolean;
  aspect?: number;                 // افتراضي 16/9
  onCancel: () => void;
  onInsertOriginal: () => void;
  onCropDone: (blob: Blob) => void;
};

type CropperProps = {
  image: string;
  crop: CropPoint;
  zoom: number;
  aspect?: number;
  cropSize?: { width: number; height: number }; // ← مهم لتصغير مساحة القص على الموبايل
  showGrid?: boolean;
  restrictPosition?: boolean;
  zoomWithScroll?: boolean;
  onCropChange: (p: CropPoint) => void;
  onZoomChange: (z: number) => void;
  onCropComplete: (_: CropArea, areaPixels: CropArea) => void;
};

// ⬇️ بدون any — نعيد الـ default كمكوّن مضبوط على CropperProps
const Cropper = dynamic(
  () => import('react-easy-crop').then((m) => m.default),
  { ssr: false },
) as unknown as React.ComponentType<CropperProps>;




export default function CropModal({ src, open, aspect = 16 / 9, onCancel, onInsertOriginal, onCropDone }: Props) {
  const isMobile = useIsMobile();
  const [crop, setCrop] = useState<CropPoint>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const cropSize = isMobile ? { width: 280, height: Math.round(280 / aspect) } : undefined;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-3">
      <div className="w-full max-w-3xl md:rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <div className={isMobile ? 'relative h-[50vh]' : 'relative h-[60vh]'}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropSize={cropSize}
            showGrid={!isMobile}
            restrictPosition
            zoomWithScroll
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setArea(areaPixels)}
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <label className="text-sm">Zoom</label>
            <input
              type="range" min={1} max={3} step={0.05}
              value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-2 md:justify-end">
            <button
              className="px-3 py-2 rounded border bg-white dark:bg-zinc-800"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="px-3 py-2 rounded border bg-white dark:bg-zinc-800"
              onClick={onInsertOriginal}
              disabled={busy}
            >
              Insert original
            </button>
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
              onClick={async () => {
                if (!area) return;
                setBusy(true);
                try {
                  const blob = await getCroppedBlob(src, area);
                  onCropDone(blob);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !area}
            >
              {busy ? 'Uploading…' : 'Crop & insert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
