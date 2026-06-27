export function normalizeRegistryQuery(raw: string): {
  trimmed: string;
  digits: string;
  plate: string;
} {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  const plate = trimmed.replace(/[\s-]/g, '').toUpperCase();
  return { trimmed, digits, plate };
}

export function cedulaMatches(stored: string | null | undefined, digits: string): boolean {
  if (!stored || !digits || digits.length < 5) return false;
  const storedDigits = stored.replace(/\D/g, '');
  return storedDigits.includes(digits) || digits.includes(storedDigits);
}

export function plateMatches(stored: string | null | undefined, plate: string): boolean {
  if (!stored || !plate || plate.length < 3) return false;
  const storedNorm = stored.replace(/[\s-]/g, '').toUpperCase();
  return storedNorm.includes(plate) || plate.includes(storedNorm);
}
