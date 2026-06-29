export function buildCedulaLookupVariants(cedula: string): string[] {
  const trimmed = cedula.trim();
  const digits = trimmed.replace(/\D/g, '');
  const variants = new Set<string>([trimmed]);

  if (digits) {
    variants.add(digits);
    variants.add(`V-${digits}`);
    variants.add(`V${digits}`);
    variants.add(`E-${digits}`);
  }

  return [...variants];
}
