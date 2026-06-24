'use client';

import { useEffect, useState } from 'react';
import { fetchEvidenceBlobUrl } from '@/lib/api/evidence';

interface AuthenticatedEvidenceImageProps {
  imageUrl: string;
  alt: string;
  className?: string;
}

export function AuthenticatedEvidenceImage({
  imageUrl,
  alt,
  className,
}: AuthenticatedEvidenceImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void fetchEvidenceBlobUrl(imageUrl)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        setSrc(blobUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 text-xs text-slate-500 ${className ?? ''}`}
      >
        Cargando evidencia…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
