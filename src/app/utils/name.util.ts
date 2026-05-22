export function capName(s: string | null | undefined): string {
  return (s || '').trim().replace(/(?:^|\s+)\S/g, c => c.toUpperCase());
}
