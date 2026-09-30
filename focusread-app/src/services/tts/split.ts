// Parte el texto en segmentos que respetan el límite del motor, cortando en oraciones.
export function splitForSpeech(text: string, maxLength: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean ? [clean] : [];
  const segments: string[] = [];
  let current = '';
  for (const sentence of clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean]) {
    if ((current + sentence).length > maxLength && current) {
      segments.push(current.trim());
      current = '';
    }
    let rest = sentence;
    while (rest.length > maxLength) {
      segments.push(rest.slice(0, maxLength).trim());
      rest = rest.slice(maxLength);
    }
    current += rest;
  }
  if (current.trim()) segments.push(current.trim());
  return segments;
}
