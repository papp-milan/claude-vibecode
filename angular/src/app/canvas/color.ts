/** Akzeptiert #rgb, #rrggbb (mit/ohne #) und liefert '#rrggbb' oder null. */
export function normalizeHex(input: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) {
    return null;
  }
  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex) ?? '#000000';
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Dunkle oder helle Schriftfarbe, je nach Hintergrundhelligkeit. */
export function contrastColor(background: string): string {
  const [r, g, b] = hexToRgb(background);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#212121' : '#fafafa';
}
