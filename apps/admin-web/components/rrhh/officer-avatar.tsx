'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

interface OfficerAvatarProps {
  photoUrl: string | null;
  name: string;
  size?: 'sm' | 'md';
}

export function OfficerAvatar({ photoUrl, name, size = 'md' }: OfficerAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);
  const dim = size === 'sm' ? 'h-12 w-12' : 'h-16 w-16';

  useEffect(() => {
    if (!photoUrl) {
      setSrc(null);
      return;
    }

    const token = getAccessToken();
    let objectUrl: string | null = null;
    let cancelled = false;

    void fetch(`${API_BASE_URL}${photoUrl}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoUrl]);

  if (src) {
    return (
      <img
        src={src}
        alt={`Foto de ${name}`}
        className={`${dim} shrink-0 rounded-lg border border-slate-700 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold uppercase text-slate-400`}
    >
      {name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')}
    </div>
  );
}
