'use client';

import { useEffect, useState } from 'react';
import { fetchDetaineePhotoBlobUrl } from '@/lib/api/detainee-photos';

interface AuthenticatedDetaineePhotoProps {
  publicUrl: string;
  alt: string;
  className?: string;
}

export function AuthenticatedDetaineePhoto({
  publicUrl,
  alt,
  className,
}: AuthenticatedDetaineePhotoProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void fetchDetaineePhotoBlobUrl(publicUrl)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        setSrc(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [publicUrl]);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 text-xs text-slate-500 ${className ?? ''}`}
      >
        Sin foto
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
