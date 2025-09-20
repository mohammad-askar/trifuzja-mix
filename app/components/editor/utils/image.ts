export type CropArea = { x: number; y: number; width: number; height: number };

export async function getCroppedBlob(imageSrc: string, area: CropArea): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve((b as Blob) ?? new Blob()), 'image/jpeg', 0.92),
  );
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const json: { url?: string; error?: string } = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'upload failed');
  return json.url;
}
